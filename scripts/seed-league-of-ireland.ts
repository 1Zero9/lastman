import { prisma } from "../lib/prisma";

const LEAGUE_NAME = "League of Ireland Premier Division";
const SEASON_LABEL = "2026";
const FIRST_FRIDAY = new Date("2026-02-13T19:45:00.000Z");

const TEAMS: Array<{ name: string; shortName: string }> = [
  { name: "Bohemians", shortName: "BOH" },
  { name: "Derry City", shortName: "DER" },
  { name: "Drogheda United", shortName: "DRO" },
  { name: "Dundalk", shortName: "DUN" },
  { name: "Galway United", shortName: "GAL" },
  { name: "Shamrock Rovers", shortName: "SHR" },
  { name: "Shelbourne", shortName: "SHE" },
  { name: "Sligo Rovers", shortName: "SLI" },
  { name: "St Patrick's Athletic", shortName: "PAT" },
  { name: "Waterford", shortName: "WAT" },
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
    data: { name: LEAGUE_NAME, seasonLabel: SEASON_LABEL, sport: "FOOTBALL", region: "Ireland" },
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

  const firstSeries = roundRobin(TEAMS.length);
  const secondSeries = firstSeries.map((round) => round.map(({ home, away }) => ({ home: away, away: home })));
  const allRounds = [...firstSeries, ...secondSeries, ...firstSeries, ...secondSeries];

  const fixtures = allRounds.flatMap((round, roundIndex) => {
    const friday = new Date(FIRST_FRIDAY.getTime() + roundIndex * 7 * 24 * 60 * 60 * 1000);
    return round.map((pairing) => ({
      leagueId: league.id,
      matchweek: roundIndex + 1,
      homeTeamId: teamIds[pairing.home],
      awayTeamId: teamIds[pairing.away],
      kickoffAt: friday,
    }));
  });

  await prisma.sourceFixture.createMany({ data: fixtures });
  console.log(`Seeded ${LEAGUE_NAME} ${SEASON_LABEL}: ${TEAMS.length} teams, ${fixtures.length} fixtures across ${allRounds.length} matchweeks.`);
  console.log("Note: this is a generated placeholder schedule. Replace teams and kickoff dates with the official fixture list when confirmed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
