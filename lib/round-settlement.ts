import { revalidatePath, revalidateTag } from "next/cache";
import { extendSeasonWithNextMatchweek } from "@/lib/competition";
import { isBuyBackEligible, settleGameweek, type Rules } from "@/lib/engine";
import { sendEliminationEmail, sendRoundAnnouncementEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { publicFixturesTag } from "@/lib/public-fixtures";

// Shared by both the automatic score-sync cron and the manual "Settle" button on
// /admin/results, so a settle behaves the same way — eliminated players hear about it,
// and running out of pre-loaded schedule is never a silent dead end — no matter which
// path triggered it.
export async function settleGameweekAndNotify(gameweekId: string, appUrl: string, actorId?: string) {
  const gameweek = await prisma.gameweek.findUniqueOrThrow({
    where: { id: gameweekId },
    include: { season: { include: { competition: { include: { members: { where: { role: { in: ["OWNER", "ADMIN"] } }, include: { user: true } } } } } } },
  });
  const result = await prisma.$transaction((tx) => settleGameweek(tx, gameweekId, actorId));
  revalidateTag(publicFixturesTag(gameweek.season.competition.slug), "max");
  revalidatePath(`/c/${gameweek.season.competition.slug}/standings`);
  revalidatePath("/standings");
  revalidatePath("/my-entries");

  const rules = gameweek.season.rules as Rules;

  if (result.eliminatedEntryIds.length) {
    const eliminated = await prisma.entry.findMany({
      where: { id: { in: result.eliminatedEntryIds } },
      include: { participant: true },
    });
    for (const entry of eliminated) {
      if (!entry.participant.email || entry.participant.anonymisedAt) continue;
      const eligible = isBuyBackEligible(entry, gameweek.number, rules);
      await sendEliminationEmail({
        to: entry.participant.email,
        playerName: entry.participant.name,
        competitionName: gameweek.season.competition.name,
        entryNumber: entry.number,
        gameweekName: gameweek.name,
        buyBackUrl: eligible ? `${appUrl}/my-entries` : null,
        appUrl,
      }).catch((error) => console.error(`Elimination email failed for entry ${entry.id}:`, error));
    }
  }

  if (!result.seasonCompleted) {
    const next = await prisma.gameweek.findFirst({ where: { seasonId: gameweek.seasonId, number: gameweek.number + 1 } });
    if (next) {
      if (next.status === "DRAFT") await prisma.gameweek.update({ where: { id: next.id }, data: { status: "OPEN" } });
    } else {
      // The pre-loaded schedule has run out with the competition still live — pull in the next
      // real matchweek automatically and flag it for the organiser rather than going silent.
      const extension = await extendSeasonWithNextMatchweek(prisma, gameweek.seasonId);
      await prisma.roundAnnouncement.create({
        data: {
          competitionId: gameweek.season.competitionId,
          seasonId: gameweek.seasonId,
          gameweekId: gameweek.id,
          survivorCount: result.survivorCount,
          extended: Boolean(extension),
        },
      });
      const organisers = gameweek.season.competition.members.map((m) => m.user).filter((u) => u.email);
      const adminUrl = `${appUrl}/admin`;
      for (const organiser of organisers) {
        await sendRoundAnnouncementEmail({
          to: organiser.email,
          organiserName: organiser.displayName ?? organiser.email,
          competitionName: gameweek.season.competition.name,
          gameweekName: gameweek.name,
          survivorCount: result.survivorCount,
          extended: Boolean(extension),
          adminUrl,
        }).catch((error) => console.error(`Round-announcement email failed for ${organiser.email}:`, error));
      }
    }
  }

  return result;
}
