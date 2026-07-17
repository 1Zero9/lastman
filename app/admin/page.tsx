import Link from "next/link";
import { getAdminContext } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const formatMoney = (cents: number, currency: string) => new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);

export default async function AdminPage() {
  const { competition } = await getAdminContext();
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-border"><p className="text-sm text-text-secondary">People</p><p className="mt-2 text-3xl font-bold text-text">{participantCount}</p></div>
        <div className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-border"><p className="text-sm text-text-secondary">Confirmed raised</p><p className="mt-2 text-3xl font-bold text-text">{formatMoney(raisedCents, competition.currency)}</p></div>
        <div className="rounded-2xl bg-primary p-5 text-white shadow-sm"><p className="text-sm text-white/70">Current prize fund</p><p className="mt-2 text-3xl font-bold">{formatMoney(prizeFund, competition.currency)}</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/people" className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border transition hover:border-primary"><h2 className="font-bold text-text">People, entries & payments</h2><p className="mt-2 text-sm text-text-secondary">Add members, record external payments and activate entries.</p></Link>
        <Link href="/admin/schedule" className="rounded-2xl bg-background p-6 ring-1 ring-border transition hover:border-primary"><h2 className="font-bold text-text">Fixtures & gameweeks</h2><p className="mt-2 text-sm text-text-secondary">Create teams, fixtures, deadlines and open the next gameweek.</p></Link>
        <Link href="/admin/results" className="rounded-2xl bg-background p-6 ring-1 ring-border transition hover:border-primary"><h2 className="font-bold text-text">Results & settlement</h2><p className="mt-2 text-sm text-text-secondary">Lock picks, record results and settle the round.</p></Link>
      </div>
    </div>
  );
}
