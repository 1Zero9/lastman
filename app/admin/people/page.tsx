import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getAdminContext } from "@/lib/admin";
import { buyBackEntry } from "@/lib/engine";
import { prisma } from "@/lib/prisma";

async function createParticipant(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();
  const season = await prisma.season.findFirstOrThrow({ where: { competitionId: competition.id }, orderBy: { createdAt: "desc" } });
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const entryCount = Number(formData.get("entryCount"));
  const sellerId = String(formData.get("sellerId") ?? "") || null;
  const reference = String(formData.get("reference") ?? "").trim() || null;

  if (!name || !Number.isInteger(entryCount) || entryCount < 1 || entryCount > 50) {
    throw new Error("Enter a name and between 1 and 50 entries.");
  }
  if (sellerId) await prisma.seller.findFirstOrThrow({ where: { id: sellerId, competitionId: competition.id } });

  await prisma.$transaction(async (tx) => {
    const participant = await tx.participant.create({ data: { competitionId: competition.id, name, email, phone, sellerId, inviteToken: crypto.randomUUID() } });
    await tx.entry.createMany({
      data: Array.from({ length: entryCount }, (_, index) => ({
        seasonId: season.id,
        participantId: participant.id,
        number: index + 1,
        status: "PENDING_PAYMENT" as const,
      })),
    });
    await tx.payment.create({
      data: {
        seasonId: season.id,
        participantId: participant.id,
        entryCount,
        amountCents: competition.entryFeeCents * entryCount,
        status: "PENDING",
        reference,
      },
    });
    await tx.auditEvent.create({
      data: {
        competitionId: competition.id,
        actorId: user.id,
        type: "participant.created",
        entityType: "Participant",
        entityId: participant.id,
        payload: { entryCount, name },
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/people");
}

async function createSeller(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();
  const name = String(formData.get("sellerName") ?? "").trim();
  const minTarget = Number(formData.get("minTarget"));
  if (!name || !Number.isInteger(minTarget) || minTarget < 0 || minTarget > 100) {
    throw new Error("Enter a seller name and a minimum target between 0 and 100.");
  }
  const seller = await prisma.seller.upsert({
    where: { competitionId_name: { competitionId: competition.id, name } },
    update: { minTarget },
    create: { competitionId: competition.id, name, minTarget },
  });
  await prisma.auditEvent.create({
    data: { competitionId: competition.id, actorId: user.id, type: "seller.saved", entityType: "Seller", entityId: seller.id, payload: { name, minTarget } },
  });
  revalidatePath("/admin/people");
}

async function updatePayment(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();
  const paymentId = String(formData.get("paymentId") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!paymentId || !["confirm", "reject"].includes(action)) throw new Error("Invalid payment action.");

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, season: { competitionId: competition.id }, status: "PENDING" },
  });
  if (!payment) throw new Error("Payment was not found or has already been processed.");

  await prisma.$transaction(async (tx) => {
    const status = action === "confirm" ? "CONFIRMED" : "REJECTED";
    await tx.payment.update({ where: { id: payment.id }, data: { status, receivedAt: action === "confirm" ? new Date() : null } });

    if (action === "confirm") {
      const entries = await tx.entry.findMany({
        where: { seasonId: payment.seasonId, participantId: payment.participantId, status: "PENDING_PAYMENT" },
        orderBy: { number: "asc" },
        take: payment.entryCount,
        select: { id: true },
      });
      if (entries.length !== payment.entryCount) throw new Error("The expected pending entries could not be found.");
      await tx.entry.updateMany({ where: { id: { in: entries.map((entry) => entry.id) } }, data: { status: "ACTIVE" } });
    }

    await tx.auditEvent.create({
      data: {
        competitionId: competition.id,
        actorId: user.id,
        type: action === "confirm" ? "payment.confirmed" : "payment.rejected",
        entityType: "Payment",
        entityId: payment.id,
        payload: { entryCount: payment.entryCount, amountCents: payment.amountCents },
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/people");
}

async function recordBuyBack(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();
  const entryId = String(formData.get("entryId") ?? "");
  if (!entryId) throw new Error("An entry is required.");
  await prisma.$transaction((tx) => buyBackEntry(tx, entryId, competition.id, user.id));
  revalidatePath("/admin/people");
  revalidatePath("/standings");
  revalidatePath("/my-entries");
}

async function approveParticipant(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();
  const participantId = String(formData.get("participantId") ?? "");
  const approve = String(formData.get("action") ?? "") === "approve";
  const participant = await prisma.participant.findFirst({ where: { id: participantId, competitionId: competition.id, anonymisedAt: null } });
  if (!participant) throw new Error("Participant not found.");
  if (approve && !participant.confirmedAt) throw new Error("The player must confirm their entry before approval.");
  await prisma.$transaction([
    prisma.participant.update({ where: { id: participant.id }, data: { approvedAt: approve ? new Date() : null } }),
    prisma.auditEvent.create({
      data: {
        competitionId: competition.id,
        actorId: user.id,
        type: approve ? "participant.approved" : "participant.approval_revoked",
        entityType: "Participant",
        entityId: participant.id,
      },
    }),
  ]);
  revalidatePath("/admin/people");
  revalidatePath("/my-entries");
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);
}

const entryBadge: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success",
  PENDING_PAYMENT: "bg-warning/10 text-warning",
  ELIMINATED: "bg-error/10 text-error",
  WINNER: "bg-accent/20 text-nav",
  VOID: "bg-border text-text-secondary",
};

export default async function PeoplePage() {
  const { competition } = await getAdminContext();
  const season = await prisma.season.findFirstOrThrow({ where: { competitionId: competition.id }, orderBy: { createdAt: "desc" } });
  const requestHeaders = await headers();
  const baseUrl = `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${requestHeaders.get("host") ?? ""}`;
  const buyBackEnabled = Boolean((season.rules as { buyBack?: { enabled?: boolean } }).buyBack?.enabled);
  const [participants, payments, sellers] = await Promise.all([
    prisma.participant.findMany({
      where: { competitionId: competition.id },
      include: { entries: { where: { seasonId: season.id }, orderBy: { number: "asc" } }, seller: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { seasonId: season.id },
      include: { participant: { select: { name: true, sellerId: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.seller.findMany({ where: { competitionId: competition.id }, orderBy: { name: "asc" } }),
  ]);

  const pendingPayments = payments.filter((payment) => payment.status === "PENDING");

  const sellerStats = new Map<string | null, { paid: number; unpaid: number }>();
  let totalSoldCents = 0;
  let raisedCents = 0;
  for (const payment of payments) {
    if (payment.status !== "PENDING" && payment.status !== "CONFIRMED") continue;
    totalSoldCents += payment.amountCents;
    const key = payment.participant.sellerId ?? null;
    const stat = sellerStats.get(key) ?? { paid: 0, unpaid: 0 };
    if (payment.status === "CONFIRMED") {
      stat.paid += payment.entryCount;
      raisedCents += payment.amountCents;
    } else {
      stat.unpaid += payment.entryCount;
    }
    sellerStats.set(key, stat);
  }
  const prizeCents = Math.round((raisedCents * competition.prizePercentage) / 100);
  const trackerRows = [
    ...sellers.map((seller) => ({ key: seller.id, name: seller.name, minTarget: seller.minTarget, ...(sellerStats.get(seller.id) ?? { paid: 0, unpaid: 0 }) })),
    ...(sellerStats.has(null) ? [{ key: "unassigned", name: "Unassigned", minTarget: 0, ...sellerStats.get(null)! }] : []),
  ].sort((a, b) => b.paid + b.unpaid - (a.paid + a.unpaid) || a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{competition.name} · {season.name}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text">People, entries & payments</h1>
        <p className="mt-2 text-text-secondary">Payments happen outside the platform. Confirming one activates the associated pending entries.</p>
      </div>

      <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <h2 className="text-lg font-bold text-text">Fundraising tracker</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-background p-4"><p className="text-sm text-text-secondary">Total sold (incl. unpaid)</p><p className="mt-1 text-2xl font-bold text-text">{formatMoney(totalSoldCents, competition.currency)}</p></div>
          <div className="rounded-xl bg-accent/15 p-4"><p className="text-sm text-text-secondary">Raised so far ({competition.fundraisingPercentage}% club share)</p><p className="mt-1 text-2xl font-bold text-text">{formatMoney(raisedCents - prizeCents, competition.currency)}</p></div>
          <div className="rounded-xl bg-accent/15 p-4"><p className="text-sm text-text-secondary">Prize money so far ({competition.prizePercentage}%)</p><p className="mt-1 text-2xl font-bold text-text">{formatMoney(prizeCents, competition.currency)}</p></div>
        </div>
        {trackerRows.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">Add your sellers (players and coach reps) below, then attribute each entrant to whoever sold or collected their entry.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead><tr className="border-b border-border text-text-secondary"><th className="py-2 pr-4 font-semibold">Sold by</th><th className="py-2 pr-4 font-semibold">To sell minimum</th><th className="py-2 pr-4 font-semibold">Sold #</th><th className="py-2 pr-4 font-semibold">Paid #</th><th className="py-2 font-semibold">Unpaid #</th></tr></thead>
              <tbody>
                {trackerRows.map((row) => (
                  <tr key={row.key} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-semibold text-text">{row.name}</td>
                    <td className="py-2 pr-4 text-text-secondary">{row.minTarget || "—"}</td>
                    <td className={`py-2 pr-4 font-semibold ${row.paid + row.unpaid >= row.minTarget && row.paid + row.unpaid > 0 ? "text-success" : "text-error"}`}>{row.paid + row.unpaid}</td>
                    <td className="py-2 pr-4 text-text">{row.paid}</td>
                    <td className={`py-2 ${row.unpaid > 0 ? "font-semibold text-warning" : "text-text-secondary"}`}>{row.unpaid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form action={createSeller} className="mt-5 flex flex-wrap items-end gap-3 border-t border-border pt-5">
          <label className="block flex-1 min-w-[200px]"><span className="mb-1.5 block text-sm font-semibold text-text">Seller / coach rep name</span><input name="sellerName" required placeholder="e.g. Dave" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></label>
          <label className="block w-36"><span className="mb-1.5 block text-sm font-semibold text-text">To sell minimum</span><input name="minTarget" type="number" min="0" max="100" defaultValue="5" required className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></label>
          <button className="rounded-xl bg-nav px-5 py-3 font-semibold text-white">Add seller</button>
        </form>
      </section>

      <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <h2 className="text-lg font-bold text-text">Add a person</h2>
        <form action={createParticipant} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-text">Name</span><input name="name" required className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-text">Email (optional)</span><input name="email" type="email" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-text">Phone (optional)</span><input name="phone" type="tel" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-text">Entries</span><input name="entryCount" type="number" min="1" max="50" defaultValue="1" required className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-text">Sold / collected by</span><select name="sellerId" className="w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"><option value="">Not assigned</option>{sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-text">Payment reference (optional)</span><input name="reference" placeholder="e.g. Revolut ref / payer name" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></label>
          <div className="flex items-end"><p className="pb-3 text-sm text-text-secondary">Creates a pending record for {formatMoney(competition.entryFeeCents, competition.currency)} per entry. Ask Revolut payers to include the entrant&apos;s name as the reference.</p></div>
          <div className="sm:col-span-2"><button className="rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary/90">Add person and pending entries</button></div>
        </form>
      </section>

      <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <div className="flex items-baseline justify-between gap-4"><h2 className="text-lg font-bold text-text">Awaiting payment</h2><span className="text-sm text-text-secondary">{pendingPayments.length} pending</span></div>
        {pendingPayments.length === 0 ? <p className="mt-4 text-sm text-text-secondary">No payments are awaiting confirmation.</p> : <div className="mt-4 space-y-3">{pendingPayments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background p-4"><div><p className="font-semibold text-text">{payment.participant.name}</p><p className="text-sm text-text-secondary">{payment.entryCount} {payment.entryCount === 1 ? "entry" : "entries"} · {formatMoney(payment.amountCents, competition.currency)}{payment.reference ? ` · ref: ${payment.reference}` : ""}</p></div><div className="flex gap-2"><form action={updatePayment}><input type="hidden" name="paymentId" value={payment.id} /><input type="hidden" name="action" value="reject" /><button className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text">Reject</button></form><form action={updatePayment}><input type="hidden" name="paymentId" value={payment.id} /><input type="hidden" name="action" value="confirm" /><button className="rounded-lg bg-success px-3 py-2 text-sm font-semibold text-white">Confirm payment</button></form></div></div>)}</div>}
      </section>

      <section className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-border">
        <div className="border-b border-border px-6 py-5"><h2 className="text-lg font-bold text-text">People and entries</h2></div>
        {participants.length === 0 ? <p className="px-6 py-8 text-sm text-text-secondary">No people added yet.</p> : <div className="divide-y divide-border">{participants.map((participant) => <div key={participant.id} className="px-6 py-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><div><p className="font-semibold text-text">{participant.name}{participant.anonymisedAt ? " (removed)" : ""}</p>{participant.email && <p className="text-sm text-text-secondary">{participant.email}</p>}{participant.seller && <p className="text-xs text-text-secondary">Sold by {participant.seller.name}</p>}</div><div className="flex flex-wrap items-center gap-2">{participant.entries.map((entry) => <span key={entry.id} className="flex items-center gap-1"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entryBadge[entry.status] ?? "bg-border text-text-secondary"}`}>#{entry.number} · {entry.status.toLowerCase().replace("_", " ")}{entry.buyBackCount > 0 ? " · bought back" : ""}</span>{buyBackEnabled && entry.status === "ELIMINATED" && <form action={recordBuyBack}><input type="hidden" name="entryId" value={entry.id} /><button className="rounded-lg bg-nav px-2.5 py-1 text-xs font-semibold text-white" title={`Record an offline buy-back payment of ${formatMoney(competition.entryFeeCents, competition.currency)}`}>Buy back</button></form>}</span>)}</div></div>{!participant.anonymisedAt && (participant.confirmedAt ? <div className="mt-2 flex flex-wrap items-center gap-3"><p className="text-xs font-semibold text-success">Confirmed by entrant on {participant.confirmedAt.toLocaleDateString("en-IE")}</p><form action={approveParticipant} className="flex items-center gap-2"><input type="hidden" name="participantId" value={participant.id} /><input type="hidden" name="action" value={participant.approvedAt ? "revoke" : "approve"} />{participant.approvedAt ? <><span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">✓ Player approved {participant.approvedAt.toLocaleDateString("en-IE")}</span><button className="text-xs font-semibold text-text-secondary underline" title="Revoke approval">undo</button></> : <button className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-white" title="Tick to approve this player — they will get the club welcome">Approve player</button>}</form></div> : participant.inviteToken ? <p className="mt-2 text-xs text-text-secondary">Awaiting confirmation — share this link: <code className="select-all rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-text">{baseUrl}/confirm/{participant.inviteToken}</code></p> : null)}</div>)}</div>}
      </section>
    </div>
  );
}
