export const defaultRules = {
  pickFrequency: "one_team_per_gameweek",
  noTeamRepeats: true,
  restrictedTeamGroup: [],
  autopick: {
    enabled: true,
    method: "most_popular_eligible_team",
    tieBreak: ["earliest_kickoff", "alphabetical"],
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
