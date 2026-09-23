import { prisma } from "../lib/prisma";
import { getCompetitionMatches, getCompetitionTeams } from "../lib/football-data";

const LEAGUE_NAME = "Premier League";
const SEASON_LABEL = "2026/27";
const COMPETITION_CODE = "PL";
const SEASON = "2026";

// football-data.org's official name -> our Team.name. Every current (2026/27) ex-Championship
// team not yet in our seed (Hull City, Ipswich Town, Coventry City) gets created fresh; every
// other 2026/27 club already exists under a slightly different name (e.g. "Arsenal FC" vs "Arsenal").
const NAME_OVERRIDES: Record<string, string> = {
  "Arsenal FC": "Arsenal",
  "Aston Villa FC": "Aston Villa",
  "Chelsea FC": "Chelsea",
  "Everton FC": "Everton",
  "Fulham FC": "Fulham",
  "Liverpool FC": "Liverpool",
  "Manchester City FC": "Manchester City",
  "Manchester United FC": "Manchester United",
  "Newcastle United FC": "Newcastle United",
  "Sunderland AFC": "Sunderland",
  "Tottenham Hotspur FC": "Tottenham Hotspur",
  "Leeds United FC": "Leeds United",
  "Nottingham Forest FC": "Nottingham Forest",
  "Crystal Palace FC": "Crystal Palace",
  "Brighton & Hove Albion FC": "Brighton & Hove Albion",
  "Brentford FC": "Brentford",
  "AFC Bournemouth": "Bournemouth",
  "Hull City AFC": "Hull City",
  "Ipswich Town FC": "Ipswich Town",
  "Coventry City FC": "Coventry City",
};

async function main() {
  const league = await prisma.league.upsert({
    where: { name_seasonLabel: { name: LEAGUE_NAME, seasonLabel: SEASON_LABEL } },
    update: {},
    create: { name: LEAGUE_NAME, seasonLabel: SEASON_LABEL, sport: "FOOTBALL", region: "England" },
  });

  const remoteTeams = await getCompetitionTeams(COMPETITION_CODE, SEASON);
  const teamIdByExternalId = new Map<number, string>();
  for (const remote of remoteTeams) {
    const ourName = NAME_OVERRIDES[remote.name];
    if (!ourName) {
      console.warn(`No name mapping for "${remote.name}" (id ${remote.id}) — skipping.`);
      continue;
    }
    const record = await prisma.team.upsert({
      where: { name: ourName },
      update: { leagueId: league.id, shortName: remote.shortName, externalId: String(remote.id) },
      create: { name: ourName, shortName: remote.shortName, leagueId: league.id, externalId: String(remote.id) },
    });
    teamIdByExternalId.set(remote.id, record.id);
  }
  console.log(`Synced ${teamIdByExternalId.size} teams.`);

  const { count: purged } = await prisma.sourceFixture.deleteMany({ where: { leagueId: league.id, externalId: null } });
  if (purged) console.log(`Purged ${purged} old synthetic fixture(s) with no external ID.`);

  const matches = await getCompetitionMatches(COMPETITION_CODE, SEASON);
  let created = 0;
  let skipped = 0;
  for (const match of matches) {
    const homeTeamId = teamIdByExternalId.get(match.homeTeam.id);
    const awayTeamId = teamIdByExternalId.get(match.awayTeam.id);
    if (!homeTeamId || !awayTeamId) {
      skipped += 1;
      continue;
    }
    await prisma.sourceFixture.upsert({
      where: { externalId: String(match.id) },
      update: { matchweek: match.matchday, kickoffAt: new Date(match.utcDate), homeTeamId, awayTeamId },
      create: {
        leagueId: league.id,
        matchweek: match.matchday,
        homeTeamId,
        awayTeamId,
        kickoffAt: new Date(match.utcDate),
        externalId: String(match.id),
      },
    });
    created += 1;
  }
  console.log(`Synced ${created} real fixtures (${skipped} skipped — team not mapped).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
