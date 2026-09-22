import { formatInTimeZone } from "date-fns-tz";
import { NextRequest, NextResponse } from "next/server";
import { sendPickReminderEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

// Runs hourly alongside lock-gameweeks. Reminds an entry once per gameweek — no pick yet, deadline
// inside the next 24h — and dedupes via an AuditEvent so the same entry never gets nudged twice for
// the same round even though this fires every hour through that whole window.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const appUrl = `https://${request.headers.get("host") ?? "lastman.1zero9.com"}`;

  const openGameweeks = await prisma.gameweek.findMany({
    where: { status: "OPEN", deadlineAt: { gt: now, lte: soon } },
    include: { season: { include: { competition: true } } },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const gameweek of openGameweeks) {
    const entries = await prisma.entry.findMany({
      where: {
        status: "ACTIVE",
        seasonId: gameweek.seasonId,
        picks: { none: { gameweekId: gameweek.id } },
        participant: { email: { not: null }, anonymisedAt: null },
      },
      include: { participant: true },
    });

    for (const entry of entries) {
      const alreadyReminded = await prisma.auditEvent.findFirst({
        where: { type: "reminder.pick_due", entityType: "Entry", entityId: entry.id, payload: { equals: { gameweekId: gameweek.id } } },
      });
      if (alreadyReminded) { skipped++; continue; }

      const result = await sendPickReminderEmail({
        to: entry.participant.email!,
        playerName: entry.participant.name,
        competitionName: gameweek.season.competition.name,
        clubName: gameweek.season.competition.clubName,
        gameweekName: gameweek.name,
        deadlineLabel: formatInTimeZone(gameweek.deadlineAt, gameweek.season.competition.timezone, "EEE d MMM, HH:mm zzz"),
        entryNumber: entry.number,
        appUrl,
      });

      if (result.sent) {
        sent++;
        await prisma.auditEvent.create({
          data: { competitionId: gameweek.season.competitionId, type: "reminder.pick_due", entityType: "Entry", entityId: entry.id, payload: { gameweekId: gameweek.id } },
        });
      } else {
        errors.push(`entry ${entry.id}: ${result.reason}`);
      }
    }
  }

  return NextResponse.json({ gameweeksChecked: openGameweeks.length, sent, skipped, errors });
}
