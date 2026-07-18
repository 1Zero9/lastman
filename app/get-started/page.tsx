import bcrypt from "bcryptjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { organiserCodeValid } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function registerOrganiser(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  const accessCode = String(formData.get("accessCode") ?? "").trim();

  if (!name || !email) throw new Error("Enter your name and email address.");
  if (password.length < 12) throw new Error("Your password must be at least 12 characters long.");
  if (password !== confirm) throw new Error("The passwords do not match.");
  if (!organiserCodeValid(accessCode)) throw new Error("That organiser access code is not valid. Contact us to get set up as an organiser.");

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) redirect("/sign-in?exists=1");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, displayName: name, passwordHash, organiserApprovedAt: new Date() } });
  redirect("/sign-in?registered=1");
}

const steps = [
  {
    title: "Create your organiser account",
    body: "Register below with your email, a password and your organiser access code. This account runs the competition — it is separate from playing.",
  },
  {
    title: "Set up the fundraiser",
    body: "Pick a source league, choose your run window (for example January to March), the entry fee, the prize split, buy-backs, and your club branding. Every round and fixture in the window is added automatically.",
  },
  {
    title: "Collect money offline, add your players",
    body: "Entry fees are paid to you directly — cash, transfer, whatever works. Add each paid player in the admin area, confirm their payment, and share their personal confirm link by WhatsApp or text.",
  },
  {
    title: "Players confirm and pick",
    body: "Each player confirms their details, consents, sets a password, and then signs in to make one pick each round. You approve them with a tick and they get a themed welcome from your club.",
  },
  {
    title: "Run the rounds",
    body: "Lock the round at the deadline, enter results, and settle — eliminations are automatic. Void a round if fixtures are postponed, or record a buy-back for extra fundraising. The pot summary shows what was raised, the winner's prize and the club's share.",
  },
];

export default async function GetStartedPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/admin");

  const inputClass =
    "w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">For organisers</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text">Run a fundraiser for your club</h1>
        <p className="mt-3 text-text-secondary">
          Last Man Standing is a quick, snap fundraiser: everyone pays in, picks one team a round, and the last
          entry standing wins a share of the pot — the rest goes to your club. No money passes through the app.
        </p>
      </div>

      <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <h2 className="text-lg font-bold text-text">How it works</h2>
        <ol className="mt-4 space-y-4">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <p className="font-semibold text-text">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-text-secondary">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-xs text-text-secondary">
          Playing rather than organising? You don&apos;t register here — your organiser sends you a personal confirm
          link. See the <Link href="/rules" className="font-semibold text-primary underline">rules</Link>,{" "}
          <Link href="/privacy" className="font-semibold text-primary underline">privacy policy</Link> and{" "}
          <Link href="/disclaimer" className="font-semibold text-primary underline">disclaimer</Link>.
        </p>
      </section>

      <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <h2 className="text-lg font-bold text-text">Create your organiser account</h2>
        <form action={registerOrganiser} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Your name</span>
            <input name="name" required className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Email address</span>
            <input name="email" type="email" required className={inputClass} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-text">Password (12+ characters)</span>
              <input name="password" type="password" minLength={12} required className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-text">Confirm password</span>
              <input name="confirmPassword" type="password" minLength={12} required className={inputClass} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Organiser access code</span>
            <input name="accessCode" required autoComplete="off" className={inputClass} />
            <span className="mt-1.5 block text-sm text-text-secondary">Organiser accounts are invite-only to prevent abuse. Contact the platform team for a code.</span>
          </label>
          <button className="w-full rounded-xl bg-primary px-5 py-3.5 font-bold text-white transition hover:bg-primary/90">
            Create account & set up your fundraiser
          </button>
          <p className="text-center text-sm text-text-secondary">
            Already have an account? <Link href="/sign-in" className="font-semibold text-primary underline">Sign in</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
