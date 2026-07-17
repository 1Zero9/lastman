import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CompetitionStatus, SeasonStatus } from "@prisma/client";
import { getAdminContext, moneyToCents, requireSignedInUser } from "@/lib/admin";
import { defaultRules, makeSlug } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

async function createCompetition(formData: FormData) {
  "use server";

  const user = await requireSignedInUser();
  const name = String(formData.get("name") ?? "").trim();
  const seasonName = String(formData.get("seasonName") ?? "").trim();
  const currency = String(formData.get("currency") ?? "EUR").toUpperCase();
  const prizePercentage = Number(formData.get("prizePercentage"));

  if (!name || !seasonName || !/^[A-Z]{3}$/.test(currency) || !Number.isInteger(prizePercentage) || prizePercentage < 0 || prizePercentage > 100) {
    throw new Error("Enter a competition name, season name, valid currency and prize allocation.");
  }

  const existingMembership = await prisma.competitionMember.findFirst({ where: { userId: user.id } });
  if (existingMembership) redirect("/admin");

  const baseSlug = makeSlug(name);
  const suffix = crypto.randomUUID().slice(0, 8);
  const slug = `${baseSlug}-${suffix}`;
  const seasonSlug = `${makeSlug(seasonName)}-${suffix}`;
  const entryFeeCents = moneyToCents(formData.get("entryFee"), 1000);

  await prisma.$transaction(async (tx) => {
    const competition = await tx.competition.create({
      data: {
        name,
        slug,
        currency,
        timezone: "Europe/Dublin",
        entryFeeCents,
        prizePercentage,
        fundraisingPercentage: 100 - prizePercentage,
        status: CompetitionStatus.ACTIVE,
      },
    });

    await tx.competitionMember.create({
      data: { competitionId: competition.id, userId: user.id, role: "OWNER" },
    });

    await tx.season.create({
      data: {
        competitionId: competition.id,
        name: seasonName,
        slug: seasonSlug,
        rules: defaultRules,
        status: SeasonStatus.DRAFT,
      },
    });

    await tx.auditEvent.create({
      data: {
        competitionId: competition.id,
        actorId: user.id,
        type: "competition.created",
        entityType: "Competition",
        entityId: competition.id,
        payload: { name, seasonName },
      },
    });
  });

  revalidatePath("/admin");
  redirect("/admin");
}

export default async function CompetitionSetupPage() {
  const user = await requireSignedInUser();
  const hasMembership = await prisma.competitionMember.findFirst({ where: { userId: user.id } });
  if (hasMembership) {
    await getAdminContext();
    redirect("/admin");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin setup</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-text">Create your first competition</h1>
      <p className="mt-3 text-text-secondary">This creates the organisation-independent competition and its initial season. You can configure fixtures, rules and members afterwards.</p>

      <form action={createCompetition} className="mt-8 space-y-6 rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">Competition name</span>
            <input name="name" required placeholder="Last Man Standing" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">First season</span>
            <input name="seasonName" required placeholder="2026/27" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Entry fee</span>
            <input name="entryFee" type="number" min="0" step="0.01" defaultValue="10.00" required className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text">Currency</span>
            <input name="currency" defaultValue="EUR" maxLength={3} required className="w-full rounded-xl border border-border px-4 py-3 uppercase outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-semibold text-text">Prize fund allocation (%)</span>
            <input name="prizePercentage" type="number" min="0" max="100" defaultValue="30" required className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" />
            <span className="mt-1.5 block text-sm text-text-secondary">The remaining percentage is allocated to fundraising.</span>
          </label>
        </div>
        <button className="rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary/90">Create competition</button>
      </form>
    </div>
  );
}
