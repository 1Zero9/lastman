"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/rules", label: "Rules" },
  { href: "/standings", label: "Standings" },
  { href: "/selections", label: "Selections" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-t border-white/10 bg-black/20 px-4 py-2">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-1">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              pathname === href
                ? "bg-white text-rvr-maroon shadow-sm"
                : "text-white/65 hover:bg-white/10 hover:text-white"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
