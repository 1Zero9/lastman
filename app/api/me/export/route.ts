import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const [user, participants] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, displayName: true, createdAt: true },
    }),
    prisma.participant.findMany({
      where: { OR: [{ userId: session.user.id }, { email: session.user.email ?? undefined }], anonymisedAt: null },
      include: {
        competition: { select: { name: true } },
        consents: true,
        payments: { select: { amountCents: true, entryCount: true, status: true, receivedAt: true, createdAt: true } },
        entries: {
          include: {
            season: { select: { name: true } },
            picks: { include: { team: { select: { name: true } }, gameweek: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    account: user,
    competitions: participants.map((participant) => ({
      competition: participant.competition.name,
      name: participant.name,
      email: participant.email,
      phone: participant.phone,
      club: participant.club,
      location: participant.location,
      confirmedAt: participant.confirmedAt,
      consents: participant.consents.map((consent) => ({
        purpose: consent.purpose,
        policyVersion: consent.policyVersion,
        grantedAt: consent.grantedAt,
        revokedAt: consent.revokedAt,
      })),
      payments: participant.payments,
      entries: participant.entries.map((entry) => ({
        season: entry.season.name,
        number: entry.number,
        status: entry.status,
        buyBackCount: entry.buyBackCount,
        picks: entry.picks.map((pick) => ({
          round: pick.gameweek.name,
          team: pick.team.name,
          method: pick.method,
          outcome: pick.outcome,
          submittedAt: pick.submittedAt,
        })),
      })),
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="my-lastman-data.json"',
    },
  });
}
