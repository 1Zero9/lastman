import bcrypt from "bcryptjs";
import { EntryStatus, MemberRole } from "@prisma/client";
import { DEMO_COMPETITION_SLUG } from "../lib/demo";
import { prisma } from "../lib/prisma";

const EMAIL = "showcase@lastman.demo";

async function main() {
  const password = process.env.SHOWCASE_PASSWORD;
  if (!password || password.length < 16) throw new Error("SHOWCASE_PASSWORD must be set to a unique password of at least 16 characters.");
  const competition = await prisma.competition.findUnique({
    where: { slug: DEMO_COMPETITION_SLUG },
    include: { seasons: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const season = competition?.seasons[0];
  if (!competition || !season) throw new Error("The synthetic demo competition has not been seeded.");

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { displayName: "Showcase Player", passwordHash: await bcrypt.hash(password, 12), platformRole: "MEMBER", organiserApprovedAt: null },
    create: { email: EMAIL, displayName: "Showcase Player", passwordHash: await bcrypt.hash(password, 12) },
  });
  await prisma.competitionMember.upsert({
    where: { competitionId_userId: { competitionId: competition.id, userId: user.id } },
    update: { role: MemberRole.VIEWER },
    create: { competitionId: competition.id, userId: user.id, role: MemberRole.VIEWER },
  });
  const existingParticipant = await prisma.participant.findFirst({ where: { competitionId: competition.id, email: EMAIL } });
  const participant = existingParticipant
    ? await prisma.participant.update({ where: { id: existingParticipant.id }, data: { userId: user.id, name: "Showcase Player", anonymisedAt: null } })
    : await prisma.participant.create({ data: { competitionId: competition.id, userId: user.id, name: "Showcase Player", email: EMAIL, confirmedAt: new Date(), approvedAt: new Date() } });
  await prisma.entry.upsert({
    where: { seasonId_participantId_number: { seasonId: season.id, participantId: participant.id, number: 1 } },
    update: { status: EntryStatus.ACTIVE },
    create: { seasonId: season.id, participantId: participant.id, number: 1, status: EntryStatus.ACTIVE },
  });
  console.log(`Showcase account ready: ${EMAIL}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
