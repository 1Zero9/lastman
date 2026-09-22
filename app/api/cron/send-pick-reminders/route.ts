import { formatInTimeZone } from "date-fns-tz";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { sendPickReminderEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

// Runs hourly alongside lock-gameweeks. A unique ReminderDelivery claim means
// overlapping runs cannot both send the same entry/gameweek email; Resend gets
// the stable entry/gameweek key as its idempotency key to make uncertain retries safe too.
async function claimReminder(entryId: string, gameweekId: string) {
  try {
    return await prisma.reminderDelivery.create({ data: { entryId, gameweekId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
    throw error;
  }
}

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
      const delivery = await claimReminder(entry.id, gameweek.id);
      if (!delivery) { skipped++; continue; }

      try {
        const result = await sendPickReminderEmail({
          to: entry.participant.email!,
          playerName: entry.participant.name,
          competitionName: gameweek.season.competition.name,
          clubName: gameweek.season.competition.clubName,
          clubLogoUrl: gameweek.season.competition.clubLogoUrl,
          clubColor: gameweek.season.competition.clubColor,
          gameweekName: gameweek.name,
          deadlineLabel: formatInTimeZone(gameweek.deadlineAt, gameweek.season.competition.timezone, "EEE d MMM, HH:mm zzz"),
          entryNumber: entry.number,
          appUrl,
          idempotencyKey: `pick-reminder:${entry.id}:${gameweek.id}`,
        });

        if (!result.sent) {
          await prisma.reminderDelivery.delete({ where: { id: delivery.id } });
          errors.push(`entry ${entry.id}: ${result.reason}`);
          continue;
        }

        await prisma.$transaction([
          prisma.reminderDelivery.update({ where: { id: delivery.id }, data: { emailId: result.id, sentAt: new Date() } }),
          prisma.auditEvent.create({
            data: { competitionId: gameweek.season.competitionId, type: "reminder.pick_due", entityType: "Entry", entityId: entry.id, payload: { gameweekId: gameweek.id } },
          }),
        ]);
        sent++;
      } catch (error) {
        // Delete only the local claim. The stable entry/gameweek key will be
        // reused if this request's outcome was uncertain, so a retry cannot
        // create a second provider-side email.
        await prisma.reminderDelivery.delete({ where: { id: delivery.id } }).catch(() => undefined);
        errors.push(`entry ${entry.id}: ${error instanceof Error ? error.message : "Could not send reminder"}`);
      }
    }
  }

  return NextResponse.json({ gameweeksChecked: openGameweeks.length, sent, skipped, errors });
}
