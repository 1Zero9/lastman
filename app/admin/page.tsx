import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const formatMoney = (cents: number, currency: string) => new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);

async function deleteCompetition(formData: FormData) {
  "use server";

  const { membership, competition } = await getAdminContext();
  if (membership.role !== "OWNER") redirect("/admin?error=Only the owner can delete this fundraiser.");
  const confirmName = String(formData.get("confirmName") ?? "").trim();
  if (confirmName !== competition.name) {
    redirect(`/admin?error=${encodeURIComponent("Type the fundraiser name exactly to confirm deletion.")}`);
  }
  await prisma.competition.delete({ where: { id: competition.id } });
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin/setup");
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { membership, competition } = await getAdminContext();
  const season = await prisma.season.findFirst({ where: { competitionId: competition.id }, orderBy: { createdAt: "desc" } });
  const [participantCount, confirmedPayments] = season
    ? await Promise.all([
        prisma.participant.count({ where: { competitionId: competition.id } }),
        prisma.payment.aggregate({ where: { seasonId: season.id, status: "CONFIRMED" }, _sum: { amountCents: true } }),
      ])
    : [0, { _sum: { amountCents: null } }];
  const raisedCents = confirmedPayments._sum.amountCents ?? 0;
  const prizeFund = Math.round((raisedCents * competition.prizePercentage) / 100);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text">{competition.name}</h1>
        <p className="mt-1 text-text-secondary">{season?.name ?? "No season yet"}</p>
      </div>
      {error && <div className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm font-semibold text-error">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-border"><p className="text-sm text-text-secondary">People</p><p className="mt-2 text-3xl font-bold text-text">{participantCount}</p></div>
        <div className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-border"><p className="text-sm text-text-secondary">Confirmed raised</p><p className="mt-2 text-3xl font-bold text-text">{formatMoney(raisedCents, competition.currency)}</p></div>
        <div className="rounded-2xl bg-primary p-5 text-white shadow-sm"><p className="text-sm text-white/70">Current prize fund</p><p className="mt-2 text-3xl font-bold">{formatMoney(prizeFund, competition.currency)}</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/people" className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border transition hover:border-primary"><h2 className="font-bold text-text">People, entries & payments</h2><p className="mt-2 text-sm text-text-secondary">Add members, record external payments and activate entries.</p></Link>
        <Link href="/admin/schedule" className="rounded-2xl bg-background p-6 ring-1 ring-border transition hover:border-primary"><h2 className="font-bold text-text">Fixtures & gameweeks</h2><p className="mt-2 text-sm text-text-secondary">Create teams, fixtures, deadlines and open the next gameweek.</p></Link>
        <Link href="/admin/results" className="rounded-2xl bg-background p-6 ring-1 ring-border transition hover:border-primary"><h2 className="font-bold text-text">Results & settlement</h2><p className="mt-2 text-sm text-text-secondary">Lock picks, record results and settle the round.</p></Link>
        {membership.role === "OWNER" && (
          <Link href="/admin/setup?duplicate=1" className="rounded-2xl bg-background p-6 ring-1 ring-border transition hover:border-primary"><h2 className="font-bold text-text">Duplicate fundraiser</h2><p className="mt-2 text-sm text-text-secondary">Quick-start a new campaign with these settings. The current fundraiser is archived once the new one is created.</p></Link>
        )}
      </div>
      {membership.role === "OWNER" && (
        <section className="rounded-2xl border-2 border-error/30 bg-error/5 p-6">
          <h2 className="text-lg font-bold text-error">Danger zone</h2>
          <p className="mt-2 text-sm text-text-secondary">Deleting this fundraiser permanently removes every season, entrant, entry, pick and payment record. This cannot be undone. To confirm, type the fundraiser name <span className="font-semibold text-text">{competition.name}</span> below.</p>
          <form action={deleteCompetition} className="mt-4 flex flex-wrap items-center gap-3">
            <input name="confirmName" required autoComplete="off" placeholder="Type the fundraiser name to confirm" className="flex-1 min-w-[240px] rounded-xl border border-error/40 bg-white px-4 py-3 outline-none focus:border-error focus:ring-4 focus:ring-error/15" />
            <button className="rounded-xl bg-error px-5 py-3 font-semibold text-white transition hover:bg-error/90">Delete fundraiser permanently</button>
          </form>
        </section>
      )}
    </div>
  );
}
