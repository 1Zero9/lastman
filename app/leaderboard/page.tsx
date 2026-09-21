import { redirect } from "next/navigation";
import { resolvePublicCompetitionSlug } from "@/lib/competition";

export const dynamic = "force-dynamic";

export default async function LeaderboardRedirectPage() {
  const slug = await resolvePublicCompetitionSlug();
  if (slug) redirect(`/c/${slug}/leaderboard`);
  return <div className="rounded-2xl bg-surface p-8 text-text-secondary ring-1 ring-border">No competition is running yet. Check back soon.</div>;
}
