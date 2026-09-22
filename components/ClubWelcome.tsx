"use client";

import { useState, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

export function ClubWelcome({
  competitionId,
  playerName,
  clubName,
  clubWebsite,
  clubColor,
  clubLogoUrl,
  welcomeMessage,
}: {
  competitionId: string;
  playerName: string;
  clubName: string;
  clubWebsite?: string | null;
  clubColor?: string | null;
  clubLogoUrl?: string | null;
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

  const accent = /^#[0-9a-fA-F]{6}$/.test(clubColor ?? "") ? clubColor! : "#3ad183";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(120%_70%_at_50%_-10%,#1c3a2e_0%,#0b1520_55%,#060a10_100%)] p-6 shadow-2xl">
        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-accent">A message from</p>

        <div className="relative mt-3 flex items-center gap-3 overflow-hidden rounded-2xl border bg-white/5 p-4" style={{ borderColor: `${accent}59` }}>
          <div className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
          {clubLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clubLogoUrl} alt={`${clubName} logo`} className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-1" />
          )}
          <p className="truncate text-lg font-extrabold text-white">{clubName}</p>
        </div>

        <div className="pt-6 text-center">
          <p className="text-lg font-bold text-white">Welcome, {playerName}!</p>
          <p className="mt-3 text-sm leading-6 text-white/60">
            {welcomeMessage ??
              `Thanks for joining our fundraiser — every entry goes straight to supporting ${clubName}. Good luck, and may you be the last one standing!`}
          </p>
          <p className="mt-3 text-xs font-semibold text-accent">
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
              className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5"
            >
              Let&apos;s play
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
