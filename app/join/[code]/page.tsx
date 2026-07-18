import bcrypt from "bcryptjs";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { POLICY_VERSION } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

const formatMoney = (cents: number, currency: string) => new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);

async function findCompetitionByCode(code: string) {
  return prisma.competition.findFirst({
    where: { joinCode: code.toUpperCase(), status: "ACTIVE" },
    include: { seasons: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
}

async function joinCompetition(formData: FormData) {
  "use server";

  const code = String(formData.get("code") ?? "").toUpperCase();
  const fail = (message: string): never => redirect(`/join/${code}?error=${encodeURIComponent(message)}`);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const entryCount = Math.min(Math.max(Number(formData.get("entryCount") ?? 1) || 1, 1), 5);
  const agreed = formData.get("agree") === "on";
  const leaderboardConsent = formData.get("leaderboard") === "on";
  const futureConsent = formData.get("future") === "on";
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name || !email) fail("Enter your name and email address.");
  if (!agreed) fail("You must accept the privacy policy and disclaimer to take part.");

  const competition = await findCompetitionByCode(code);
  if (!competition || !competition.seasons.length) notFound();
  const season = competition.seasons[0];

  const existingParticipant = await prisma.participant.findFirst({
    where: { competitionId: competition.id, email, anonymisedAt: null },
    select: { id: true },
  });
  if (existingParticipant) fail("That email address has already joined this competition. Sign in to see your entries.");

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!existingUser) {
    if (password.length < 12) fail("Choose a password of at least 12 characters so you can sign in.");
    if (password !== confirmPassword) fail("The passwords do not match.");
  }
  const passwordHash = existingUser ? null : await bcrypt.hash(password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const user = existingUser ?? (await tx.user.create({ data: { email, displayName: name, passwordHash }, select: { id: true } }));
      const participant = await tx.participant.create({
        data: { competitionId: competition.id, userId: user.id, name, email, confirmedAt: new Date() },
      });
      const consents: Array<{ purpose: "CORE_PII" | "LEADERBOARD_HISTORY" | "MARKETING" }> = [{ purpose: "CORE_PII" }];
      if (leaderboardConsent) consents.push({ purpose: "LEADERBOARD_HISTORY" });
      if (futureConsent) consents.push({ purpose: "MARKETING" });
      await tx.consentRecord.createMany({
        data: consents.map((consent) => ({ participantId: participant.id, purpose: consent.purpose, policyVersion: POLICY_VERSION })),
      });
      await tx.entry.createMany({
        data: Array.from({ length: entryCount }, (_, index) => ({
          seasonId: season.id,
          participantId: participant.id,
          number: index + 1,
          status: "PENDING_PAYMENT" as const,
        })),
      });
      await tx.payment.create({
        data: {
          seasonId: season.id,
          participantId: participant.id,
          amountCents: competition.entryFeeCents * entryCount,
          entryCount,
          status: "PENDING",
          reference: name,
          notes: "Self-service join",
        },
      });
      await tx.auditEvent.create({
        data: {
          competitionId: competition.id,
          type: "participant.joined",
          entityType: "Participant",
          entityId: participant.id,
          payload: { policyVersion: POLICY_VERSION, entryCount, joinCode: code },
        },
      });
    });
  } catch {
    fail("Something went wrong joining the competition. Please try again.");
  }

  redirect(`/join/${code}?done=${entryCount}`);
}

export default async function JoinPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string; done?: string }> }) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const { error, done } = await searchParams;
  const competition = await findCompetitionByCode(code);
  if (!competition || !competition.seasons.length) notFound();
  const season = competition.seasons[0];

  if (done) {
    const doneCount = Math.min(Math.max(Number(done) || 1, 1), 5);
    const due = formatMoney(competition.entryFeeCents * doneCount, competition.currency);
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-surface p-8 text-center shadow-sm ring-1 ring-border">
        <p className="text-4xl">✓</p>
        <h1 className="mt-4 text-2xl font-bold text-text">You&apos;re nearly in</h1>
        <p className="mt-3 text-text-secondary">
          Your {doneCount === 1 ? "entry is" : `${doneCount} entries are`} reserved in {competition.name}. Now pay{" "}
          <span className="font-bold text-text">{due}</span> to your organiser — cash or transfer, with your name as the
          reference. Your {doneCount === 1 ? "entry goes" : "entries go"} live once the organiser confirms the payment.
        </p>
        <Link href="/sign-in" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-white">Sign in to see your entries</Link>
      </div>
    );
  }

  const inputClass = "w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15";
  const fee = formatMoney(competition.entryFeeCents, competition.currency);

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">{competition.clubName ?? "Last Man Standing"}</p>
      <h1 className="mt-2 text-3xl font-bold text-text">Join {competition.name}</h1>
      <p className="mt-3 text-text-secondary">
        {season.name} · {fee} per entry · pick one team each round and be the last one standing.
        {competition.welcomeMessage ? ` ${competition.welcomeMessage}` : ""}
      </p>

      <form action={joinCompetition} className="mt-8 space-y-5 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <input type="hidden" name="code" value={code} />
        {error && <div className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm font-semibold text-error">{error}</div>}
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-text">Full name</span>
          <input name="name" required className={inputClass} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Email address</span>
            <input name="email" type="email" required className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Number of entries</span>
            <select name="entryCount" defaultValue="1" className={`${inputClass} bg-white`}>
              {[1, 2, 3, 4, 5].map((count) => (
                <option key={count} value={count}>{count} — {formatMoney(competition.entryFeeCents * count, competition.currency)}</option>
              ))}
            </select>
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

        <p className="text-xs text-text-secondary">
          No money passes through the app — you pay your organiser directly and they confirm your entry. You can withdraw
          consent or ask for your data to be removed at any time — see the privacy policy.
        </p>
        <button className="w-full rounded-xl bg-primary px-5 py-3.5 font-bold text-white transition hover:bg-primary/90">Join the competition</button>
      </form>
    </div>
  );
}
