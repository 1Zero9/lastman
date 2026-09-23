import { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;
export type Rules = {
  noTeamRepeats?: boolean;
  restrictedTeamGroup?: string[];
  format?: { mode?: "survival" | "ranked_out" };
  buyBack?: { enabled?: boolean; maxPerEntry?: number };
  wipeout?: { splitPrizeAtOrBelowEntries?: number };
};

const DEFAULT_WIPEOUT_SPLIT_THRESHOLD = 5;

export function formatMode(rules: Rules) {
  return rules.format?.mode ?? "survival";
}

function assertSupportedFormat(rules: Rules) {
  const mode = formatMode(rules);
  if (mode !== "survival") throw new Error(`The "${mode}" format is not supported yet. Only "survival" competitions can be settled.`);
}

// Buy-back is only a way back in from an early exit, not a running escape hatch for
// the rest of the season — restricted to an entry eliminated in the first two rounds.
// Takes the eliminated gameweek's own round number, not its id, since
// Entry.eliminatedGameweekId isn't a Prisma relation.
export function isBuyBackEligible(entry: { status: string; buyBackCount: number }, eliminatedGameweekNumber: number | null, rules: Rules) {
  if (!rules.buyBack?.enabled) return false;
  if (entry.status !== "ELIMINATED") return false;
  if (entry.buyBackCount >= (rules.buyBack.maxPerEntry ?? 1)) return false;
  if (eliminatedGameweekNumber === null || eliminatedGameweekNumber > 2) return false;
  return true;
}

export async function eligibleTeamIds(db: Db, entryId: string, gameweekId: string, rules: Rules) {
  const [fixtures, allHistory] = await Promise.all([
    db.fixture.findMany({ where: { gameweekId }, select: { homeTeamId: true, awayTeamId: true } }),
    db.pick.findMany({ where: { entryId }, include: { team: { select: { name: true } } } }),
  ]);
  // A voided round is a bye: it must not burn the team the player picked, nor
  // count toward their one-shot restricted-group allowance for the season.
  const history = allHistory.filter((pick) => pick.outcome !== "VOID");
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
  assertSupportedFormat(rules);
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
  if (gameweek.status !== "LOCKED") throw new Error("Only a locked gameweek can be settled.");
  if (gameweek.fixtures.some((fixture) => fixture.status !== "FINISHED")) throw new Error("Every fixture in this round needs a final score before it can be settled.");
  const rules = gameweek.season.rules as Rules;
  assertSupportedFormat(rules);
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
  let seasonCompleted = false;
  let rolledOverEntryIds: string[] = [];
  const stillActive = await db.entry.findMany({ where: { seasonId: gameweek.seasonId, status: "ACTIVE" }, select: { id: true } });
  if (stillActive.length === 0 && defeated.length) {
    // Everyone left lost this round together — either the sole finalist losing (still wins, nobody
    // else is left) or a genuine mass wipeout. Both are the same shape: split threshold decides which.
    const splitThreshold = rules.wipeout?.splitPrizeAtOrBelowEntries ?? DEFAULT_WIPEOUT_SPLIT_THRESHOLD;
    if (defeated.length <= splitThreshold) { await db.entry.updateMany({ where: { id: { in: defeated } }, data: { status: "WINNER" } }); await db.season.update({ where: { id: gameweek.seasonId }, data: { status: "COMPLETED" } }); wipeout = "split_winners"; seasonCompleted = true; }
    else { await db.entry.updateMany({ where: { id: { in: defeated } }, data: { status: "ACTIVE", eliminatedGameweekId: null } }); wipeout = "rollover"; rolledOverEntryIds = defeated; }
  } else if (stillActive.length === 1) {
    // The last entry standing won its pick outright — the season is over even though no wipeout fired.
    await db.entry.update({ where: { id: stillActive[0].id }, data: { status: "WINNER" } });
    await db.season.update({ where: { id: gameweek.seasonId }, data: { status: "COMPLETED" } });
    seasonCompleted = true;
  }
  await db.gameweek.update({ where: { id: gameweek.id }, data: { status: "SETTLED" } });
  await db.auditEvent.create({ data: { competitionId: gameweek.season.competitionId, actorId, type: "gameweek.settled", entityType: "Gameweek", entityId: gameweek.id, payload: { eliminated: defeated.length, wipeout } } });
  // Entries actually out after this round: defeated this round, minus any rolled-over-and-forgiven
  // in a mass-wipeout-that-wasn't-a-split-settlement, plus the wipeout losers when it *was* a split.
  const trulyEliminatedIds = wipeout === "rollover" ? [] : defeated;
  return {
    eliminated: defeated.length,
    wipeout,
    seasonCompleted,
    survivorCount: seasonCompleted ? 0 : stillActive.length,
    eliminatedEntryIds: trulyEliminatedIds.filter((id) => !rolledOverEntryIds.includes(id)),
  };
}

// A competition admin's override for "extend or settle": forces every currently-active
// entry to WINNER (a shared split) regardless of the usual wipeout threshold, and closes
// the season. Used when the organiser decides not to keep extending the schedule.
export async function forceSplitSettlement(db: Db, seasonId: string, actorId?: string) {
  const season = await db.season.findUniqueOrThrow({ where: { id: seasonId } });
  if (season.status === "COMPLETED") throw new Error("The season has already finished.");
  const stillActive = await db.entry.findMany({ where: { seasonId, status: "ACTIVE" }, select: { id: true } });
  if (!stillActive.length) throw new Error("There are no active entries left to settle.");
  await db.entry.updateMany({ where: { id: { in: stillActive.map((entry) => entry.id) } }, data: { status: "WINNER" } });
  await db.season.update({ where: { id: seasonId }, data: { status: "COMPLETED" } });
  await db.auditEvent.create({ data: { competitionId: season.competitionId, actorId, type: "season.force_settled", entityType: "Season", entityId: seasonId, payload: { winners: stillActive.length } } });
  return { winners: stillActive.length };
}

export async function voidGameweek(db: Db, gameweekId: string, actorId?: string) {
  const gameweek = await db.gameweek.findUniqueOrThrow({ where: { id: gameweekId }, include: { season: true } });
  if (!["OPEN", "LOCKED"].includes(gameweek.status)) throw new Error("Only an open or locked gameweek can be voided.");
  const voided = await db.pick.updateMany({ where: { gameweekId }, data: { outcome: "VOID" } });
  await db.gameweek.update({ where: { id: gameweek.id }, data: { status: "CANCELLED" } });
  await db.auditEvent.create({ data: { competitionId: gameweek.season.competitionId, actorId, type: "gameweek.voided", entityType: "Gameweek", entityId: gameweek.id, payload: { voidedPicks: voided.count } } });
  return { voidedPicks: voided.count };
}

export async function buyBackEntry(db: Db, entryId: string, competitionId: string, actorId?: string) {
  const entry = await db.entry.findFirstOrThrow({ where: { id: entryId, season: { competitionId } }, include: { season: { include: { competition: true } } } });
  const rules = entry.season.rules as Rules;
  if (entry.season.status === "COMPLETED") throw new Error("The season has already finished.");
  const eliminatedGameweek = entry.eliminatedGameweekId ? await db.gameweek.findUnique({ where: { id: entry.eliminatedGameweekId }, select: { number: true } }) : null;
  if (!isBuyBackEligible(entry, eliminatedGameweek?.number ?? null, rules)) {
    throw new Error("This entry is not eligible for a buy-back — only an entry eliminated in the first two rounds can buy back in.");
  }
  await db.entry.update({ where: { id: entry.id }, data: { status: "ACTIVE", eliminatedGameweekId: null, buyBackRequestedAt: null, buyBackCount: { increment: 1 } } });
  await db.payment.create({ data: { seasonId: entry.seasonId, participantId: entry.participantId, amountCents: entry.season.competition.entryFeeCents, entryCount: 0, status: "CONFIRMED", receivedAt: new Date(), notes: `Buy-back for entry #${entry.number}` } });
  await db.auditEvent.create({ data: { competitionId, actorId, type: "entry.buyback", entityType: "Entry", entityId: entry.id, payload: { buyBackCount: entry.buyBackCount + 1 } } });
  return { entryNumber: entry.number };
}
