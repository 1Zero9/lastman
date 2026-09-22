import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function deleteMyData(formData: FormData) {
  "use server";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/sign-in");
  if (String(formData.get("confirmText") ?? "").trim().toUpperCase() !== "DELETE") {
    throw new Error('Type "DELETE" to confirm removal of your data.');
  }

  const userId = session.user.id;
  const email = session.user.email ?? "";

  await prisma.$transaction(async (tx) => {
    const participants = await tx.participant.findMany({
      where: { OR: [{ userId }, { email: email || undefined }], anonymisedAt: null },
      select: { id: true, competitionId: true },
    });

    for (const participant of participants) {
      await tx.participant.update({
        where: { id: participant.id },
        data: {
          name: "Removed entrant",
          email: null,
          phone: null,
          club: null,
          location: null,
          inviteToken: null,
          userId: null,
          anonymisedAt: new Date(),
        },
      });
      await tx.consentRecord.updateMany({
        where: { participantId: participant.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.dataRequest.create({
        data: { participantId: participant.id, type: "DELETE", status: "COMPLETED", completedAt: new Date() },
      });
      await tx.auditEvent.create({
        data: {
          competitionId: participant.competitionId,
          type: "participant.data_removed",
          entityType: "Participant",
          entityId: participant.id,
        },
      });
    }

    await tx.user.delete({ where: { id: userId } }).catch(() => null);
  });

  redirect("/api/auth/signout");
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/sign-in");

  const participants = await prisma.participant.findMany({
    where: { OR: [{ userId: session.user.id }, { email: session.user.email ?? undefined }], anonymisedAt: null },
    include: {
      competition: { select: { name: true } },
      consents: { where: { revokedAt: null }, select: { purpose: true, policyVersion: true, grantedAt: true } },
      entries: { select: { id: true, status: true } },
    },
  });

  const consentLabels: Record<string, string> = {
    CORE_PII: "Core entry details (name, email, picks)",
    LEADERBOARD_HISTORY: "Keep results for all-time leaderboards",
    MARKETING: "Contact about future fundraisers",
    ANALYTICS: "Product analytics",
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl bg-[radial-gradient(120%_60%_at_50%_-10%,#1c3a2e_0%,#0b1520_55%,#060a10_100%)] p-6 sm:p-8">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-accent">Account</p>
        <h1 className="mt-2 text-2xl font-bold text-white">{session.user.name ?? "Member"}</h1>
        <p className="mt-1 text-white/60">{session.user.email}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-bold text-white">Your competitions &amp; consents</h2>
        {participants.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">No competition entries are linked to this account yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {participants.map((participant) => (
              <div key={participant.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">{participant.competition.name}</p>
                <p className="mt-1 text-sm text-white/50">{participant.entries.length} {participant.entries.length === 1 ? "entry" : "entries"}</p>
                <ul className="mt-2 space-y-1 text-sm text-white/50">
                  {participant.consents.length === 0 && <li>No consents recorded yet — confirm your entry via your organiser&apos;s link.</li>}
                  {participant.consents.map((consent) => (
                    <li key={consent.purpose} className="text-accent">✓ <span className="text-white/70">{consentLabels[consent.purpose] ?? consent.purpose}</span> <span className="text-xs text-white/40">(v{consent.policyVersion})</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-bold text-white">Your data</h2>
        <p className="mt-2 text-sm text-white/60">
          Download everything we hold about you, or remove your personal data permanently. Removal anonymises your
          entries (the competition maths stays intact) and deletes your sign-in account. See the{" "}
          <Link href="/privacy" className="font-semibold text-accent underline">privacy policy</Link>.
        </p>
        <a href="/api/me/export" className="mt-4 inline-flex rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:border-accent">
          Download my data (JSON)
        </a>
        <form action={deleteMyData} className="mt-6 space-y-3 border-t border-white/10 pt-5">
          <p className="text-sm font-semibold text-red-400">Delete my data &amp; account</p>
          <p className="text-sm text-white/50">This cannot be undone. Type <span className="font-mono font-semibold text-white">DELETE</span> to confirm.</p>
          <div className="flex gap-3">
            <input name="confirmText" placeholder="DELETE" className="w-32 rounded-xl border border-error/40 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-error" />
            <button className="rounded-xl bg-error px-4 py-2.5 text-sm font-semibold text-white">Permanently delete</button>
          </div>
        </form>
      </div>
    </div>
  );
}
