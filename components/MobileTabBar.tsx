"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileTabBar({
  isAuthenticated,
  isOrganiser = false,
  isPlatform = false,
}: {
  isAuthenticated: boolean;
  isOrganiser?: boolean;
  isPlatform?: boolean;
}) {
  const pathname = usePathname();

  const tabs = isAuthenticated
    ? [
        { href: "/my-entries", label: "My picks", icon: "✦", exact: true },
        { href: "/fixtures", label: "Fixtures", icon: "◫", exact: true },
        { href: "/standings", label: "Standings", icon: "♜", exact: true },
        ...(isOrganiser ? [{ href: "/admin", label: "Admin", icon: "⚙", exact: false }] : []),
        ...(isPlatform ? [{ href: "/platform", label: "Platform", icon: "⌂", exact: true }] : []),
        { href: "/account", label: "Account", icon: "●", exact: true },
      ]
    : [
        { href: "/fixtures", label: "Fixtures", icon: "◫", exact: true },
        { href: "/standings", label: "Standings", icon: "♜", exact: true },
        { href: "/rules", label: "Rules", icon: "☰", exact: true },
        { href: "/sign-in", label: "Sign in", icon: "→", exact: true },
      ];

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-surface/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(13,27,42,0.12)] backdrop-blur md:hidden"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-xs font-semibold ${
              active ? "text-primary" : "text-text-secondary"
            }`}
          >
            <span className={`text-base ${active ? "text-accent" : ""}`}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
