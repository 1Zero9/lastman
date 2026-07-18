import bcrypt from "bcryptjs";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { POLICY_VERSION } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

async function confirmEntry(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const club = String(formData.get("club") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const agreed = formData.get("agree") === "on";
  const leaderboardConsent = formData.get("leaderboard") === "on";
  const futureConsent = formData.get("future") === "on";
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token || !name || !email) throw new Error("Your name and email address are required.");
  if (!agreed) throw new Error("You must accept the privacy policy and disclaimer to take part.");

  const participant = await prisma.participant.findFirst({
    where: { inviteToken: token, anonymisedAt: null },
    include: { competition: true },
  });
  if (!participant) notFound();

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!existingUser) {
    if (password.length < 12) throw new Error("Choose a password of at least 12 characters so you can sign in.");
    if (password !== confirmPassword) throw new Error("The passwords do not match.");
  }
  const passwordHash = existingUser ? null : await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const user = existingUser
      ? existingUser
      : await tx.user.create({ data: { email, displayName: name, passwordHash }, select: { id: true } });
    await tx.participant.update({
      where: { id: participant.id },
      data: { name, email, club, location, userId: participant.userId ?? user.id, confirmedAt: participant.confirmedAt ?? new Date() },
    });
    const consents: Array<{ purpose: "CORE_PII" | "LEADERBOARD_HISTORY" | "MARKETING" }> = [{ purpose: "CORE_PII" }];
    if (leaderboardConsent) consents.push({ purpose: "LEADERBOARD_HISTORY" });
    if (futureConsent) consents.push({ purpose: "MARKETING" });
    await tx.consentRecord.createMany({
      data: consents.map((consent) => ({ participantId: participant.id, purpose: consent.purpose, policyVersion: POLICY_VERSION })),
    });
    await tx.auditEvent.create({
      data: {
        competitionId: participant.competitionId,
        type: "participant.confirmed",
        entityType: "Participant",
        entityId: participant.id,
        payload: { policyVersion: POLICY_VERSION, leaderboardConsent, futureConsent },
      },
    });
  });

  revalidatePath("/standings");
  redirect(`/confirm/${token}?done=1`);
}

export default async function ConfirmPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  const participant = await prisma.participant.findFirst({
    where: { inviteToken: token, anonymisedAt: null },
    include: { competition: true, entries: { orderBy: { number: "asc" } } },
  });
  if (!participant) notFound();

  if (participant.confirmedAt || done) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-surface p-8 text-center shadow-sm ring-1 ring-border">
        <p className="text-4xl">✓</p>
        <h1 className="mt-4 text-2xl font-bold text-text">You&apos;re in, {participant.name}</h1>
        <p className="mt-3 text-text-secondary">Your entry in {participant.competition.name} is confirmed. Sign in with your email and password to make your picks each round.</p>
        <Link href="/sign-in" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-white">Go to sign in</Link>
      </div>
    );
  }

  const inputClass = "w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15";

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">{participant.competition.name}</p>
      <h1 className="mt-2 text-3xl font-bold text-text">Confirm your entry</h1>
      <p className="mt-3 text-text-secondary">
        Your organiser has added you with {participant.entries.length} {participant.entries.length === 1 ? "entry" : "entries"}. Check your details, read how we use your data, and confirm to take part.
      </p>

      <form action={confirmEntry} className="mt-8 space-y-5 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <input type="hidden" name="token" value={token} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-text">Full name</span>
          <input name="name" required defaultValue={participant.name} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-text">Email address</span>
          <input name="email" type="email" required defaultValue={participant.email ?? ""} className={inputClass} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Club (optional)</span>
            <input name="club" defaultValue={participant.club ?? ""} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Location (optional)</span>
            <input name="location" defaultValue={participant.location ?? ""} className={inputClass} />
          </label>
        </div>

        <div className="rounded-xl bg-background p-4">
          <p className="text-sm font-semibold text-text">Choose a password for your player account</p>
          <p className="mt-1 text-xs text-text-secondary">You&apos;ll sign in with your email and this password to make your picks. Already have an account with this email? Leave these blank.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-text">Password (12+ characters)</span>
              <input name="password" type="password" minLength={12} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-text">Confirm password</span>
              <input name="confirmPassword" type="password" minLength={12} className={inputClass} />
            </label>
          </div>
        </div>

        <div className="space-y-3 rounded-xl bg-background p-4">
          <label className="flex items-start gap-3">
            <input name="agree" type="checkbox" required className="mt-0.5 h-5 w-5 rounded border-border accent-primary" />
            <span className="text-sm text-text">
              I agree to my name, email and picks being stored and displayed in this competition, and I accept the{" "}
              <Link href="/privacy" className="font-semibold text-primary underline" target="_blank">privacy policy</Link> and{" "}
              <Link href="/disclaimer" className="font-semibold text-primary underline" target="_blank">disclaimer</Link>. <span className="font-semibold">(required)</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input name="leaderboard" type="checkbox" className="mt-0.5 h-5 w-5 rounded border-border accent-primary" />
            <span className="text-sm text-text">Keep my results after the competition ends for all-time leaderboards. (optional)</span>
          </label>
          <label className="flex items-start gap-3">
            <input name="future" type="checkbox" className="mt-0.5 h-5 w-5 rounded border-border accent-primary" />
            <span className="text-sm text-text">The organiser may contact me about future fundraisers and app updates. (optional)</span>
          </label>
        </div>

        <p className="text-xs text-text-secondary">You can withdraw consent or ask for your data to be removed at any time — see the privacy policy. Unused data is deleted 12 months after the season ends.</p>
        <button className="w-full rounded-xl bg-primary px-5 py-3.5 font-bold text-white transition hover:bg-primary/90">Confirm my entry</button>
      </form>
    </div>
  );
}
