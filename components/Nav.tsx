"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";

const links = [
  { href: "/", label: "Home" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/rules", label: "Rules" },
  { href: "/standings", label: "Standings" },
  { href: "/selections", label: "Selections" },
];

export function Nav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="border-t border-white/10 bg-white/5 px-4 py-2">
      <div className="mx-auto hidden max-w-6xl flex-wrap items-center gap-1 md:flex">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              pathname === href
                ? "bg-white text-primary shadow-sm"
                : "text-white/65 hover:bg-white/10 hover:text-white"
            }`}
          >
            {label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-1">
          {isAuthenticated ? (
            <>
              <Link
                href="/account"
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  pathname === "/account" ? "bg-white text-primary shadow-sm" : "text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                My account
              </Link>
              <Link href="/my-entries" className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${pathname === "/my-entries" ? "bg-white text-primary shadow-sm" : "text-white/65 hover:bg-white/10 hover:text-white"}`}>My entries</Link>
              <Link
                href="/admin"
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  pathname.startsWith("/admin") ? "bg-white text-primary shadow-sm" : "text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                Admin
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link href="/sign-in" className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-nav transition hover:bg-white">
              Sign in
            </Link>
          )}
        </div>
      </div>
      {isAuthenticated && <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-surface/95 px-2 py-2 shadow-[0_-8px_24px_rgba(13,27,42,0.12)] backdrop-blur md:hidden">
        {[
          { href: "/my-entries", label: "My picks", icon: "✦" },
          { href: "/fixtures", label: "Fixtures", icon: "◫" },
          { href: "/standings", label: "Standings", icon: "♜" },
          { href: "/account", label: "Account", icon: "●" },
        ].map((item) => <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-xs font-semibold ${pathname === item.href ? "text-primary" : "text-text-secondary"}`}><span className={`text-base ${pathname === item.href ? "text-accent" : ""}`}>{item.icon}</span>{item.label}</Link>)}
      </div>}
    </nav>
  );
}
