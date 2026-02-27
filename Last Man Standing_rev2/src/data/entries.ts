import type { Entry } from "@/types/lms";

const COORDINATORS = [
  "Ethan Stanley",
  "Nico Garcia",
  "Ellie Byrne",
  "Bobby",
  "Daniel Tang",
  "Liam Monaghan",
  "Conor O Sullivan",
  "Aidan O Sullivan",
  "Luke O Connor",
  "Ollie",
  "Dave O Connor",
  "Alex",
];

/**
 * Build 192 entries matching GW1 selection counts.
 * Known eliminated (red in PDF): Marie Stanley/Brentford, Joe Stanley/Notts Forest,
 * Eamon Hourigan #1/Fulham, Eamon Hourigan #2/Newcastle, Barry O Sullvian/Brentford.
 * Replace with full CSV/JSON export when available.
 */
function buildEntries(): Entry[] {
  const teamCounts: Record<string, number> = {
    Liverpool: 37,
    Newcastle: 25,
    Bournemouth: 24,
    Villa: 21,
    Brentford: 19,
    "Man Utd": 17,
    "Man City": 16,
    Brighton: 9,
    Fulham: 8,
    "Notts Forest": 5,
    "West Ham": 3,
    Spurs: 2,
    Arsenal: 2,
    Everton: 1,
    "Crystal Palace": 1,
    Chelsea: 1,
    Sunderland: 1,
  };

  const eliminated: Array<{ entrantName: string; playerName: string; team: string }> = [
    { entrantName: "Marie Stanley", playerName: "Ethan Stanley", team: "Brentford" },
    { entrantName: "Joe Stanley", playerName: "Ethan Stanley", team: "Notts Forest" },
    { entrantName: "Eamon Hourigan #1", playerName: "Ethan Stanley", team: "Fulham" },
    { entrantName: "Eamon Hourigan #2", playerName: "Ethan Stanley", team: "Newcastle" },
    { entrantName: "Barry O Sullvian", playerName: "Aidan O Sullivan", team: "Brentford" },
  ];

  const entries: Entry[] = [];
  let id = 1;
  let coordIndex = 0;
  let genericEntrantNum = 0;

  for (const [team, count] of Object.entries(teamCounts)) {
    const elimForTeam = eliminated.filter((e) => e.team === team);
    let elimUsed = 0;
    for (let i = 0; i < count; i++) {
      const isEliminated = elimForTeam[elimUsed];
      genericEntrantNum += 1;
      entries.push({
        id: id++,
        entrantName: isEliminated
          ? isEliminated.entrantName
          : `Entrant ${genericEntrantNum}`,
        playerName: isEliminated ? isEliminated.playerName : COORDINATORS[coordIndex % COORDINATORS.length],
        picks: { GW1: team },
        status: isEliminated ? "eliminated" : "active",
        eliminatedInGw: isEliminated ? "GW1" : undefined,
      });
      if (isEliminated) elimUsed++;
      else coordIndex++;
    }
  }

  return entries.sort((a, b) => a.id - b.id);
}

export const entries: Entry[] = buildEntries();

export const activeCount = entries.filter((e) => e.status === "active").length;
export const eliminatedCount = entries.filter((e) => e.status === "eliminated").length;
