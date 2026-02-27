import type { GameWeek } from "@/types/lms";

export const gameWeeks: GameWeek[] = [
  {
    id: "GW1",
    label: "Gameweek 1 – Weekend of 27 Feb 2026",
    cutOff: "Thursday 26 February 2026, 6pm",
    fixtures: [
      { id: "f1", home: "Wolves", away: "Aston Villa", date: "Friday 27 February 2026" },
      { id: "f2", home: "Bournemouth", away: "Sunderland", date: "Saturday 28 February 2026" },
      { id: "f3", home: "Brighton", away: "Notts Forest", date: "Saturday 28 February 2026" },
      { id: "f4", home: "Burnley", away: "Brentford", date: "Saturday 28 February 2026" },
      { id: "f5", home: "Liverpool", away: "West Ham", date: "Saturday 28 February 2026" },
      { id: "f6", home: "Newcastle", away: "Everton", date: "Saturday 28 February 2026" },
      { id: "f7", home: "Leeds", away: "Man City", date: "Saturday 28 February 2026" },
      { id: "f8", home: "Fulham", away: "Spurs", date: "Sunday 1 March 2026" },
      { id: "f9", home: "Man United", away: "Crystal Palace", date: "Sunday 1 March 2026" },
      { id: "f10", home: "Arsenal", away: "Chelsea", date: "Sunday 1 March 2026" },
    ],
  },
];
