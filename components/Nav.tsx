"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/rules", label: "Rules" },
  { href: "/standings", label: "Standings" },
  { href: "/selections", label: "Selections" },
];

export function Nav({
  isAuthenticated,
  isOrganiser = false,
  isPlatform = false,
}: {
  isAuthenticated: boolean;
  isOrganiser?: boolean;
  isPlatform?: boolean;
}) {
  const pathname = usePathname();

  const pill = (href: string, exact = true) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
      (exact ? pathname === href : pathname.startsWith(href))
        ? "bg-white text-primary shadow-sm"
        : "text-white/65 hover:bg-white/10 hover:text-white"
    }`;

  const bottomTabs = [
    { href: "/my-entries", label: "My picks", icon: "✦", exact: true },
    { href: "/fixtures", label: "Fixtures", icon: "◫", exact: true },
    { href: "/standings", label: "Standings", icon: "♜", exact: true },
    ...(isOrganiser ? [{ href: "/admin", label: "Admin", icon: "⚙", exact: false }] : []),
    ...(isPlatform ? [{ href: "/platform", label: "Platform", icon: "⌂", exact: true }] : []),
    { href: "/account", label: "Account", icon: "●", exact: true },
  ];

  return (
    <nav className="border-t border-white/10 bg-white/5 px-4 py-2">
      <div className="mx-auto hidden max-w-6xl flex-wrap items-center gap-1 md:flex">
        {publicLinks.map(({ href, label }) => (
          <Link key={href} href={href} className={pill(href)}>
            {label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-1">
          {isAuthenticated ? (
            <>
              <Link href="/my-entries" className={pill("/my-entries")}>My entries</Link>
              <Link href="/account" className={pill("/account")}>My account</Link>
              {isOrganiser && (
                <Link href="/admin" className={pill("/admin", false)}>Admin</Link>
              )}
              {isPlatform && (
                <Link href="/platform" className={pill("/platform")}>Platform</Link>
              )}
              <SignOutButton />
            </>
          ) : (
            <Link href="/sign-in" className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-nav transition hover:bg-white">
              Sign in
            </Link>
          )}
        </div>
      </div>
      {isAuthenticated && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-surface/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(13,27,42,0.12)] backdrop-blur md:hidden"
          style={{ gridTemplateColumns: `repeat(${bottomTabs.length}, minmax(0, 1fr))` }}
        >
          {bottomTabs.map((item) => {
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
      )}
      {!isAuthenticated && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-surface/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(13,27,42,0.12)] backdrop-blur md:hidden"
        >
          {[
            { href: "/fixtures", label: "Fixtures", icon: "◫" },
            { href: "/standings", label: "Standings", icon: "♜" },
            { href: "/rules", label: "Rules", icon: "☰" },
            { href: "/sign-in", label: "Sign in", icon: "→" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-xs font-semibold ${
                pathname === item.href ? "text-primary" : "text-text-secondary"
              }`}
            >
              <span className={`text-base ${pathname === item.href ? "text-accent" : ""}`}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
