import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const HISTORY_RETENTION_YEARS = 3;

function anonymisedParticipantData() {
  return {
    name: "Removed entrant",
    email: null,
    phone: null,
    club: null,
    location: null,
    inviteToken: null,
    userId: null,
    anonymisedAt: new Date(),
  };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const historyCutoff = new Date(now);
  historyCutoff.setUTCFullYear(historyCutoff.getUTCFullYear() - HISTORY_RETENTION_YEARS);
  const standardCutoff = new Date(now);
  standardCutoff.setUTCFullYear(standardCutoff.getUTCFullYear() - 1);
  const candidates = await prisma.participant.findMany({
    where: {
      anonymisedAt: null,
      entries: {
        some: {},
        every: { season: { endsAt: { lte: historyCutoff } } },
      },
    },
    select: {
      id: true,
      competitionId: true,
      entries: { select: { season: { select: { endsAt: true } } } },
      consents: { where: { purpose: "LEADERBOARD_HISTORY", revokedAt: null }, select: { id: true } },
    },
    take: 250,
  });

  let anonymised = 0;
  for (const participant of candidates) {
    const hasHistoryConsent = participant.consents.length > 0;
    const cutoff = hasHistoryConsent ? historyCutoff : standardCutoff;
    const latestSeasonEnd = participant.entries.reduce<Date | null>((latest, entry) => {
      const endsAt = entry.season.endsAt;
      return !endsAt || (latest && latest >= endsAt) ? latest : endsAt;
    }, null);
    if (!latestSeasonEnd || latestSeasonEnd > cutoff) continue;

    await prisma.$transaction([
      prisma.participant.update({ where: { id: participant.id }, data: anonymisedParticipantData() }),
      prisma.consentRecord.updateMany({ where: { participantId: participant.id, revokedAt: null }, data: { revokedAt: now } }),
      prisma.auditEvent.create({
        data: {
          competitionId: participant.competitionId,
          type: "participant.retention_anonymised",
          entityType: "Participant",
          entityId: participant.id,
          payload: { retention: hasHistoryConsent ? "leaderboard_history_3_years" : "standard_12_months" },
        },
      }),
    ]);
    anonymised++;
  }

  return NextResponse.json({ checked: candidates.length, anonymised });
}
