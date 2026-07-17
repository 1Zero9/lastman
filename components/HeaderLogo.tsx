import Image from "next/image";
import Link from "next/link";

export function HeaderLogo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} aria-label="Last Man Standing home" className="group shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-nav">
      <Image src="/lms-logo.png" alt="" width={64} height={64} priority className="h-14 w-14 rounded-full bg-white object-contain p-0.5 shadow-sm transition-transform duration-200 group-hover:scale-105" />
    </Link>
  );
}
