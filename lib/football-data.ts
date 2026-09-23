const BASE_URL = "https://api.football-data.org/v4";

export type FootballDataTeam = {
  id: number;
  name: string;
  shortName: string;
  tla: string;
};

export type FootballDataMatch = {
  id: number;
  utcDate: string;
  matchday: number;
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | "SUSPENDED" | "CANCELLED";
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  score: { fullTime: { home: number | null; away: number | null } };
};

function getApiKey() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("FOOTBALL_DATA_API_KEY is not configured.");
  return key;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { "X-Auth-Token": getApiKey() } });
  if (!res.ok) throw new Error(`football-data.org request failed (${res.status}): ${path}`);
  return res.json() as Promise<T>;
}

export async function getCompetitionTeams(competitionCode: string, season: string) {
  const data = await get<{ teams: FootballDataTeam[] }>(`/competitions/${competitionCode}/teams?season=${season}`);
  return data.teams;
}

export async function getCompetitionMatches(competitionCode: string, season: string) {
  const data = await get<{ matches: FootballDataMatch[] }>(`/competitions/${competitionCode}/matches?season=${season}`);
  return data.matches;
}

