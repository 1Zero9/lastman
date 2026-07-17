import { prisma } from "../lib/prisma";

const LEAGUE_NAME = "Premier League";
const SEASON_LABEL = "2026/27";
const FIRST_SATURDAY = new Date("2026-08-15T14:00:00.000Z");

const TEAMS: Array<{ name: string; shortName: string }> = [
  { name: "Arsenal", shortName: "ARS" },
  { name: "Aston Villa", shortName: "AVL" },
  { name: "Bournemouth", shortName: "BOU" },
  { name: "Brentford", shortName: "BRE" },
  { name: "Brighton & Hove Albion", shortName: "BHA" },
  { name: "Burnley", shortName: "BUR" },
  { name: "Chelsea", shortName: "CHE" },
  { name: "Crystal Palace", shortName: "CRY" },
  { name: "Everton", shortName: "EVE" },
  { name: "Fulham", shortName: "FUL" },
  { name: "Leeds United", shortName: "LEE" },
  { name: "Liverpool", shortName: "LIV" },
  { name: "Manchester City", shortName: "MCI" },
  { name: "Manchester United", shortName: "MUN" },
  { name: "Newcastle United", shortName: "NEW" },
  { name: "Nottingham Forest", shortName: "NFO" },
  { name: "Sunderland", shortName: "SUN" },
  { name: "Tottenham Hotspur", shortName: "TOT" },
  { name: "West Ham United", shortName: "WHU" },
  { name: "Wolverhampton Wanderers", shortName: "WOL" },
];

type Pairing = { home: number; away: number };

function roundRobin(teamCount: number): Pairing[][] {
  const teams = Array.from({ length: teamCount }, (_, index) => index);
  const rounds: Pairing[][] = [];
  for (let round = 0; round < teamCount - 1; round++) {
    const pairings: Pairing[] = [];
    for (let i = 0; i < teamCount / 2; i++) {
      const a = teams[i];
      const b = teams[teamCount - 1 - i];
      pairings.push(round % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
    }
    rounds.push(pairings);
    teams.splice(1, 0, teams.pop()!);
  }
  return rounds;
}

async function main() {
  const existing = await prisma.league.findUnique({
    where: { name_seasonLabel: { name: LEAGUE_NAME, seasonLabel: SEASON_LABEL } },
    include: { _count: { select: { sourceFixtures: true, teams: true } } },
  });
  if (existing) {
    console.log(`${LEAGUE_NAME} ${SEASON_LABEL} already seeded (${existing._count.teams} teams, ${existing._count.sourceFixtures} fixtures).`);
    return;
  }

  const league = await prisma.league.create({
    data: { name: LEAGUE_NAME, seasonLabel: SEASON_LABEL, sport: "FOOTBALL", region: "England" },
  });

  const teamIds: string[] = [];
  for (const team of TEAMS) {
    const record = await prisma.team.upsert({
      where: { name: team.name },
      update: { leagueId: league.id, shortName: team.shortName },
      create: { name: team.name, shortName: team.shortName, leagueId: league.id },
    });
    teamIds.push(record.id);
  }

  const firstHalf = roundRobin(TEAMS.length);
  const secondHalf = firstHalf.map((round) => round.map(({ home, away }) => ({ home: away, away: home })));
  const allRounds = [...firstHalf, ...secondHalf];

  const fixtures = allRounds.flatMap((round, roundIndex) => {
    const saturday = new Date(FIRST_SATURDAY.getTime() + roundIndex * 7 * 24 * 60 * 60 * 1000);
    return round.map((pairing, matchIndex) => ({
      leagueId: league.id,
      matchweek: roundIndex + 1,
      homeTeamId: teamIds[pairing.home],
      awayTeamId: teamIds[pairing.away],
      kickoffAt: new Date(saturday.getTime() + (matchIndex % 3) * 2.5 * 60 * 60 * 1000),
    }));
  });

  await prisma.sourceFixture.createMany({ data: fixtures });
  console.log(`Seeded ${LEAGUE_NAME} ${SEASON_LABEL}: ${TEAMS.length} teams, ${fixtures.length} fixtures across ${allRounds.length} matchweeks.`);
  console.log("Note: this is a generated placeholder schedule. Replace kickoff dates with the official fixture list when it is published.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
