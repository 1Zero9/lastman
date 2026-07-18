import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ACTIVE_COMPETITION_COOKIE, getAdminContext } from "@/lib/admin";
import { ensureJoinCode } from "@/lib/competition";
import { prisma } from "@/lib/prisma";

const formatMoney = (cents: number, currency: string) => new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);

const competitionStatusStyles: Record<string, string> = {
  DRAFT: "bg-border text-text-secondary",
  ACTIVE: "bg-success/10 text-success",
  COMPLETED: "bg-info/10 text-info",
  ARCHIVED: "bg-border text-text-secondary",
};

async function setActiveCompetition(formData: FormData) {
  "use server";

  const { user } = await getAdminContext();
  const competitionId = String(formData.get("competitionId") ?? "");
  const membership = await prisma.competitionMember.findFirst({
    where: { userId: user.id, competitionId, role: { in: ["OWNER", "ADMIN"] } },
    select: { id: true },
  });
  if (!membership) redirect("/admin?error=You do not manage that fundraiser.");
  (await cookies()).set(ACTIVE_COMPETITION_COOKIE, competitionId, { path: "/", httpOnly: true, sameSite: "lax" });
  revalidatePath("/admin");
  redirect("/admin");
}

async function archiveCompetition() {
  "use server";

  const { user, membership, competition } = await getAdminContext();
  if (membership.role !== "OWNER") redirect("/admin?error=Only the owner can archive this fundraiser.");
  if (competition.status === "ARCHIVED") redirect("/admin");
  await prisma.$transaction([
    prisma.competition.update({ where: { id: competition.id }, data: { status: "ARCHIVED" } }),
    prisma.auditEvent.create({
      data: {
        competitionId: competition.id,
        actorId: user.id,
        type: "competition.archived",
        entityType: "Competition",
        entityId: competition.id,
        payload: { reason: "manual" },
      },
    }),
  ]);
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

async function deleteCompetition(formData: FormData) {
  "use server";

  const { membership, competition } = await getAdminContext();
  if (membership.role !== "OWNER") redirect("/admin?error=Only the owner can delete this fundraiser.");
  const confirmName = String(formData.get("confirmName") ?? "").trim();
  if (confirmName !== competition.name) {
    redirect(`/admin?error=${encodeURIComponent("Type the fundraiser name exactly to confirm deletion.")}`);
  }
  await prisma.competition.delete({ where: { id: competition.id } });
  (await cookies()).delete(ACTIVE_COMPETITION_COOKIE);
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { membership, competition, memberships } = await getAdminContext();
  const archived = competition.status === "ARCHIVED";
  const joinCode = archived ? competition.joinCode : await ensureJoinCode(competition.id, competition.joinCode);
  const host = (await headers()).get("host") ?? "";
  const joinUrl = joinCode ? `https://${host}/join/${joinCode}` : null;

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Admin</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-text">{competition.name}</h1>
          <p className="mt-1 text-text-secondary">{season?.name ?? "No season yet"}</p>
        </div>
        <Link href="/admin/setup?new=1" className="rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary/90">+ New fundraiser</Link>
      </div>
      {error && <div className="rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm font-semibold text-error">{error}</div>}

      {memberships.length > 1 && (
        <section className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-border">
          <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary">Your fundraisers</h2>
          <div className="mt-3 divide-y divide-border">
            {memberships.map((item) => {
              const current = item.competitionId === competition.id;
              return (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <p className={`font-semibold ${current ? "text-text" : "text-text-secondary"}`}>{item.competition.name}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${competitionStatusStyles[item.competition.status] ?? "bg-border text-text-secondary"}`}>
                      {item.competition.status.toLowerCase()}
                    </span>
                  </div>
                  {current ? (
                    <span className="text-sm font-semibold text-primary">Managing now</span>
                  ) : (
                    <form action={setActiveCompetition}>
                      <input type="hidden" name="competitionId" value={item.competitionId} />
                      <button className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text transition hover:border-primary hover:text-primary">Manage</button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {archived && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text">
          This fundraiser is <span className="font-semibold">archived</span> — it is kept for your records and no longer accepts joins or picks.
        </div>
      )}

      {joinUrl && !archived && (
        <section className="rounded-2xl bg-nav p-6 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-bold">Invite players — share the join link</h2>
              <p className="mt-1 text-sm text-white/70">Anyone with this link can join, reserve entries and pay you directly. Confirm their payment in People &amp; payments to activate them.</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Join code</p>
              <p className="text-3xl font-extrabold tracking-[0.2em] text-accent">{joinCode}</p>
            </div>
          </div>
          <p className="mt-4 select-all rounded-xl bg-white/10 px-4 py-3 font-mono text-sm text-white">{joinUrl}</p>
        </section>
      )}

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
          <Link href={`/admin/setup?duplicate=${competition.id}`} className="rounded-2xl bg-background p-6 ring-1 ring-border transition hover:border-primary"><h2 className="font-bold text-text">Duplicate fundraiser</h2><p className="mt-2 text-sm text-text-secondary">Quick-start a new campaign with these settings. This fundraiser stays as it is.</p></Link>
        )}
      </div>
      {membership.role === "OWNER" && (
        <section className="rounded-2xl border-2 border-error/30 bg-error/5 p-6">
          <h2 className="text-lg font-bold text-error">Danger zone</h2>
          {!archived && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/60 px-4 py-3">
              <p className="text-sm text-text-secondary">Finished with this fundraiser? Archive it — it stays visible in your list for your records but can no longer be changed by players.</p>
              <form action={archiveCompetition}>
                <button className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text transition hover:border-error hover:text-error">Archive fundraiser</button>
              </form>
            </div>
          )}
          <p className="mt-4 text-sm text-text-secondary">Deleting this fundraiser permanently removes every season, entrant, entry, pick and payment record. This cannot be undone. To confirm, type the fundraiser name <span className="font-semibold text-text">{competition.name}</span> below.</p>
          <form action={deleteCompetition} className="mt-4 flex flex-wrap items-center gap-3">
            <input name="confirmName" required autoComplete="off" placeholder="Type the fundraiser name to confirm" className="flex-1 min-w-[240px] rounded-xl border border-error/40 bg-white px-4 py-3 outline-none focus:border-error focus:ring-4 focus:ring-error/15" />
            <button className="rounded-xl bg-error px-5 py-3 font-semibold text-white transition hover:bg-error/90">Delete fundraiser permanently</button>
          </form>
        </section>
      )}
    </div>
  );
}
