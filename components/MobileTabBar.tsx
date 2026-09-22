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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <nav aria-label="Quick navigation" className="pointer-events-auto relative mx-auto flex min-h-20 max-w-md items-end justify-around rounded-[1.7rem] border border-white/10 bg-[#0a1a12]/80 px-3 pb-2.5 pt-3 shadow-[0_18px_48px_rgba(0,0,0,0.45),0_4px_12px_rgba(0,0,0,0.25)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        {tabs.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-16 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-xs font-bold transition ${
                active ? "bg-accent/15 text-accent" : "text-white/50 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              <NavIcon name={item.icon} className={`h-5 w-5 ${active ? "text-accent" : ""}`} />
              {item.label}
            </Link>
          );
        })}
        <div className="order-first -mt-12 flex min-w-20 flex-col items-center text-xs font-bold text-warning">
          <div className="origin-bottom rounded-full bg-gradient-to-br from-warning to-[#ffb020] p-1.5 shadow-[0_10px_24px_rgba(255,180,32,0.4)] ring-4 ring-[#0a1a12]/60 transition duration-200 ease-out active:scale-125 active:shadow-[0_14px_30px_rgba(255,180,32,0.6)]">
            <HeaderLogo href={isAuthenticated ? "/my-entries" : "/"} />
          </div>
          <span className="mt-1">{isAuthenticated ? "My picks" : "Home"}</span>
        </div>
      </nav>
    </div>
  );
}
