"use client";

import { useState, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function ClubWelcome({
  competitionId,
  playerName,
  clubName,
  clubWebsite,
  clubColor,
  welcomeMessage,
}: {
  competitionId: string;
  playerName: string;
  clubName: string;
  clubWebsite?: string | null;
  clubColor?: string | null;
  welcomeMessage?: string | null;
}) {
  const storageKey = `club-welcome-${competitionId}`;
  const [closed, setClosed] = useState(false);
  const alreadySeen = useSyncExternalStore(
    emptySubscribe,
    () => Boolean(window.localStorage.getItem(storageKey)),
    () => true,
  );

  const dismiss = () => {
    window.localStorage.setItem(storageKey, new Date().toISOString());
    setClosed(true);
  };

  if (alreadySeen || closed) return null;

  const accent = clubColor ?? "#27AE60";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-nav/70 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="px-7 pb-6 pt-8 text-center text-white" style={{ backgroundColor: accent }}>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">A message from</p>
          <p className="mt-2 text-2xl font-extrabold leading-tight">{clubName}</p>
        </div>
        <div className="px-7 py-6 text-center">
          <p className="text-lg font-bold text-text">Welcome, {playerName}!</p>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            {welcomeMessage ??
              `Thanks for joining our fundraiser — every entry goes straight to supporting ${clubName}. Good luck, and may you be the last one standing!`}
          </p>
          <p className="mt-3 text-xs font-semibold" style={{ color: accent }}>
            You&apos;re confirmed and approved — you&apos;re in the game.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            {clubWebsite && (
              <a
                href={clubWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg"
                style={{ backgroundColor: accent }}
              >
                Visit {clubName}
              </a>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-text hover:bg-background"
            >
              Let&apos;s play
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
