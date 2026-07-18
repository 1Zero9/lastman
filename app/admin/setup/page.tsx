import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CompetitionStatus, SeasonStatus } from "@prisma/client";
import { ACTIVE_COMPETITION_COOKIE, hasOrganiserAccess, moneyToCents, organiserCodeValid, requireSignedInUser } from "@/lib/admin";
import { detectClubColor } from "@/lib/club-theme";
import { defaultRules, injectLeagueSchedule, makeJoinCode, makeSlug } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

function fail(message: string): never {
  redirect(`/admin/setup?error=${encodeURIComponent(message)}`);
}

async function createCompetition(formData: FormData) {
  "use server";

  const user = await requireSignedInUser();
  if (!(await hasOrganiserAccess(user.id))) fail("Your account does not have organiser access yet.");
  const name = String(formData.get("name") ?? "").trim();
  const seasonName = String(formData.get("seasonName") ?? "").trim();
  const currency = String(formData.get("currency") ?? "EUR").toUpperCase();
  const prizePercentage = Number(formData.get("prizePercentage"));
  const leagueId = String(formData.get("leagueId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const buyBackEnabled = formData.get("buyBack") === "on";
  const clubName = String(formData.get("clubName") ?? "").trim() || null;
  const clubWebsiteRaw = String(formData.get("clubWebsite") ?? "").trim();
  const clubWebsite = clubWebsiteRaw ? (clubWebsiteRaw.startsWith("http") ? clubWebsiteRaw : `https://${clubWebsiteRaw}`) : null;
  const clubColorRaw = String(formData.get("clubColor") ?? "").trim();
  let clubColor = /^#[0-9a-fA-F]{6}$/.test(clubColorRaw) ? clubColorRaw : null;
  if (clubWebsite && formData.get("autoTheme") === "on") {
    clubColor = (await detectClubColor(clubWebsite)) ?? clubColor;
  }
  const welcomeMessage = String(formData.get("welcomeMessage") ?? "").trim() || null;
  const duplicateFrom = String(formData.get("duplicateFrom") ?? "") || null;

  if (!name || !seasonName || !/^[A-Z]{3}$/.test(currency) || !Number.isInteger(prizePercentage) || prizePercentage < 0 || prizePercentage > 100) {
    fail("Enter a competition name, season name, valid currency and prize allocation.");
  }
  if (!leagueId || !startDate || !endDate) fail("Choose a league and a run window.");
  const from = new Date(`${startDate}T00:00:00.000Z`);
  const to = new Date(`${endDate}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) fail("Enter a valid date range.");
  const todayStart = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  if (from < todayStart) fail("The run window cannot start in the past.");

  if (duplicateFrom) {
    const ownerMembership = await prisma.competitionMember.findFirst({ where: { userId: user.id, competitionId: duplicateFrom, role: "OWNER" } });
    if (!ownerMembership) fail("Only the owner can duplicate this fundraiser.");
  }

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) fail("That league could not be found.");
  const baseSlug = makeSlug(name);
  const suffix = crypto.randomUUID().slice(0, 8);
  const slug = `${baseSlug}-${suffix}`;
  const seasonSlug = `${makeSlug(seasonName)}-${suffix}`;
  const entryFeeCents = moneyToCents(formData.get("entryFee"), 1000);
  const rules = { ...defaultRules, buyBack: { ...defaultRules.buyBack, enabled: buyBackEnabled } };
  const joinCode = makeJoinCode();

  let createdCompetitionId: string | null = null;
  try {
    await prisma.$transaction(
    async (tx) => {
      const competition = await tx.competition.create({
        data: {
          name,
          slug,
          joinCode,
          currency,
          timezone: "Europe/Dublin",
          entryFeeCents,
          clubName,
          clubWebsite,
          clubColor,
          welcomeMessage,
          prizePercentage,
          fundraisingPercentage: 100 - prizePercentage,
          status: CompetitionStatus.ACTIVE,
        },
      });

      await tx.competitionMember.create({
        data: { competitionId: competition.id, userId: user.id, role: "OWNER" },
      });

      const season = await tx.season.create({
        data: {
          competitionId: competition.id,
          leagueId: league.id,
          name: seasonName,
          slug: seasonSlug,
          rules,
          startsAt: from,
          endsAt: to,
          status: SeasonStatus.OPEN,
        },
      });

      const schedule = await injectLeagueSchedule(tx, season.id, league.id, from, to);

      createdCompetitionId = competition.id;

      await tx.auditEvent.create({
        data: {
          competitionId: competition.id,
          actorId: user.id,
          type: "competition.created",
          entityType: "Competition",
          entityId: competition.id,
          payload: { name, seasonName, league: league.name, duplicateFrom, ...schedule },
        },
      });
    },
    { timeout: 60000 },
    );
  } catch (error) {
    fail(error instanceof Error ? error.message : "Something went wrong creating the competition. Please try again.");
  }

  if (createdCompetitionId) {
    (await cookies()).set(ACTIVE_COMPETITION_COOKIE, createdCompetitionId, { path: "/", httpOnly: true, sameSite: "lax" });
  }
  revalidatePath("/admin");
  redirect("/admin");
}

async function unlockOrganiserAccess(formData: FormData) {
  "use server";

  const user = await requireSignedInUser();
  const accessCode = String(formData.get("accessCode") ?? "").trim();
  if (!organiserCodeValid(accessCode)) fail("That organiser access code is not valid. Contact us to get set up as an organiser.");
  await prisma.user.update({ where: { id: user.id }, data: { organiserApprovedAt: new Date() } });
  revalidatePath("/admin/setup");
}

function Req() {
  return <span aria-hidden className="ml-1 text-error">*</span>;
}

export default async function CompetitionSetupPage({ searchParams }: { searchParams: Promise<{ error?: string; duplicate?: string; new?: string }> }) {
  const { error, duplicate, new: isNew } = await searchParams;
  const user = await requireSignedInUser();
  const duplicateMembership = duplicate
    ? await prisma.competitionMember.findFirst({
        where: { userId: user.id, competitionId: duplicate, role: "OWNER" },
        include: { competition: true },
      })
    : null;
  const duplicating = Boolean(duplicateMembership);
  if (!duplicating && !isNew && !error) {
    const membership = await prisma.competitionMember.findFirst({
      where: { userId: user.id, role: { in: ["OWNER", "ADMIN"] } },
      select: { id: true },
    });
    if (membership) redirect("/admin");
  }
  if (!(await hasOrganiserAccess(user.id))) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl bg-surface p-8 shadow-sm ring-1 ring-border">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin setup</p>
        <h1 className="mt-2 text-2xl font-bold text-text">Organiser access required</h1>
        <p className="mt-3 text-text-secondary">Running a fundraiser is invite-only to prevent abuse. Enter your organiser access code to unlock setup, or contact the platform team to get one.</p>
        {error && <p className="mt-4 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm font-semibold text-error">{error}</p>}
        <form action={unlockOrganiserAccess} className="mt-6 flex flex-wrap gap-3">
          <input name="accessCode" required autoComplete="off" placeholder="Organiser access code" className="flex-1 rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          <button className="rounded-xl bg-primary px-5 py-3 font-semibold text-white">Unlock</button>
        </form>
      </div>
    );
  }
  const [leagues, fixtureRanges] = await Promise.all([
    prisma.league.findMany({ orderBy: [{ sport: "asc" }, { name: "asc" }] }),
    prisma.sourceFixture.groupBy({ by: ["leagueId"], _min: { kickoffAt: true }, _max: { kickoffAt: true } }),
  ]);
  const rangeByLeague = new Map(fixtureRanges.map((range) => [range.leagueId, range]));
  const formatDate = (date: Date | null | undefined) => (date ? new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", year: "numeric" }).format(date) : null);
  const today = new Date().toISOString().slice(0, 10);

  const src = duplicateMembership?.competition ?? null;
  const srcSeason = src ? await prisma.season.findFirst({ where: { competitionId: src.id }, orderBy: { createdAt: "desc" } }) : null;
  const srcBuyBack = Boolean((srcSeason?.rules as { buyBack?: { enabled?: boolean } } | null)?.buyBack?.enabled);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin setup</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-text">{duplicating ? "Duplicate your fundraiser" : "Create your fundraiser"}</h1>
      <p className="mt-3 text-text-secondary">Choose a league and a run window. Every round and fixture inside that window is added automatically — you only record results and payments.</p>
      {duplicating && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text">
          Settings copied from <span className="font-semibold">{src!.name}</span>. Pick a fresh run window — the original fundraiser is left untouched and stays in your list.
        </div>
      )}

      <form action={createCompetition} className="mt-8 space-y-6 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <p className="text-sm text-text-secondary">Fields marked <span className="font-semibold text-error">*</span> must be completed.</p>
        {error && <div className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm font-semibold text-error">{error}</div>}
        {leagues.length === 0 && (
          <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text">
            <span className="font-semibold">No leagues are available yet.</span> A league must be loaded before you can create a competition — ask the platform team to add one (e.g. run the league seed script).
          </div>
        )}
        {duplicating && <input type="hidden" name="duplicateFrom" value={src!.id} />}
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">Competition name<Req /></span>
            <input name="name" required defaultValue={src?.name} placeholder="Club Last Man Standing" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">Season / campaign name<Req /></span>
            <input name="seasonName" required placeholder="Spring 2027 fundraiser" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">Source league<Req /></span>
            <select name="leagueId" required defaultValue={srcSeason?.leagueId ?? ""} className="w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15">
              <option value="">Choose a league</option>
              {leagues.map((league) => {
                const range = rangeByLeague.get(league.id);
                const window = range?._min.kickoffAt && range?._max.kickoffAt ? ` — fixtures ${formatDate(range._min.kickoffAt)} to ${formatDate(range._max.kickoffAt)}` : " — no fixtures loaded";
                return (
                  <option key={league.id} value={league.id}>{league.name}{league.seasonLabel ? ` ${league.seasonLabel}` : ""}{window}</option>
                );
              })}
            </select>
            <span className="mt-1.5 block text-sm text-text-secondary">The league cannot be changed once the campaign starts. Your run window below must overlap the league&apos;s fixture dates.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Run from<Req /></span>
            <input name="startDate" type="date" required min={today} className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Run to<Req /></span>
            <input name="endDate" type="date" required min={today} className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Entry fee<Req /></span>
            <input name="entryFee" type="number" min="0" step="0.01" defaultValue={src ? (src.entryFeeCents / 100).toFixed(2) : "10.00"} required className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Currency<Req /></span>
            <input name="currency" defaultValue={src?.currency ?? "EUR"} maxLength={3} required className="w-full rounded-xl border border-border px-4 py-3 uppercase outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">Prize fund allocation (%)<Req /></span>
            <input name="prizePercentage" type="number" min="0" max="100" defaultValue={src?.prizePercentage ?? 25} required className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
            <span className="mt-1.5 block text-sm text-text-secondary">The remaining percentage goes to the club or cause.</span>
          </label>
          <label className="flex items-center gap-3 sm:col-span-2">
            <input name="buyBack" type="checkbox" defaultChecked={srcBuyBack} className="h-5 w-5 rounded border-border accent-primary" />
            <span className="text-sm font-semibold text-text">Allow one buy-back per entry after elimination (extra fundraising)</span>
          </label>
          <div className="sm:col-span-2 border-t border-border pt-5">
            <p className="text-sm font-bold text-text">Club branding (optional)</p>
            <p className="mt-1 text-sm text-text-secondary">Approved players get a themed welcome from your club.</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Club name</span>
            <input name="clubName" defaultValue={src?.clubName ?? undefined} placeholder="River Valley Rangers" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Club website</span>
            <input name="clubWebsite" type="text" defaultValue={src?.clubWebsite ?? undefined} placeholder="www.yourclub.ie" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Club colour</span>
            <input name="clubColor" type="color" defaultValue={src?.clubColor ?? "#27AE60"} className="h-[50px] w-full rounded-xl border border-border px-2 py-1" />
          </label>
          <label className="flex items-center gap-3 sm:col-span-2">
            <input name="autoTheme" type="checkbox" defaultChecked={!src?.clubColor} className="h-5 w-5 rounded border-border accent-primary" />
            <span className="text-sm text-text"><span className="font-semibold">Pick the colour from the club website automatically.</span> We read the site&apos;s theme colour; the colour above is used if nothing is found.</span>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">Welcome message</span>
            <textarea name="welcomeMessage" rows={2} defaultValue={src?.welcomeMessage ?? undefined} placeholder="Thanks for backing the club — best of luck!" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
        </div>
        <button disabled={leagues.length === 0} className="rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{duplicating ? "Create duplicate fundraiser" : "Create competition & inject fixtures"}</button>
      </form>
    </div>
  );
}
