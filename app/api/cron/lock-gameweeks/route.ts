import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getCompetitionMatches, type FootballDataMatch } from "@/lib/football-data";
import { lockGameweek } from "@/lib/engine";
import { prisma } from "@/lib/prisma";
import { publicFixturesTag } from "@/lib/public-fixtures";
import { settleGameweekAndNotify } from "@/lib/round-settlement";

const COMPETITION_CODE = "PL";
const SEASON = "2026";

async function syncScoresAndSettle(appUrl: string) {
  let remoteMatches: FootballDataMatch[] = [];
  try {
    remoteMatches = await getCompetitionMatches(COMPETITION_CODE, SEASON);
  } catch (error) {
    // A data-source outage shouldn't take down gameweek locking — just skip this part of the run.
    console.error("football-data.org sync failed:", error);
    return { scoresUpdated: 0, settled: [] as string[] };
  }
  const byExternalId = new Map(remoteMatches.map((match) => [String(match.id), match]));

  const pendingFixtures = await prisma.fixture.findMany({
    where: { status: { not: "FINISHED" }, externalId: { not: null }, gameweek: { status: "LOCKED" } },
    select: { id: true, externalId: true, gameweekId: true },
  });

  let scoresUpdated = 0;
  for (const fixture of pendingFixtures) {
    const remote = byExternalId.get(fixture.externalId!);
    if (!remote || remote.status !== "FINISHED" || remote.score.fullTime.home === null || remote.score.fullTime.away === null) continue;
    await prisma.fixture.update({
      where: { id: fixture.id },
      data: { status: "FINISHED", homeScore: remote.score.fullTime.home, awayScore: remote.score.fullTime.away },
    });
    scoresUpdated += 1;
  }

  // Re-check every currently locked gameweek, not just ones touched this run, in case a
  // previous run fetched the last score but the settle step itself hadn't happened yet.
  const lockedGameweeks = await prisma.gameweek.findMany({
    where: { status: "LOCKED" },
    select: { id: true, fixtures: { select: { status: true } } },
  });
  const readyToSettle = lockedGameweeks.filter((gw) => gw.fixtures.length > 0 && gw.fixtures.every((f) => f.status === "FINISHED"));

  const settled: string[] = [];
  for (const gameweek of readyToSettle) {
    await settleGameweekAndNotify(gameweek.id, appUrl);
    settled.push(gameweek.id);
  }
  return { scoresUpdated, settled };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const appUrl = `https://${request.headers.get("host") ?? "lastman.1zero9.com"}`;

  const overdue = await prisma.gameweek.findMany({
    where: { status: "OPEN", deadlineAt: { lte: new Date() } },
    select: { id: true, season: { select: { competition: { select: { slug: true } } } } },
  });
  const locked: Array<{ id: string; autopicks: number }> = [];
  for (const gameweek of overdue) {
    const result = await prisma.$transaction((tx) => lockGameweek(tx, gameweek.id));
    revalidateTag(publicFixturesTag(gameweek.season.competition.slug), "max");
    locked.push({ id: gameweek.id, autopicks: result.autopicks });
  }

  const { scoresUpdated, settled } = await syncScoresAndSettle(appUrl);

  return NextResponse.json({ locked: locked.length, results: locked, scoresUpdated, settled: settled.length });
}
