import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

async function createParticipant(formData: FormData) {
  "use server";

  const { user, competition } = await getAdminContext();
  const season = await prisma.season.findFirstOrThrow({ where: { competitionId: competition.id }, orderBy: { createdAt: "desc" } });
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const entryCount = Number(formData.get("entryCount"));

  if (!name || !Number.isInteger(entryCount) || entryCount < 1 || entryCount > 50) {
    throw new Error("Enter a name and between 1 and 50 entries.");
  }

  await prisma.$transaction(async (tx) => {
    const participant = await tx.participant.create({ data: { competitionId: competition.id, name, email, phone } });
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

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);
}

export default async function PeoplePage() {
  const { competition } = await getAdminContext();
  const season = await prisma.season.findFirstOrThrow({ where: { competitionId: competition.id }, orderBy: { createdAt: "desc" } });
  const [participants, payments] = await Promise.all([
    prisma.participant.findMany({
      where: { competitionId: competition.id },
      include: { entries: { where: { seasonId: season.id }, orderBy: { number: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { seasonId: season.id },
      include: { participant: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const pendingPayments = payments.filter((payment) => payment.status === "PENDING");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{competition.name} · {season.name}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text">People, entries & payments</h1>
        <p className="mt-2 text-text-secondary">Payments happen outside the platform. Confirming one activates the associated pending entries.</p>
      </div>

      <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <h2 className="text-lg font-bold text-text">Add a person</h2>
        <form action={createParticipant} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-text">Name</span><input name="name" required className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-text">Email (optional)</span><input name="email" type="email" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-text">Phone (optional)</span><input name="phone" type="tel" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-text">Entries</span><input name="entryCount" type="number" min="1" max="50" defaultValue="1" required className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /></label>
          <div className="flex items-end"><p className="pb-3 text-sm text-text-secondary">Creates a pending record for {formatMoney(competition.entryFeeCents, competition.currency)} per entry.</p></div>
          <div className="sm:col-span-2"><button className="rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary/90">Add person and pending entries</button></div>
        </form>
      </section>

      <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <div className="flex items-baseline justify-between gap-4"><h2 className="text-lg font-bold text-text">Awaiting payment</h2><span className="text-sm text-text-secondary">{pendingPayments.length} pending</span></div>
        {pendingPayments.length === 0 ? <p className="mt-4 text-sm text-text-secondary">No payments are awaiting confirmation.</p> : <div className="mt-4 space-y-3">{pendingPayments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background p-4"><div><p className="font-semibold text-text">{payment.participant.name}</p><p className="text-sm text-text-secondary">{payment.entryCount} {payment.entryCount === 1 ? "entry" : "entries"} · {formatMoney(payment.amountCents, competition.currency)}</p></div><div className="flex gap-2"><form action={updatePayment}><input type="hidden" name="paymentId" value={payment.id} /><input type="hidden" name="action" value="reject" /><button className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text">Reject</button></form><form action={updatePayment}><input type="hidden" name="paymentId" value={payment.id} /><input type="hidden" name="action" value="confirm" /><button className="rounded-lg bg-success px-3 py-2 text-sm font-semibold text-white">Confirm payment</button></form></div></div>)}</div>}
      </section>

      <section className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-border">
        <div className="border-b border-border px-6 py-5"><h2 className="text-lg font-bold text-text">People and entries</h2></div>
        {participants.length === 0 ? <p className="px-6 py-8 text-sm text-text-secondary">No people added yet.</p> : <div className="divide-y divide-border">{participants.map((participant) => <div key={participant.id} className="px-6 py-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><div><p className="font-semibold text-text">{participant.name}</p>{participant.email && <p className="text-sm text-text-secondary">{participant.email}</p>}</div><div className="flex flex-wrap gap-2">{participant.entries.map((entry) => <span key={entry.id} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.status === "ACTIVE" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>#{entry.number} · {entry.status === "ACTIVE" ? "Active" : "Payment pending"}</span>)}</div></div></div>)}</div>}
      </section>
    </div>
  );
}
