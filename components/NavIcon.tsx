import type { ReactNode } from "react";

type IconName = "home" | "fixtures" | "standings" | "rules" | "picks" | "account" | "admin" | "platform" | "menu" | "close";

const paths: Record<IconName, ReactNode> = {
  home: <path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-6H9v6H3.5a.5.5 0 0 1-.5-.5v-9.7Z" />,
  fixtures: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 9h18M8 13h3M8 17h3M14 13h2M14 17h2" /></>,
  standings: <><path d="M7 21h10M9 21v-6h6v6M6 3h12v5a6 6 0 0 1-12 0V3ZM6 5H3v2a4 4 0 0 0 4 4M18 5h3v2a4 4 0 0 1-4 4" /><path d="M12 9V3" /></>,
  rules: <><path d="M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 0-3 3V3Z" /><path d="M8 8h7M8 12h7M8 16h5" /></>,
  picks: <><path d="M20 7 12 3 4 7l8 4 8-4ZM4 12l8 4 8-4M4 17l8 4 8-4" /></>,
  account: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  admin: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H5v-3h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3.5h3v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v3h-.2a1.7 1.7 0 0 0-1.6 1Z" /></>,
  platform: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
};

export function NavIcon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{paths[name]}</svg>;
}
