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
    <nav className="flex flex-wrap gap-1 border-t border-rvr-silver/20 bg-rvr-maroon-dark px-4 py-2">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            pathname === href
              ? "bg-rvr-silver text-rvr-maroon-dark"
              : "text-rvr-silver hover:bg-rvr-silver/15 hover:text-white"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
