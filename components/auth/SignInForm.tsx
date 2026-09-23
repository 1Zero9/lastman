"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export function SignInForm() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl: "/",
    });

    if (!result?.ok) {
      setError("We couldn’t sign you in with those details.");
      setIsSubmitting(false);
      return;
    }

    window.location.assign(result.url ?? "/");
  }

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-accent/80">
          Email address
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-accent/80">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
        <Link href="/forgot-password" className="mt-1.5 inline-block text-xs font-semibold text-white/50 underline hover:text-white/75">Forgot your password?</Link>
      </div>
      {error && <p role="alert" className="rounded-lg bg-error/15 px-3 py-2 text-sm font-medium text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-accent px-4 py-3 font-bold text-nav shadow-[0_10px_24px_-8px_rgba(163,230,53,0.6)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
