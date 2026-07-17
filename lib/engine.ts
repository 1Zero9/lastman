import { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;
type Rules = { noTeamRepeats?: boolean; restrictedTeamGroup?: string[] };

export async function eligibleTeamIds(db: Db, entryId: string, gameweekId: string, rules: Rules) {
  const [fixtures, history] = await Promise.all([
    db.fixture.findMany({ where: { gameweekId }, select: { homeTeamId: true, awayTeamId: true } }),
    db.pick.findMany({ where: { entryId }, include: { team: { select: { name: true } } } }),
  ]);
  const candidates = new Set(fixtures.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId]));
  const usedIds = new Set(history.map((pick) => pick.teamId));
  const restricted = new Set(rules.restrictedTeamGroup ?? []);
  const usedRestricted = history.some((pick) => restricted.has(pick.team.name));
  if (rules.noTeamRepeats !== false) for (const id of usedIds) candidates.delete(id);
  if (usedRestricted) {
    const teams = await db.team.findMany({ where: { id: { in: [...candidates] } }, select: { id: true, name: true } });
    for (const team of teams) if (restricted.has(team.name)) candidates.delete(team.id);
  }
  return [...candidates];
}

export async function lockGameweek(db: Db, gameweekId: string, actorId?: string) {
  const gameweek = await db.gameweek.findUniqueOrThrow({
    where: { id: gameweekId }, include: { season: { include: { competition: true } }, fixtures: { include: { homeTeam: true, awayTeam: true } } },
  });
  if (gameweek.status !== "OPEN") throw new Error("Only an open gameweek can be locked.");
  const rules = gameweek.season.rules as Rules;
  const activeEntries = await db.entry.findMany({ where: { seasonId: gameweek.seasonId, status: "ACTIVE" }, select: { id: true } });
  const existing = await db.pick.findMany({ where: { gameweekId }, select: { entryId: true, teamId: true } });
  const picked = new Set(existing.map((pick) => pick.entryId));
  const counts = new Map<string, number>();
  for (const pick of existing) counts.set(pick.teamId, (counts.get(pick.teamId) ?? 0) + 1);
  const kickoff = new Map<string, Date>();
  for (const fixture of gameweek.fixtures) { kickoff.set(fixture.homeTeamId, fixture.kickoffAt); kickoff.set(fixture.awayTeamId, fixture.kickoffAt); }
  const teams = await db.team.findMany({ where: { id: { in: [...kickoff.keys()] } } });
  const sorted = [...teams].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || (kickoff.get(a.id)!.getTime() - kickoff.get(b.id)!.getTime()) || a.name.localeCompare(b.name));
  const now = new Date(); let autopicks = 0;
  for (const entry of activeEntries) {
    if (picked.has(entry.id)) continue;
    const eligible = new Set(await eligibleTeamIds(db, entry.id, gameweek.id, rules));
    const team = sorted.find((candidate) => eligible.has(candidate.id));
    if (!team) throw new Error(`No eligible autopick is available for entry ${entry.id}.`);
    await db.pick.create({ data: { entryId: entry.id, gameweekId: gameweek.id, teamId: team.id, method: "AUTOPICK", lockedAt: now } }); autopicks++;
  }
  await db.pick.updateMany({ where: { gameweekId, lockedAt: null }, data: { lockedAt: now } });
  await db.gameweek.update({ where: { id: gameweek.id }, data: { status: "LOCKED" } });
  await db.auditEvent.create({ data: { competitionId: gameweek.season.competitionId, actorId, type: "gameweek.locked", entityType: "Gameweek", entityId: gameweek.id, payload: { autopicks } } });
  return { autopicks };
}

export async function settleGameweek(db: Db, gameweekId: string, actorId?: string) {
  const gameweek = await db.gameweek.findUniqueOrThrow({ where: { id: gameweekId }, include: { season: { include: { competition: true } }, fixtures: true } });
  if (gameweek.status !== "LOCKED" || gameweek.fixtures.some((fixture) => fixture.status !== "FINISHED")) throw new Error("All fixtures must be finished before settlement.");
  const picks = await db.pick.findMany({ where: { gameweekId }, include: { entry: true } });
  const fixtures = gameweek.fixtures;
  const defeated: string[] = [];
  for (const pick of picks) {
    const fixture = fixtures.find((item) => item.homeTeamId === pick.teamId || item.awayTeamId === pick.teamId);
    if (!fixture || fixture.homeScore === null || fixture.awayScore === null) throw new Error("A selected team has no final result.");
    const score = pick.teamId === fixture.homeTeamId ? [fixture.homeScore, fixture.awayScore] : [fixture.awayScore, fixture.homeScore];
    const outcome = score[0] > score[1] ? "WIN" : score[0] === score[1] ? "DRAW" : "LOSS";
    await db.pick.update({ where: { id: pick.id }, data: { outcome } });
    if (outcome !== "WIN" && pick.entry.status === "ACTIVE") { await db.entry.update({ where: { id: pick.entryId }, data: { status: "ELIMINATED", eliminatedGameweekId: gameweek.id } }); defeated.push(pick.entryId); }
  }
  let wipeout: string | null = null;
  const alive = await db.entry.count({ where: { seasonId: gameweek.seasonId, status: "ACTIVE" } });
  if (alive === 0 && defeated.length) {
    if (defeated.length <= 5) { await db.entry.updateMany({ where: { id: { in: defeated } }, data: { status: "WINNER" } }); await db.season.update({ where: { id: gameweek.seasonId }, data: { status: "COMPLETED" } }); wipeout = "split_winners"; }
    else { await db.entry.updateMany({ where: { id: { in: defeated } }, data: { status: "ACTIVE", eliminatedGameweekId: null } }); wipeout = "rollover"; }
  }
  await db.gameweek.update({ where: { id: gameweek.id }, data: { status: "SETTLED" } });
  await db.auditEvent.create({ data: { competitionId: gameweek.season.competitionId, actorId, type: "gameweek.settled", entityType: "Gameweek", entityId: gameweek.id, payload: { eliminated: defeated.length, wipeout } } });
  return { eliminated: defeated.length, wipeout };
}
