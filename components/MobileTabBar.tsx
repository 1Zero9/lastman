"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "@/components/NavIcon";

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
        { href: "/my-entries", label: "My picks", icon: "account" as const, exact: true },
        { href: "/fixtures", label: "Fixtures", icon: "fixtures" as const, exact: true },
        { href: "/standings", label: "Standings", icon: "standings" as const, exact: true },
        { href: "/account", label: "More", icon: "menu" as const, exact: true },
      ]
    : [
        { href: "/", label: "Home", icon: "account" as const, exact: true },
        { href: "/demo", label: "Demo", icon: "fixtures" as const, exact: true },
        { href: "/sign-in", label: "Sign in", icon: "account" as const, exact: true },
        { href: "/rules", label: "Rules", icon: "rules" as const, exact: true },
      ];

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <nav aria-label="Primary navigation" className="pointer-events-auto relative mx-auto grid min-h-16 max-w-md grid-cols-4 rounded-[1.4rem] border border-white/10 bg-[#0a1a12]/90 px-2 py-2 shadow-[0_18px_48px_rgba(0,0,0,0.45),0_4px_12px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        {tabs.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-xs font-bold transition ${
                active ? "bg-accent/15 text-accent" : "text-white/50 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              <NavIcon name={item.icon} className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
