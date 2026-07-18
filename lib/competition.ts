import { randomInt } from "node:crypto";
import { Competition, Prisma, PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const POLICY_VERSION = "2026-07-17";

export const defaultRules = {
  format: { mode: "survival" },
  pickFrequency: "one_team_per_gameweek",
  noTeamRepeats: true,
  restrictedTeamGroup: ["Arsenal", "Manchester City", "Aston Villa", "Manchester United", "Chelsea", "Liverpool"],
  autopick: {
    enabled: true,
    method: "most_popular_eligible_team",
    tieBreak: ["earliest_kickoff", "alphabetical"],
  },
  buyBack: {
    enabled: false,
    maxPerEntry: 1,
  },
  wipeout: {
    splitPrizeAtOrBelowEntries: 5,
    otherwise: "rollover",
  },
};

export function makeSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "competition";
}

const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function makeJoinCode(length = 6) {
  return Array.from({ length }, () => JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)]).join("");
}

export async function ensureJoinCode(competitionId: string, existing: string | null) {
  if (existing) return existing;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const joinCode = makeJoinCode();
    try {
      await prisma.competition.update({ where: { id: competitionId }, data: { joinCode } });
      return joinCode;
    } catch {
      // collision on the unique join code — try again
    }
  }
  throw new Error("Could not generate a join code. Please try again.");
}

type Db = PrismaClient | Prisma.TransactionClient;

export async function getPublicSeason() {
  const competition = await prisma.competition.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
  if (!competition) return null;
  const season = await prisma.season.findFirst({ where: { competitionId: competition.id }, orderBy: { createdAt: "desc" }, include: { league: true } });
  if (!season) return null;
  return { competition, season };
}

export async function getSeasonBySlug(slug: string) {
  const competition = await prisma.competition.findFirst({ where: { slug, status: { not: "DRAFT" } } });
  if (!competition) return null;
  const season = await prisma.season.findFirst({ where: { competitionId: competition.id }, orderBy: { createdAt: "desc" }, include: { league: true } });
  if (!season) return null;
  return { competition, season };
}

export async function resolvePublicCompetitionSlug() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    const participant = await prisma.participant.findFirst({
      where: { userId: session.user.id, anonymisedAt: null },
      orderBy: { createdAt: "desc" },
      select: { competition: { select: { slug: true } } },
    });
    if (participant) return participant.competition.slug;
    const membership = await prisma.competitionMember.findFirst({
      where: { userId: session.user.id, competition: { status: { not: "ARCHIVED" } } },
      orderBy: { createdAt: "asc" },
      select: { competition: { select: { slug: true } } },
    });
    if (membership) return membership.competition.slug;
  }
  const competition = await prisma.competition.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, select: { slug: true } });
  return competition?.slug ?? null;
}

export async function getPotSummary(seasonId: string, competition: Competition) {
  const aggregate = await prisma.payment.aggregate({ where: { seasonId, status: "CONFIRMED" }, _sum: { amountCents: true } });
  const raisedCents = aggregate._sum.amountCents ?? 0;
  const prizeCents = Math.round((raisedCents * competition.prizePercentage) / 100);
  return { raisedCents, prizeCents, clubCents: raisedCents - prizeCents, currency: competition.currency };
}

export async function injectLeagueSchedule(db: Db, seasonId: string, leagueId: string, from: Date, to: Date) {
  const sourceFixtures = await db.sourceFixture.findMany({
    where: { leagueId, kickoffAt: { gte: from, lte: to } },
    orderBy: [{ matchweek: "asc" }, { kickoffAt: "asc" }],
  });
  if (!sourceFixtures.length) throw new Error("No fixtures exist for that league within the selected dates.");

  const byMatchweek = new Map<number, typeof sourceFixtures>();
  for (const fixture of sourceFixtures) {
    const group = byMatchweek.get(fixture.matchweek) ?? [];
    group.push(fixture);
    byMatchweek.set(fixture.matchweek, group);
  }

  const ordered = [...byMatchweek.entries()].sort((a, b) => a[0] - b[0]);
  const gameweeks = await db.gameweek.createManyAndReturn({
    data: ordered.map(([matchweek, fixtures], index) => ({
      seasonId,
      number: index + 1,
      name: `Round ${index + 1} (Matchweek ${matchweek})`,
      startsAt: fixtures[0].kickoffAt,
      deadlineAt: new Date(fixtures[0].kickoffAt.getTime() - 60 * 60 * 1000),
      status: "DRAFT" as const,
    })),
  });
  const gameweekIdByNumber = new Map(gameweeks.map((gameweek) => [gameweek.number, gameweek.id]));
  await db.fixture.createMany({
    data: ordered.flatMap(([, fixtures], index) =>
      fixtures.map((fixture) => ({
        gameweekId: gameweekIdByNumber.get(index + 1)!,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        kickoffAt: fixture.kickoffAt,
      })),
    ),
  });
  return { rounds: ordered.length, fixtures: sourceFixtures.length };
}
