import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/SignInForm";
import { authOptions } from "@/lib/auth";

export default async function SignInPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");

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
        <SignInForm />
        <p className="mt-6 text-center text-sm text-text-secondary">
          Don&apos;t have an account? Ask your competition organiser for an invite.
        </p>
      </section>
    </main>
  );
}
