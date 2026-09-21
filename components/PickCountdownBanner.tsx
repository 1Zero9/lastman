"use client";

import { useSyncExternalStore } from "react";

function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
}

const pad = (value: number) => String(value).padStart(2, "0");

export function PickCountdownBanner({ deadline, deadlineLabel, href }: { deadline: string; deadlineLabel: string; href: string }) {
  const now = useSyncExternalStore<number | null>(
    subscribe,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );

  const diff = now === null ? null : new Date(deadline).getTime() - now;
  if (diff !== null && diff <= 0) return null;

  const totalSeconds = diff === null ? 0 : Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return (
    <a
      href={href}
      className="block rounded-2xl bg-gradient-to-br from-[#ff6b4a] to-[#e0393f] px-5 py-4 shadow-lg shadow-[#e0393f]/30 transition hover:brightness-105"
    >
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2" /><path d="M9 2h6" /></svg>
        <span className="text-xs font-extrabold uppercase tracking-wider text-white/90">Make your picks before {deadlineLabel}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-1 font-mono text-3xl font-extrabold tabular-nums text-white">
          {now === null ? (
            <span>--:--:--</span>
          ) : (
            <>
              {days > 0 && <><span>{pad(days)}</span><span className="mr-1.5 text-sm font-bold text-white/70">D</span></>}
              <span>{pad(hours)}</span><span className="mr-1.5 text-sm font-bold text-white/70">H</span>
              <span>{pad(minutes)}</span><span className="text-sm font-bold text-white/70">M</span>
            </>
          )}
        </div>
        <span className="whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-extrabold text-[#b3241f]">Pick now</span>
      </div>
    </a>
  );
}
