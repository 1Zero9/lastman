import { Resend } from "resend";

const FROM = "Last Man Standing <lastman@1zero9.com>";
const DEFAULT_ACCENT = "#0A6B2E";

let client: Resend | null = null;
function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function sendPickReminderEmail(params: {
  to: string;
  playerName: string;
  competitionName: string;
  clubName: string | null;
  clubLogoUrl: string | null;
  clubColor: string | null;
  gameweekName: string;
  deadlineLabel: string;
  entryNumber: number;
  appUrl: string;
  idempotencyKey: string;
}) {
  const resend = getClient();
  if (!resend) return { sent: false, reason: "RESEND_API_KEY is not configured" as const };

  const { to, playerName, competitionName, clubName, clubLogoUrl, clubColor, gameweekName, deadlineLabel, entryNumber, appUrl, idempotencyKey } = params;
  const accent = /^#[0-9a-fA-F]{6}$/.test(clubColor ?? "") ? clubColor! : DEFAULT_ACCENT;
  const displayName = clubName ?? competitionName;
  const subject = `Pick reminder: ${gameweekName} closes ${deadlineLabel}`;
  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff;">
      <div style="background: ${accent}; padding: 28px 24px; text-align: center; border-radius: 16px 16px 0 0;">
        ${clubLogoUrl ? `<img src="${clubLogoUrl}" alt="${escapeHtml(displayName)} logo" width="56" height="56" style="width: 56px; height: 56px; border-radius: 12px; background: #fff; object-fit: contain; padding: 4px; margin-bottom: 10px;" />` : ""}
        <p style="font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.8); margin: 0;">A reminder from</p>
        <p style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 4px 0 0;">${escapeHtml(displayName)}</p>
      </div>
      <div style="padding: 28px 24px; color: #141413; border: 1px solid #eee; border-top: none; border-radius: 0 0 16px 16px;">
        <h1 style="font-size: 18px; margin: 0 0 14px;">Hi ${escapeHtml(playerName)}, you haven't picked yet</h1>
        <p style="font-size: 14px; line-height: 22px; color: #444; margin: 0;">
          Entry #${entryNumber} in <strong>${escapeHtml(competitionName)}</strong> doesn't have a pick for <strong>${escapeHtml(gameweekName)}</strong> yet.
          Picks close <strong>${escapeHtml(deadlineLabel)}</strong> — miss it and you'll be auto-assigned whichever eligible team is most popular.
        </p>
        <a href="${appUrl}/my-entries" style="display: inline-block; margin-top: 20px; padding: 12px 22px; background: ${accent}; color: #fff; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 10px;">Make your pick</a>
        <p style="margin-top: 28px; font-size: 11px; color: #999;">Last Man Standing · unofficial fundraising tool · money is handled offline by your organiser</p>
      </div>
    </div>
  `.trim();

  const result = await resend.emails.send(
    { from: FROM, to, subject, html },
    { idempotencyKey },
  );
  if (result.error) return { sent: false, reason: result.error.message };
  return { sent: true, id: result.data?.id };
}

export async function sendPasswordResetEmail(params: { to: string; name: string; resetUrl: string }) {
  const resend = getClient();
  if (!resend) return { sent: false, reason: "RESEND_API_KEY is not configured" as const };

  const { to, name, resetUrl } = params;
  const html = `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff;">
      <div style="background: ${DEFAULT_ACCENT}; padding: 28px 24px; text-align: center; border-radius: 16px 16px 0 0;">
        <p style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0;">Last Man Standing</p>
      </div>
      <div style="padding: 28px 24px; color: #141413; border: 1px solid #eee; border-top: none; border-radius: 0 0 16px 16px;">
        <h1 style="font-size: 18px; margin: 0 0 14px;">Hi ${escapeHtml(name)}, reset your password</h1>
        <p style="font-size: 14px; line-height: 22px; color: #444; margin: 0;">
          Someone requested a password reset for this account. If that was you, choose a new password below —
          this link expires in 1 hour. If it wasn't you, you can ignore this email; your password stays unchanged.
        </p>
        <a href="${resetUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 22px; background: ${DEFAULT_ACCENT}; color: #fff; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 10px;">Choose a new password</a>
        <p style="margin-top: 28px; font-size: 11px; color: #999;">Last Man Standing · unofficial fundraising tool · money is handled offline by your organiser</p>
      </div>
    </div>
  `.trim();

  const result = await resend.emails.send({ from: FROM, to, subject: "Reset your Last Man Standing password", html });
  if (result.error) return { sent: false, reason: result.error.message };
  return { sent: true, id: result.data?.id };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
