import type { SelectionCount } from "@/types/lms";

/**
 * GW1 selection counts (Count of GW1 from competition data).
 * Replace or extend when you have more gameweeks.
 */
export const selectionCountsByGw: Record<string, SelectionCount[]> = {
  GW1: [
    { team: "Liverpool", count: 37, gameWeekId: "GW1" },
    { team: "Newcastle", count: 25, gameWeekId: "GW1" },
    { team: "Bournemouth", count: 24, gameWeekId: "GW1" },
    { team: "Villa", count: 21, gameWeekId: "GW1" },
    { team: "Brentford", count: 19, gameWeekId: "GW1" },
    { team: "Man Utd", count: 17, gameWeekId: "GW1" },
    { team: "Man City", count: 16, gameWeekId: "GW1" },
    { team: "Brighton", count: 9, gameWeekId: "GW1" },
    { team: "Fulham", count: 8, gameWeekId: "GW1" },
    { team: "Notts Forest", count: 5, gameWeekId: "GW1" },
    { team: "West Ham", count: 3, gameWeekId: "GW1" },
    { team: "Spurs", count: 2, gameWeekId: "GW1" },
    { team: "Arsenal", count: 2, gameWeekId: "GW1" },
    { team: "Everton", count: 1, gameWeekId: "GW1" },
    { team: "Crystal Palace", count: 1, gameWeekId: "GW1" },
    { team: "Chelsea", count: 1, gameWeekId: "GW1" },
    { team: "Sunderland", count: 1, gameWeekId: "GW1" },
  ],
};

export const gameWeekIds = Object.keys(selectionCountsByGw);
