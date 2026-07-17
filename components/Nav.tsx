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

  return (
    <nav className="hidden border-t border-white/10 bg-white/5 px-4 py-2 md:block">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1">
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
    </nav>
  );
}
