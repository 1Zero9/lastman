import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const [membership, user] = await Promise.all([
      prisma.competitionMember.findFirst({ where: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] }, competition: { status: { not: "ARCHIVED" } } }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { organiserApprovedAt: true } }),
    ]);
    if (membership) redirect("/admin");
    if (user?.organiserApprovedAt) redirect("/admin/setup");
    redirect("/my-entries");
  }

  return (
    <div className="relative mx-auto max-w-lg overflow-hidden rounded-3xl bg-[radial-gradient(120%_70%_at_50%_-10%,#1c3a2e_0%,#0b1520_55%,#060a10_100%)] p-5 py-12 text-center text-white sm:p-9 sm:py-16">
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-warning/10 blur-3xl" />
      <div className="relative">
        <Image src="/lms-logo.png" alt="Last Man Standing" width={96} height={96} priority className="mx-auto rounded-full shadow-lg shadow-black/40" />
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.24em] text-accent">Fundraising competition</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-none">PLAY. SURVIVE.<br/><span className="text-secondary">STAND.</span></h1>
        <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-white/65">One team. One pick. Keep winning to be the last entry standing.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/sign-in" className="inline-flex rounded-xl bg-accent px-6 py-3 font-bold text-nav shadow-lg shadow-accent/20">Sign in to play</Link>
          <Link href="/demo" className="inline-flex rounded-xl border border-white/25 px-6 py-3 font-bold text-white hover:bg-white/10">View the demo</Link>
        </div>
        <p className="mt-5 text-sm text-white/65">Organising a fundraiser? <Link href="/get-started" className="font-semibold text-accent underline">Get started</Link></p>
        <div className="mt-10 grid grid-cols-3 gap-3 border-t border-white/10 pt-8 text-center">
          <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-4"><p className="text-2xl text-primary">●</p><p className="mt-2 text-xs font-bold text-white/80">MAKE A PICK</p></div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-4"><p className="text-2xl text-accent">♜</p><p className="mt-2 text-xs font-bold text-white/80">STAY ALIVE</p></div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-4"><p className="text-2xl text-secondary">⌁</p><p className="mt-2 text-xs font-bold text-white/80">FUND THE CAUSE</p></div>
        </div>
      </div>
    </div>
  );
}
