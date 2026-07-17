const FETCH_TIMEOUT_MS = 6000;
const MAX_BYTES = 400_000;

async function fetchText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,text/css,application/json;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const text = await response.text();
    return text.slice(0, MAX_BYTES);
  } catch {
    return null;
  }
}

function normalizeHex(raw: string): string | null {
  const value = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();
  if (/^#[0-9a-fA-F]{8}$/.test(value)) return value.slice(0, 7).toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [r, g, b] = value.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function buildClubTheme(clubColor: string): Record<string, string> | null {
  const hex = normalizeHex(clubColor);
  if (!hex) return null;
  const { h, s, l } = hexToHsl(hex);
  return {
    "--primary": hslToHex(h, clamp(s, 0.35, 1), clamp(l, 0.24, 0.42)),
    "--secondary": hslToHex(h, clamp(s, 0.3, 0.9), clamp(l + 0.18, 0.4, 0.6)),
    "--accent": hslToHex(h, clamp(s + 0.15, 0.45, 1), clamp(l + 0.4, 0.6, 0.72)),
    "--nav": hslToHex(h, clamp(s, 0.25, 0.85), 0.13),
  };
}

function isBrandCandidate(hex: string): boolean {
  const { s, l } = hexToHsl(hex);
  return s >= 0.3 && l >= 0.12 && l <= 0.65;
}

function dominantBrandColor(cssText: string): string | null {
  const counts = new Map<string, number>();
  for (const match of cssText.matchAll(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    const hex = normalizeHex(match[0]);
    if (!hex || !isBrandCandidate(hex)) continue;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [hex, count] of counts) {
    if (count > bestCount) {
      best = hex;
      bestCount = count;
    }
  }
  return best;
}

function isFetchableHost(hostname: string): boolean {
  if (!hostname.includes(".")) return false;
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  if (hostname.includes(":")) return false;
  return true;
}

export async function detectClubColor(website: string): Promise<string | null> {
  let base: URL;
  try {
    base = new URL(website);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(base.protocol) || !isFetchableHost(base.hostname)) return null;

  const html = await fetchText(base.toString());
  if (!html) return null;

  const themeMeta =
    html.match(/<meta[^>]+name=["']theme-color["'][^>]*content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']theme-color["']/i);
  if (themeMeta) {
    const hex = normalizeHex(themeMeta[1]);
    if (hex && isBrandCandidate(hex)) return hex;
  }

  const manifestHref = html.match(/<link[^>]+rel=["']manifest["'][^>]*href=["']([^"']+)["']/i)?.[1];
  if (manifestHref) {
    try {
      const manifestText = await fetchText(new URL(manifestHref, base).toString());
      if (manifestText) {
        const themeColor = (JSON.parse(manifestText) as { theme_color?: string }).theme_color;
        const hex = themeColor ? normalizeHex(themeColor) : null;
        if (hex && isBrandCandidate(hex)) return hex;
      }
    } catch {
      // ignore malformed manifests
    }
  }

  const stylesheetHrefs = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .slice(0, 4);
  let cssText = html;
  for (const href of stylesheetHrefs) {
    try {
      const sheet = await fetchText(new URL(href, base).toString());
      if (sheet) cssText += `\n${sheet}`;
    } catch {
      // skip unreachable stylesheets
    }
  }

  return dominantBrandColor(cssText);
}
