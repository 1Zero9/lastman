import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CompetitionStatus, SeasonStatus } from "@prisma/client";
import { getAdminContext, moneyToCents, requireSignedInUser } from "@/lib/admin";
import { defaultRules, injectLeagueSchedule, makeSlug } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

async function createCompetition(formData: FormData) {
  "use server";

  const user = await requireSignedInUser();
  const name = String(formData.get("name") ?? "").trim();
  const seasonName = String(formData.get("seasonName") ?? "").trim();
  const currency = String(formData.get("currency") ?? "EUR").toUpperCase();
  const prizePercentage = Number(formData.get("prizePercentage"));
  const leagueId = String(formData.get("leagueId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const buyBackEnabled = formData.get("buyBack") === "on";

  if (!name || !seasonName || !/^[A-Z]{3}$/.test(currency) || !Number.isInteger(prizePercentage) || prizePercentage < 0 || prizePercentage > 100) {
    throw new Error("Enter a competition name, season name, valid currency and prize allocation.");
  }
  if (!leagueId || !startDate || !endDate) throw new Error("Choose a league and a run window.");
  const from = new Date(`${startDate}T00:00:00.000Z`);
  const to = new Date(`${endDate}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) throw new Error("Enter a valid date range.");

  const existingMembership = await prisma.competitionMember.findFirst({ where: { userId: user.id } });
  if (existingMembership) redirect("/admin");

  const league = await prisma.league.findUniqueOrThrow({ where: { id: leagueId } });
  const baseSlug = makeSlug(name);
  const suffix = crypto.randomUUID().slice(0, 8);
  const slug = `${baseSlug}-${suffix}`;
  const seasonSlug = `${makeSlug(seasonName)}-${suffix}`;
  const entryFeeCents = moneyToCents(formData.get("entryFee"), 1000);
  const rules = { ...defaultRules, buyBack: { ...defaultRules.buyBack, enabled: buyBackEnabled } };

  await prisma.$transaction(
    async (tx) => {
      const competition = await tx.competition.create({
        data: {
          name,
          slug,
          currency,
          timezone: "Europe/Dublin",
          entryFeeCents,
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

      await tx.auditEvent.create({
        data: {
          competitionId: competition.id,
          actorId: user.id,
          type: "competition.created",
          entityType: "Competition",
          entityId: competition.id,
          payload: { name, seasonName, league: league.name, ...schedule },
        },
      });
    },
    { timeout: 60000 },
  );

  revalidatePath("/admin");
  redirect("/admin");
}

export default async function CompetitionSetupPage() {
  const user = await requireSignedInUser();
  const hasMembership = await prisma.competitionMember.findFirst({ where: { userId: user.id } });
  if (hasMembership) {
    await getAdminContext();
    redirect("/admin");
  }
  const leagues = await prisma.league.findMany({ orderBy: [{ sport: "asc" }, { name: "asc" }] });

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin setup</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-text">Create your fundraiser</h1>
      <p className="mt-3 text-text-secondary">Choose a league and a run window. Every round and fixture inside that window is added automatically — you only record results and payments.</p>

      <form action={createCompetition} className="mt-8 space-y-6 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">Competition name</span>
            <input name="name" required placeholder="Club Last Man Standing" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">Season / campaign name</span>
            <input name="seasonName" required placeholder="Spring 2027 fundraiser" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">Source league</span>
            <select name="leagueId" required className="w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15">
              <option value="">Choose a league</option>
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>{league.name}{league.seasonLabel ? ` ${league.seasonLabel}` : ""}</option>
              ))}
            </select>
            <span className="mt-1.5 block text-sm text-text-secondary">The league cannot be changed once the campaign starts.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Run from</span>
            <input name="startDate" type="date" required className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Run to</span>
            <input name="endDate" type="date" required className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Entry fee</span>
            <input name="entryFee" type="number" min="0" step="0.01" defaultValue="10.00" required className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Currency</span>
            <input name="currency" defaultValue="EUR" maxLength={3} required className="w-full rounded-xl border border-border px-4 py-3 uppercase outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">Prize fund allocation (%)</span>
            <input name="prizePercentage" type="number" min="0" max="100" defaultValue="25" required className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
            <span className="mt-1.5 block text-sm text-text-secondary">The remaining percentage goes to the club or cause.</span>
          </label>
          <label className="flex items-center gap-3 sm:col-span-2">
            <input name="buyBack" type="checkbox" className="h-5 w-5 rounded border-border accent-primary" />
            <span className="text-sm font-semibold text-text">Allow one buy-back per entry after elimination (extra fundraising)</span>
          </label>
        </div>
        <button className="rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary/90">Create competition & inject fixtures</button>
      </form>
    </div>
  );
}
