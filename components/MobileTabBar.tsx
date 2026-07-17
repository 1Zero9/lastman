"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "@/components/NavIcon";
import { HeaderLogo } from "@/components/HeaderLogo";

export function MobileTabBar({
  isAuthenticated,
  isOrganiser = false,
  isPlatform = false,
}: {
  isAuthenticated: boolean;
  isOrganiser?: boolean;
  isPlatform?: boolean;
}) {
  void isOrganiser;
  void isPlatform;
  const pathname = usePathname();

  const tabs = isAuthenticated
    ? [
        { href: "/fixtures", label: "Fixtures", icon: "fixtures" as const, exact: true },
        { href: "/standings", label: "Standings", icon: "standings" as const, exact: true },
        { href: "/account", label: "Account", icon: "account" as const, exact: true },
      ]
    : [
        { href: "/fixtures", label: "Fixtures", icon: "fixtures" as const, exact: true },
        { href: "/standings", label: "Standings", icon: "standings" as const, exact: true },
        { href: "/rules", label: "Rules", icon: "rules" as const, exact: true },
      ];

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-border bg-surface/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(13,27,42,0.12)] backdrop-blur md:hidden"
    >
      {tabs.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-w-14 flex-col items-center gap-0.5 rounded-xl py-1 text-xs font-semibold ${
              active ? "text-primary" : "text-text-secondary"
            }`}
          >
            <NavIcon name={item.icon} className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
            {item.label}
          </Link>
        );
      })}
      <div className="order-first -mt-7 flex min-w-16 flex-col items-center text-xs font-semibold text-primary">
        <HeaderLogo href={isAuthenticated ? "/my-entries" : "/"} />
        <span className="mt-0.5">{isAuthenticated ? "My picks" : "Home"}</span>
      </div>
    </div>
  );
}
