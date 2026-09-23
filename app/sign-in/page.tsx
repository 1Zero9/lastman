import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/SignInForm";
import { authOptions } from "@/lib/auth";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ registered?: string; exists?: string; reset?: string }> }) {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");
  const { registered, exists, reset } = await searchParams;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[radial-gradient(120%_70%_at_50%_-10%,#1c3a2e_0%,#0b1520_55%,#060a10_100%)] p-5 py-12 sm:p-9 sm:py-16">
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-warning/10 blur-3xl" />
      <section className="relative mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl shadow-black/40 backdrop-blur sm:p-9">
        <div className="mb-8 flex items-center gap-4">
          <Image src="/lms-logo.png" alt="Last Man Standing" width={64} height={64} priority className="rounded-full" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-white/60">Sign in to make your pick.</p>
          </div>
        </div>
        {registered && <p className="mb-5 rounded-xl bg-accent/15 p-3 text-center text-sm font-semibold text-accent">Account created — sign in to set up your fundraiser.</p>}
        {exists && <p className="mb-5 rounded-xl bg-white/10 p-3 text-center text-sm font-semibold text-white">You already have an account with that email — sign in below.</p>}
        {reset && <p className="mb-5 rounded-xl bg-accent/15 p-3 text-center text-sm font-semibold text-accent">Password updated — sign in with your new password.</p>}
        <SignInForm />
        <div className="mt-7 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-base font-bold text-white">Don&apos;t have an account?</p>
          <p className="text-sm leading-5 text-white/60">
            <span className="font-semibold text-white">Players:</span> use the confirm link your organiser sent you — it creates your logon.
          </p>
          <p className="text-sm leading-5 text-white/60">
            <span className="font-semibold text-white">Organisers:</span>{" "}
            <Link href="/get-started" className="font-semibold text-accent underline">get started and run a fundraiser</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
