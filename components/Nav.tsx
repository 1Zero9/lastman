"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { NavIcon } from "@/components/NavIcon";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/rules", label: "Rules" },
  { href: "/standings", label: "Standings" },
  { href: "/selections", label: "Selections" },
];

type NavigationLink = { href: string; label: string; nested?: boolean };

export function Nav({ isAuthenticated, isOrganiser = false, isPlatform = false }: { isAuthenticated: boolean; isOrganiser?: boolean; isPlatform?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links: NavigationLink[] = [
    ...publicLinks,
    ...(isAuthenticated ? [{ href: "/my-entries", label: "My entries" }, { href: "/account", label: "My account" }] : []),
    ...(isOrganiser ? [{ href: "/admin", label: "Admin", nested: true }] : []),
    ...(isPlatform ? [{ href: "/platform", label: "Platform" }] : []),
  ];
  const pill = (href: string, exact = true) => `rounded-full px-4 py-1.5 text-sm font-medium transition-all ${(exact ? pathname === href : pathname.startsWith(href)) ? "bg-white text-primary shadow-sm" : "text-white/65 hover:bg-white/10 hover:text-white"}`;

  return <>
    <nav className="hidden border-t border-white/10 bg-white/5 px-4 py-2 md:block" aria-label="Primary navigation">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1">
        {publicLinks.map(({ href, label }) => <Link key={href} href={href} className={pill(href)}>{label}</Link>)}
        <div className="ml-auto flex items-center gap-1">
          {isAuthenticated ? <>
            <Link href="/my-entries" className={pill("/my-entries")}>My entries</Link>
            <Link href="/account" className={pill("/account")}>My account</Link>
            {isOrganiser && <Link href="/admin" className={pill("/admin", false)}>Admin</Link>}
            {isPlatform && <Link href="/platform" className={pill("/platform")}>Platform</Link>}
            <SignOutButton />
          </> : <Link href="/sign-in" className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-nav transition hover:bg-white">Sign in</Link>}
        </div>
      </div>
    </nav>
    <div className="absolute right-4 top-5 md:hidden">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close navigation" : "Open navigation"} className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <NavIcon name={open ? "close" : "menu"} className="h-5 w-5" />
      </button>
      {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="absolute right-0 mt-3 w-60 overflow-hidden rounded-2xl border border-white/10 bg-nav p-2 shadow-2xl shadow-black/30">
        <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Navigate</div>
        {links.map(({ href, label, nested }) => {
          const active = nested ? pathname.startsWith(href) : pathname === href;
          return <Link key={href} href={href} onClick={() => setOpen(false)} className={`block rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-accent text-nav" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>{label}</Link>;
        })}
        {isAuthenticated ? <div className="mt-1 border-t border-white/10 px-2 pt-2"><SignOutButton /></div> : <Link href="/sign-in" onClick={() => setOpen(false)} className="mt-1 block rounded-xl bg-accent px-3 py-2.5 text-sm font-bold text-nav">Sign in</Link>}
      </nav>}
    </div>
  </>;
}
