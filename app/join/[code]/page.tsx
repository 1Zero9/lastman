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
  const clubColor = /^#[0-9a-fA-F]{6}$/.test(competition.clubColor ?? "") ? competition.clubColor! : "#3ad183";

  if (done) {
    const doneCount = Math.min(Math.max(Number(done) || 1, 1), 5);
    const due = formatMoney(competition.entryFeeCents * doneCount, competition.currency);
    return (
      <div className="mx-auto max-w-xl rounded-3xl bg-[radial-gradient(120%_60%_at_50%_-10%,#1c3a2e_0%,#0b1520_55%,#060a10_100%)] p-8 text-center">
        <p className="text-4xl">✓</p>
        <h1 className="mt-4 text-2xl font-bold text-white">You&apos;re nearly in</h1>
        <p className="mt-3 text-white/60">
          Your {doneCount === 1 ? "entry is" : `${doneCount} entries are`} reserved in {competition.name}. Now pay{" "}
          <span className="font-bold text-white">{due}</span> to your organiser — cash or transfer, with your name as the
          reference. Your {doneCount === 1 ? "entry goes" : "entries go"} live once the organiser confirms the payment.
        </p>
        <Link href="/sign-in" className="mt-6 inline-flex rounded-full bg-accent px-5 py-3 font-bold text-nav">Sign in to see your entries</Link>
      </div>
    );
  }

  const inputClass = "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-accent focus:ring-4 focus:ring-accent/15";
  const fee = formatMoney(competition.entryFeeCents, competition.currency);

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl bg-[radial-gradient(120%_60%_at_50%_-10%,#1c3a2e_0%,#0b1520_55%,#060a10_100%)] p-6 sm:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Last Man Standing</p>

        {(competition.clubName || competition.clubLogoUrl) && (
          <div className="relative mt-3 flex items-center gap-3 overflow-hidden rounded-2xl border bg-white/5 p-4" style={{ borderColor: `${clubColor}59` }}>
            <div className="absolute inset-y-0 left-0 w-1" style={{ background: clubColor }} />
            {competition.clubLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={competition.clubLogoUrl} alt={`${competition.clubName ?? competition.name} logo`} className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-1" />
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">Fundraising for</p>
              <p className="truncate text-base font-bold text-white">{competition.clubName ?? competition.name}</p>
            </div>
          </div>
        )}

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">Join {competition.name}</h1>
        <p className="mt-3 text-white/60">
          {season.name} · {fee} per entry · pick one team each round and be the last one standing.
        </p>
        {competition.description && <p className="mt-3 text-white/60">{competition.description}</p>}
        {competition.clubWebsite && (
          <a href={competition.clubWebsite} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-semibold text-accent underline">
            Visit {competition.clubName ?? "the club"} website
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-4">
        {[
          { n: 1, t: "Pick one team", d: "Every round, before the deadline." },
          { n: 2, t: "Win to survive", d: "A draw or a loss and you're out." },
          { n: 3, t: "No repeats", d: "Once a team's used, it's gone for the season." },
          { n: 4, t: "Last one wins", d: "Takes the pot — the rest funds the club." },
        ].map((step) => (
          <div key={step.n}>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-nav">{step.n}</span>
            <p className="mt-2 text-sm font-bold text-white">{step.t}</p>
            <p className="mt-0.5 text-xs leading-5 text-white/50">{step.d}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/50">Want the full rules? See the <Link href="/guide" className="font-semibold text-accent underline">guide</Link>.</p>

      <form action={joinCompetition} className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
        <input type="hidden" name="code" value={code} />
        {error && <div className="rounded-xl border border-error/40 bg-error/15 px-4 py-3 text-sm font-semibold text-red-300">{error}</div>}
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-white">Full name</span>
          <input name="name" required className={inputClass} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-white">Email address</span>
            <input name="email" type="email" required className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-white">Number of entries</span>
            <select name="entryCount" defaultValue="1" className={`${inputClass} [color-scheme:dark]`}>
              {[1, 2, 3, 4, 5].map((count) => (
                <option key={count} value={count}>{count} — {formatMoney(competition.entryFeeCents * count, competition.currency)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-white">Choose a password for your player account</p>
          <p className="mt-1 text-xs text-white/50">You&apos;ll sign in with your email and this password to make your picks. Already have an account with this email? Leave these blank.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-white">Password (12+ characters)</span>
              <input name="password" type="password" minLength={12} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-white">Confirm password</span>
              <input name="confirmPassword" type="password" minLength={12} className={inputClass} />
            </label>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <label className="flex items-start gap-3">
            <input name="agree" type="checkbox" required className="mt-0.5 h-5 w-5 rounded border-white/20 bg-white/10 accent-accent" />
            <span className="text-sm text-white/70">
              I agree to my name, email and picks being stored and displayed in this competition, and I accept the{" "}
              <Link href="/privacy" className="font-semibold text-accent underline" target="_blank">privacy policy</Link> and{" "}
              <Link href="/disclaimer" className="font-semibold text-accent underline" target="_blank">disclaimer</Link>. <span className="font-semibold text-white">(required)</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input name="leaderboard" type="checkbox" className="mt-0.5 h-5 w-5 rounded border-white/20 bg-white/10 accent-accent" />
            <span className="text-sm text-white/70">Keep my results after the competition ends for all-time leaderboards. (optional)</span>
          </label>
          <label className="flex items-start gap-3">
            <input name="future" type="checkbox" className="mt-0.5 h-5 w-5 rounded border-white/20 bg-white/10 accent-accent" />
            <span className="text-sm text-white/70">The organiser may contact me about future fundraisers and app updates. (optional)</span>
          </label>
        </div>

        <p className="text-xs text-white/50">
          No money passes through the app — you pay your organiser directly and they confirm your entry. You can withdraw
          consent or ask for your data to be removed at any time — see the privacy policy.
        </p>
        <button className="w-full rounded-full bg-accent px-5 py-3.5 font-bold text-nav shadow-[0_10px_24px_-8px_rgba(163,230,53,0.6)] transition hover:brightness-105">Join the competition</button>
      </form>
    </div>
  );
}
