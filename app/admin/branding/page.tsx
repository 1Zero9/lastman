import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin";
import { detectClubColor } from "@/lib/club-theme";
import { prisma } from "@/lib/prisma";

function fail(message: string): never {
  redirect(`/admin/branding?error=${encodeURIComponent(message)}`);
}

async function updateBranding(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();

  const clubName = String(formData.get("clubName") ?? "").trim() || null;
  const clubWebsiteRaw = String(formData.get("clubWebsite") ?? "").trim();
  const clubWebsite = clubWebsiteRaw ? (clubWebsiteRaw.startsWith("http") ? clubWebsiteRaw : `https://${clubWebsiteRaw}`) : null;
  const clubLogoUrlRaw = String(formData.get("clubLogoUrl") ?? "").trim();
  if (clubLogoUrlRaw && !/^https?:\/\/.+/.test(clubLogoUrlRaw)) fail("The club logo must be a full image URL starting with http:// or https://.");
  const clubLogoUrl = clubLogoUrlRaw || null;
  const clubColorRaw = String(formData.get("clubColor") ?? "").trim();
  let clubColor = /^#[0-9a-fA-F]{6}$/.test(clubColorRaw) ? clubColorRaw : null;
  if (clubWebsite && formData.get("autoTheme") === "on") {
    clubColor = (await detectClubColor(clubWebsite)) ?? clubColor;
  }
  const description = String(formData.get("description") ?? "").trim() || null;
  const welcomeMessage = String(formData.get("welcomeMessage") ?? "").trim() || null;

  await prisma.$transaction([
    prisma.competition.update({
      where: { id: competition.id },
      data: { clubName, clubWebsite, clubLogoUrl, clubColor, description, welcomeMessage },
    }),
    prisma.auditEvent.create({
      data: {
        competitionId: competition.id,
        actorId: user.id,
        type: "competition.branding_updated",
        entityType: "Competition",
        entityId: competition.id,
        payload: { clubName, clubWebsite, hasLogo: Boolean(clubLogoUrl) },
      },
    }),
  ]);

  revalidatePath("/admin/branding");
  revalidatePath("/admin");
  revalidatePath("/my-entries");
  if (competition.joinCode) revalidatePath(`/join/${competition.joinCode}`);
  redirect("/admin/branding?saved=1");
}

export default async function BrandingPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { error, saved } = await searchParams;
  const { competition } = await getAdminContext();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text">Club branding &amp; details</h1>
        <p className="mt-2 text-text-secondary">What players see when they join and while they play — your club name, logo, website, and the story behind the fundraiser.</p>
      </div>

      {error && <div className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm font-semibold text-error">{error}</div>}
      {saved && <div className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success">Saved — players will see the update next time they load a page.</div>}

      <form action={updateBranding} className="space-y-6 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Club name</span>
            <input name="clubName" defaultValue={competition.clubName ?? undefined} placeholder="River Valley Rangers" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Club website</span>
            <input name="clubWebsite" type="text" defaultValue={competition.clubWebsite ?? undefined} placeholder="www.yourclub.ie" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">Club logo URL</span>
            <input name="clubLogoUrl" type="text" defaultValue={competition.clubLogoUrl ?? undefined} placeholder="https://yourclub.ie/logo.png" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
            <span className="mt-1.5 block text-sm text-text-secondary">Paste a link to an image already hosted somewhere (your club site, a shared drive link, etc.) — square logos on a plain background work best.</span>
            {competition.clubLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={competition.clubLogoUrl} alt={`${competition.clubName ?? competition.name} logo preview`} className="mt-3 h-16 w-16 rounded-xl border border-border object-contain bg-white p-1" />
            )}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Club colour</span>
            <input name="clubColor" type="color" defaultValue={competition.clubColor ?? "#27AE60"} className="h-[50px] w-full rounded-xl border border-border px-2 py-1" />
          </label>
          <label className="flex items-center gap-3">
            <input name="autoTheme" type="checkbox" className="h-5 w-5 rounded border-border accent-primary" />
            <span className="text-sm text-text">Re-detect from the club website</span>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">About this fundraiser</span>
            <textarea name="description" rows={4} defaultValue={competition.description ?? undefined} placeholder="Why we're running this, what the money's for, anything a new player should know before they join." className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
            <span className="mt-1.5 block text-sm text-text-secondary">Shown to anyone looking at the join page — this is your pitch.</span>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">Welcome message</span>
            <textarea name="welcomeMessage" rows={2} defaultValue={competition.welcomeMessage ?? undefined} placeholder="Thanks for backing the club — best of luck!" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
            <span className="mt-1.5 block text-sm text-text-secondary">Shown once, privately, to approved players in a welcome popup — shorter and more personal than the fundraiser description above.</span>
          </label>
        </div>
        <button className="rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary/90">Save changes</button>
      </form>
    </div>
  );
}
