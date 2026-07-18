import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/my-entries");

  return (
    <div className="mx-auto max-w-lg overflow-hidden rounded-3xl bg-nav shadow-2xl shadow-nav/20">
      <section className="relative px-7 pb-10 pt-12 text-center text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(39,174,96,0.35),transparent_52%)]" />
        <div className="relative"><Image src="/lms-logo.png" alt="Last Man Standing" width={112} height={112} priority className="mx-auto rounded-3xl" /><p className="mt-7 text-xs font-bold uppercase tracking-[0.24em] text-accent">Fundraising competition</p><h1 className="mt-3 text-4xl font-extrabold leading-none">PLAY. SURVIVE.<br/><span className="text-secondary">STAND.</span></h1><p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-white/65">One team. One pick. Keep winning to be the last entry standing.</p><Link href="/sign-in" className="mt-8 inline-flex rounded-xl bg-accent px-6 py-3 font-bold text-nav shadow-lg shadow-accent/20">Sign in to play</Link><p className="mt-5 text-sm text-white/65">Organising a fundraiser? <Link href="/get-started" className="font-semibold text-accent underline">Get started</Link></p></div>
      </section>
      <section className="grid grid-cols-3 border-t border-white/10 bg-white px-4 py-6 text-center text-nav"><div><p className="text-2xl text-primary">●</p><p className="mt-2 text-xs font-bold">MAKE A PICK</p></div><div><p className="text-2xl text-accent">♜</p><p className="mt-2 text-xs font-bold">STAY ALIVE</p></div><div><p className="text-2xl text-secondary">⌁</p><p className="mt-2 text-xs font-bold">FUND THE CAUSE</p></div></section>
    </div>
  );
}
