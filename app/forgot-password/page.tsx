import crypto from "node:crypto";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sendPasswordResetEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

async function requestReset(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/forgot-password");

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, displayName: true } });
  if (user) {
    const token = crypto.randomUUID();
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });
    const host = (await headers()).get("host") ?? "lastman.1zero9.com";
    const resetUrl = `https://${host}/reset-password/${token}`;
    await sendPasswordResetEmail({ to: user.email, name: user.displayName ?? "there", resetUrl });
  }

  // Same outcome whether or not the account exists — don't reveal which emails are registered.
  redirect("/forgot-password?sent=1");
}

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;

  return (
    <div className="relative mx-auto max-w-lg overflow-hidden rounded-3xl bg-[radial-gradient(120%_70%_at_50%_-10%,#1c3a2e_0%,#0b1520_55%,#060a10_100%)] p-5 py-12 sm:p-9 sm:py-16">
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-warning/10 blur-3xl" />
      <section className="relative mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl shadow-black/40 backdrop-blur sm:p-9">
        <h1 className="text-2xl font-bold tracking-tight text-white">Reset your password</h1>
        {sent ? (
          <>
            <p className="mt-3 text-sm text-white/60">
              If that email has an account, we&apos;ve sent a link to reset your password. It expires in 1 hour — check your spam
              folder if it doesn&apos;t show up in a minute or two.
            </p>
            <Link href="/sign-in" className="mt-7 inline-flex rounded-full bg-accent px-6 py-3 font-bold text-nav shadow-lg shadow-accent/20">Back to sign in</Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-white/60">Enter your email and we&apos;ll send you a link to choose a new password.</p>
            <form action={requestReset} className="mt-7 space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-accent/80">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                />
              </div>
              <button type="submit" className="w-full rounded-full bg-accent px-4 py-3 font-bold text-nav shadow-[0_10px_24px_-8px_rgba(163,230,53,0.6)] transition hover:brightness-105">
                Send reset link
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-white/50">
              <Link href="/sign-in" className="font-semibold text-accent underline">Back to sign in</Link>
            </p>
          </>
        )}
      </section>
    </div>
  );
}
