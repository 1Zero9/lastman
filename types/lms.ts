export interface Fixture {
  id: string;
  home: string;
  away: string;
  date: string;
  kickoff?: string;
}

export interface GameWeek {
  id: string;
  label: string;
  fixtures: Fixture[];
  cutOff: string;
}

export interface Entry {
  id: number;
  entrantName: string;
  playerName: string;
  picks: Record<string, string>;
  status: "active" | "eliminated";
  eliminatedInGw?: string;
}

export type EntryStatus = Entry["status"];

export interface SelectionCount {
  team: string;
  count: number;
  gameWeekId: string;
}
