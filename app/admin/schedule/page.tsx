import Link from "next/link";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { lockGameweek } from "@/lib/engine";

function asZonedDate(value: FormDataEntryValue | null, timezone: string) {
  const dateTime = String(value ?? "");
  if (!dateTime) throw new Error("Date and time are required.");
  const date = fromZonedTime(dateTime, timezone);
  if (Number.isNaN(date.getTime())) throw new Error("Enter a valid date and time.");
  return date;
}

async function createTeam(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();
  const name = String(formData.get("name") ?? "").trim();
  const shortName = String(formData.get("shortName") ?? "").trim() || null;
  if (!name) throw new Error("A team name is required.");

  const existing = await prisma.team.findUnique({ where: { name } });
  if (!existing) {
    const team = await prisma.team.create({ data: { name, shortName } });
    await prisma.auditEvent.create({
      data: { competitionId: competition.id, actorId: user.id, type: "team.created", entityType: "Team", entityId: team.id, payload: { name } },
    });
  }
  revalidatePath("/admin/schedule");
}

async function createGameweek(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();
  const season = await prisma.season.findFirstOrThrow({ where: { competitionId: competition.id }, orderBy: { createdAt: "desc" } });
  const number = Number(formData.get("number"));
  const name = String(formData.get("name") ?? "").trim();
  const startsAt = asZonedDate(formData.get("startsAt"), competition.timezone);
  const deadlineAt = asZonedDate(formData.get("deadlineAt"), competition.timezone);
  if (!Number.isInteger(number) || number < 1 || !name || deadlineAt >= startsAt) {
    throw new Error("Use a positive gameweek number, a name, and a deadline before the first fixture.");
  }

  const gameweek = await prisma.gameweek.create({
    data: { seasonId: season.id, number, name, startsAt, deadlineAt, status: "DRAFT" },
  });
  await prisma.auditEvent.create({
    data: { competitionId: competition.id, actorId: user.id, type: "gameweek.created", entityType: "Gameweek", entityId: gameweek.id, payload: { number, name, startsAt, deadlineAt } },
  });
  revalidatePath("/admin/schedule");
}

async function createFixture(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();
  const gameweekId = String(formData.get("gameweekId") ?? "");
  const homeTeamId = String(formData.get("homeTeamId") ?? "");
  const awayTeamId = String(formData.get("awayTeamId") ?? "");
  const kickoffAt = asZonedDate(formData.get("kickoffAt"), competition.timezone);
  if (!gameweekId || !homeTeamId || !awayTeamId || homeTeamId === awayTeamId) throw new Error("Choose a gameweek and two different teams.");

  const gameweek = await prisma.gameweek.findFirst({ where: { id: gameweekId, season: { competitionId: competition.id } } });
  if (!gameweek || gameweek.status !== "DRAFT") throw new Error("Fixtures can only be added to a draft gameweek.");
  const fixture = await prisma.fixture.create({ data: { gameweekId, homeTeamId, awayTeamId, kickoffAt } });
  await prisma.auditEvent.create({
    data: { competitionId: competition.id, actorId: user.id, type: "fixture.created", entityType: "Fixture", entityId: fixture.id, payload: { gameweekId, homeTeamId, awayTeamId, kickoffAt } },
  });
  revalidatePath("/admin/schedule");
}

async function changeGameweekStatus(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();
  const gameweekId = String(formData.get("gameweekId") ?? "");
  const action = String(formData.get("action") ?? "");
  const gameweek = await prisma.gameweek.findFirst({
    where: { id: gameweekId, season: { competitionId: competition.id } },
    include: { _count: { select: { fixtures: true } } },
  });
  if (!gameweek) throw new Error("Gameweek not found.");

  if (action === "open") {
    if (gameweek.status !== "DRAFT" || gameweek._count.fixtures === 0) throw new Error("A draft gameweek needs at least one fixture before opening.");
    await prisma.gameweek.update({ where: { id: gameweek.id }, data: { status: "OPEN" } });
  } else if (action === "lock") {
    if (gameweek.status !== "OPEN") throw new Error("Only an open gameweek can be locked.");
    await prisma.$transaction((tx) => lockGameweek(tx, gameweek.id, user.id));
    revalidatePath("/my-entries");
    revalidatePath("/admin/schedule");
    return;
  } else {
    throw new Error("Invalid gameweek action.");
  }

  await prisma.auditEvent.create({
    data: { competitionId: competition.id, actorId: user.id, type: `gameweek.${action}ed`, entityType: "Gameweek", entityId: gameweek.id, payload: { fixtureCount: gameweek._count.fixtures } },
  });
  revalidatePath("/admin/schedule");
}

function formatDate(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "EEE d MMM yyyy, HH:mm zzz");
}

const statusClass: Record<string, string> = {
  DRAFT: "bg-warning/10 text-warning",
  OPEN: "bg-success/10 text-success",
  LOCKED: "bg-nav/10 text-nav",
  SETTLED: "bg-info/10 text-info",
  CANCELLED: "bg-error/10 text-error",
};

export default async function SchedulePage() {
  const { competition } = await getAdminContext();
  const season = await prisma.season.findFirstOrThrow({ where: { competitionId: competition.id }, orderBy: { createdAt: "desc" } });
  const [teams, gameweeks] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.gameweek.findMany({
      where: { seasonId: season.id },
      include: { fixtures: { include: { homeTeam: true, awayTeam: true }, orderBy: { kickoffAt: "asc" } } },
      orderBy: { number: "asc" },
    }),
  ]);
  const nextNumber = (gameweeks.at(-1)?.number ?? 0) + 1;
  const draftGameweeks = gameweeks.filter((gameweek) => gameweek.status === "DRAFT");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-primary">{competition.name} · {season.name}</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-text">Fixtures & gameweeks</h1><p className="mt-2 text-text-secondary">All times are saved and displayed in {competition.timezone}.</p></div>
        <Link href="/admin" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text">Back to admin</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border"><h2 className="text-lg font-bold text-text">Add team</h2><form action={createTeam} className="mt-4 flex flex-wrap gap-3"><input name="name" required placeholder="Team name" className="min-w-0 flex-1 rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /><input name="shortName" placeholder="Short name" className="w-32 rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /><button className="rounded-xl bg-primary px-4 py-3 font-semibold text-white">Add</button></form><p className="mt-3 text-sm text-text-secondary">{teams.length} teams available for fixtures.</p></section>
        <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border"><h2 className="text-lg font-bold text-text">Create gameweek</h2><form action={createGameweek} className="mt-4 grid gap-3 sm:grid-cols-2"><input name="number" type="number" min="1" defaultValue={nextNumber} required className="rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /><input name="name" defaultValue={`Gameweek ${nextNumber}`} required className="rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /><label className="text-sm font-semibold text-text">First fixture<input name="startsAt" type="datetime-local" required className="mt-1.5 block w-full rounded-xl border border-border px-4 py-3 font-normal outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></label><label className="text-sm font-semibold text-text">Pick deadline<input name="deadlineAt" type="datetime-local" required className="mt-1.5 block w-full rounded-xl border border-border px-4 py-3 font-normal outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></label><button className="w-fit rounded-xl bg-primary px-4 py-3 font-semibold text-white sm:col-span-2">Create draft gameweek</button></form></section>
      </div>

      <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border"><h2 className="text-lg font-bold text-text">Add fixture</h2>{draftGameweeks.length === 0 || teams.length < 2 ? <p className="mt-3 text-sm text-text-secondary">Create a draft gameweek and at least two teams before adding a fixture.</p> : <form action={createFixture} className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4"><select name="gameweekId" required className="rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary">{draftGameweeks.map((gameweek) => <option key={gameweek.id} value={gameweek.id}>{gameweek.name}</option>)}</select><select name="homeTeamId" required className="rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary"><option value="">Home team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><select name="awayTeamId" required className="rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary"><option value="">Away team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select><input name="kickoffAt" type="datetime-local" required className="rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" /><button className="w-fit rounded-xl bg-primary px-4 py-3 font-semibold text-white md:col-span-2 lg:col-span-4">Add fixture</button></form>}</section>

      <section className="space-y-4">{gameweeks.length === 0 ? <div className="rounded-2xl bg-surface p-8 text-sm text-text-secondary ring-1 ring-border">No gameweeks have been created yet.</div> : gameweeks.map((gameweek) => <article key={gameweek.id} className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-border"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5"><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold text-text">{gameweek.name}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[gameweek.status]}`}>{gameweek.status.toLowerCase()}</span></div><p className="mt-1 text-sm text-text-secondary">Deadline: {formatDate(gameweek.deadlineAt, competition.timezone)} · Starts: {formatDate(gameweek.startsAt, competition.timezone)}</p></div><div className="flex gap-2">{gameweek.status === "DRAFT" && <form action={changeGameweekStatus}><input type="hidden" name="gameweekId" value={gameweek.id} /><input type="hidden" name="action" value="open" /><button className="rounded-lg bg-success px-3 py-2 text-sm font-semibold text-white">Open gameweek</button></form>}{gameweek.status === "OPEN" && <form action={changeGameweekStatus}><input type="hidden" name="gameweekId" value={gameweek.id} /><input type="hidden" name="action" value="lock" /><button className="rounded-lg bg-nav px-3 py-2 text-sm font-semibold text-white">Lock picks</button></form>}</div></div><div className="divide-y divide-border">{gameweek.fixtures.length === 0 ? <p className="px-6 py-5 text-sm text-text-secondary">No fixtures added yet.</p> : gameweek.fixtures.map((fixture) => <div key={fixture.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"><p className="font-semibold text-text">{fixture.homeTeam.name} <span className="mx-1 text-text-secondary">vs</span> {fixture.awayTeam.name}</p><p className="text-sm text-text-secondary">{formatDate(fixture.kickoffAt, competition.timezone)}</p></div>)}</div></article>)}</section>
    </div>
  );
}
