import { redirect } from "next/navigation";
import { resolvePublicCompetitionSlug } from "@/lib/competition";
import { requireSignedInUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function SelectionsRedirectPage() {
  await requireSignedInUser();
  const slug = await resolvePublicCompetitionSlug();
  if (slug) redirect(`/c/${slug}/selections`);
  return <div className="rounded-2xl bg-surface p-8 text-text-secondary ring-1 ring-border">No competition is running yet. Check back soon.</div>;
}
