import bcrypt from "bcryptjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function fail(token: string, message: string): never {
  redirect(`/reset-password/${token}?error=${encodeURIComponent(message)}`);
}

async function resetPassword(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: token, passwordResetExpiresAt: { gt: new Date() } },
    select: { id: true },
  });
  if (!user) fail(token, "This reset link is invalid or has expired.");
  if (password.length < 12) fail(token, "Your password must be at least 12 characters long.");
  if (password !== confirmPassword) fail(token, "The passwords do not match.");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetToken: null, passwordResetExpiresAt: null },
  });

  redirect("/sign-in?reset=1");
}

export default async function ResetPasswordPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;

  const user = await prisma.user.findFirst({
    where: { passwordResetToken: token, passwordResetExpiresAt: { gt: new Date() } },
    select: { id: true },
  });

  const inputClass = "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15";

  return (
    <div className="relative mx-auto max-w-lg overflow-hidden rounded-3xl bg-[radial-gradient(120%_70%_at_50%_-10%,#1c3a2e_0%,#0b1520_55%,#060a10_100%)] p-5 py-12 sm:p-9 sm:py-16">
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-warning/10 blur-3xl" />
      <section className="relative mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl shadow-black/40 backdrop-blur sm:p-9">
        {!user ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-white">Link invalid or expired</h1>
            <p className="mt-3 text-sm text-white/60">This password reset link no longer works. Reset links expire after 1 hour and can only be used once.</p>
            <Link href="/forgot-password" className="mt-7 inline-flex rounded-full bg-accent px-6 py-3 font-bold text-nav shadow-lg shadow-accent/20">Request a new link</Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-white">Choose a new password</h1>
            {error && <p className="mt-4 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm font-semibold text-red-300">{error}</p>}
            <form action={resetPassword} className="mt-7 space-y-5">
              <input type="hidden" name="token" value={token} />
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-accent/80">New password (12+ characters)</label>
                <input id="password" name="password" type="password" minLength={12} autoComplete="new-password" required className={inputClass} />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-accent/80">Confirm new password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" minLength={12} autoComplete="new-password" required className={inputClass} />
              </div>
              <button type="submit" className="w-full rounded-full bg-accent px-4 py-3 font-bold text-nav shadow-[0_10px_24px_-8px_rgba(163,230,53,0.6)] transition hover:brightness-105">
                Set new password
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
