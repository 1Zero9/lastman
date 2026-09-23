export const DEMO_COMPETITION_SLUG = "demo-fundraiser";

export function isDemoCompetition(slug: string) {
  return slug === DEMO_COMPETITION_SLUG;
}
