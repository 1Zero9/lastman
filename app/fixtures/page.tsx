import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { resolvePublicCompetitionSlug } from "@/lib/competition";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function FixturesRedirectPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/demo");
  const slug = await resolvePublicCompetitionSlug();
  if (slug) redirect(`/c/${slug}/fixtures`);
  return <div className="rounded-2xl bg-surface p-8 text-text-secondary ring-1 ring-border">No competition is running yet. Check back soon.</div>;
}
