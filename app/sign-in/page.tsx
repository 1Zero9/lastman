import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/SignInForm";
import { authOptions } from "@/lib/auth";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ registered?: string; exists?: string }> }) {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");
  const { registered, exists } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-5">
      <section className="w-full max-w-md rounded-3xl bg-surface p-7 shadow-xl shadow-nav/10 ring-1 ring-border/70 sm:p-9">
        <div className="mb-8 flex items-center gap-4">
          <Image src="/lms-logo.png" alt="Last Man Standing" width={64} height={64} priority className="rounded-full" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">Welcome back</h1>
            <p className="mt-1 text-sm text-text-secondary">Sign in to manage your entries.</p>
          </div>
        </div>
        {registered && <p className="mb-5 rounded-xl bg-success/10 p-3 text-center text-sm font-semibold text-success">Account created — sign in to set up your fundraiser.</p>}
        {exists && <p className="mb-5 rounded-xl bg-info/10 p-3 text-center text-sm font-semibold text-info">You already have an account with that email — sign in below.</p>}
        <SignInForm />
        <div className="mt-7 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
          <p className="text-base font-bold text-text">Don&apos;t have an account?</p>
          <p className="text-sm leading-5 text-text-secondary">
            <span className="font-semibold text-text">Players:</span> use the confirm link your organiser sent you — it creates your logon.
          </p>
          <p className="text-sm leading-5 text-text-secondary">
            <span className="font-semibold text-text">Organisers:</span>{" "}
            <Link href="/get-started" className="font-semibold text-primary underline">get started and run a fundraiser</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}
