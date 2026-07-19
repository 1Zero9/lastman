"use client";

import { useSyncExternalStore } from "react";

function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
}

export function Countdown({ deadline }: { deadline: string }) {
  const now = useSyncExternalStore<number | null>(
    subscribe,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );

  if (now === null) {
    return <span className="font-mono text-sm font-bold text-text-secondary">--:--:--</span>;
  }

  const diff = new Date(deadline).getTime() - now;
  if (diff <= 0) {
    return <span className="rounded-lg bg-error/10 px-2.5 py-1 text-sm font-bold text-error">Deadline passed</span>;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const urgent = diff < 3600_000;
  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    <span className={`font-mono text-sm font-bold tabular-nums ${urgent ? "animate-pulse text-error" : "text-text"}`}>
      {days > 0 ? `${days}d ` : ""}{pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}
