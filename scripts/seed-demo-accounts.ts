import bcrypt from "bcryptjs";
import { CompetitionStatus, EntryStatus, PaymentStatus, SeasonStatus } from "@prisma/client";
import { defaultRules, injectLeagueSchedule, makeJoinCode } from "../lib/competition";
import { prisma } from "../lib/prisma";

const SLUG = "demo-fundraiser";
const LEAGUE_NAME = "Premier League";
const PASSWORD = "LastManDemo26!";
const JOIN_CODE = "DEMO26";

const ACCOUNTS = {
  platform: { email: "demo.admin@lastman.demo", name: "Demo Platform Admin" },
  organiser: { email: "demo.organiser@lastman.demo", name: "Demo Organiser" },
  player: { email: "demo.player@lastman.demo", name: "Paula Player" },
  pending: { email: "demo.pending@lastman.demo", name: "Peter Pending" },
};

const CROWD: Array<{ name: string; entries: number; pick: boolean }> = [
  { name: "Alice Byrne", entries: 2, pick: true },
  { name: "Brian O'Connor", entries: 1, pick: true },
  { name: "Ciara Murphy", entries: 2, pick: false },
  { name: "Dara Kelly", entries: 1, pick: true },
  { name: "Emma Walsh", entries: 2, pick: false },
  { name: "Fionn Doyle", entries: 1, pick: true },
  { name: "Grainne Ryan", entries: 1, pick: false },
  { name: "Harry Nolan", entries: 2, pick: true },
];

async function upsertUser(email: string, displayName: string, extra: { platformRole?: "PLATFORM_ADMIN"; organiserApprovedAt?: Date } = {}) {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  return prisma.user.upsert({
    where: { email },
    update: { displayName, passwordHash, ...extra },
    create: { email, displayName, passwordHash, ...extra },
  });
}

async function main() {
  const [platformAdmin, organiser, player, pending] = await Promise.all([
    upsertUser(ACCOUNTS.platform.email, ACCOUNTS.platform.name, { platformRole: "PLATFORM_ADMIN" }),
    upsertUser(ACCOUNTS.organiser.email, ACCOUNTS.organiser.name, { organiserApprovedAt: new Date() }),
    upsertUser(ACCOUNTS.player.email, ACCOUNTS.player.name),
    upsertUser(ACCOUNTS.pending.email, ACCOUNTS.pending.name),
  ]);

  const existing = await prisma.competition.findUnique({ where: { slug: SLUG } });
  if (existing) {
    await prisma.competitionMember.upsert({
      where: { competitionId_userId: { competitionId: existing.id, userId: organiser.id } },
      update: { role: "OWNER" },
      create: { competitionId: existing.id, userId: organiser.id, role: "OWNER" },
    });
    console.log(`Demo fundraiser already exists — accounts refreshed with password "${PASSWORD}".`);
    console.log("Delete it from the admin danger zone (signed in as the demo organiser) to reseed from scratch.");
    return;
  }

  const league = await prisma.league.findFirstOrThrow({ where: { name: LEAGUE_NAME } });
  const range = await prisma.sourceFixture.aggregate({ where: { leagueId: league.id }, _min: { kickoffAt: true }, _max: { kickoffAt: true } });
  if (!range._min.kickoffAt || !range._max.kickoffAt) throw new Error(`No fixtures loaded for ${LEAGUE_NAME}. Run the league seed first.`);
  const from = new Date(range._min.kickoffAt.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(range._max.kickoffAt.getTime() + 24 * 60 * 60 * 1000);

  const joinCodeTaken = await prisma.competition.findUnique({ where: { joinCode: JOIN_CODE }, select: { id: true } });

  const competition = await prisma.competition.create({
    data: {
      name: "Demo Rovers Last Man Standing",
      slug: SLUG,
      joinCode: joinCodeTaken ? makeJoinCode() : JOIN_CODE,
      currency: "EUR",
      timezone: "Europe/Dublin",
      entryFeeCents: 1000,
      clubName: "Demo Rovers FC",
      welcomeMessage: "This is a demo fundraiser — click around, pick teams, nothing here is real.",
      prizePercentage: 30,
      fundraisingPercentage: 70,
      status: CompetitionStatus.ACTIVE,
    },
  });

  await prisma.competitionMember.create({ data: { competitionId: competition.id, userId: organiser.id, role: "OWNER" } });

  const season = await prisma.season.create({
    data: {
      competitionId: competition.id,
      leagueId: league.id,
      name: "Demo Season",
      slug: "demo-season",
      rules: { ...defaultRules, buyBack: { ...defaultRules.buyBack, enabled: true } },
      startsAt: from,
      endsAt: to,
      status: SeasonStatus.OPEN,
    },
  });

  await injectLeagueSchedule(prisma, season.id, league.id, from, to);
  const gameweekOne = await prisma.gameweek.findFirstOrThrow({ where: { seasonId: season.id, number: 1 } });
  await prisma.gameweek.update({ where: { id: gameweekOne.id }, data: { status: "OPEN" } });

  const fixtures = await prisma.fixture.findMany({ where: { gameweekId: gameweekOne.id }, orderBy: { kickoffAt: "asc" } });
  const pickableTeamIds = fixtures.map((fixture) => fixture.homeTeamId);
  let pickIndex = 0;
  const nextTeam = () => pickableTeamIds[pickIndex++ % pickableTeamIds.length];

  const paulaParticipant = await prisma.participant.create({
    data: {
      competitionId: competition.id,
      userId: player.id,
      name: ACCOUNTS.player.name,
      email: ACCOUNTS.player.email,
      inviteToken: crypto.randomUUID(),
      confirmedAt: new Date(),
      approvedAt: new Date(),
    },
  });
  const paulaPicked = await prisma.entry.create({ data: { seasonId: season.id, participantId: paulaParticipant.id, number: 1, status: EntryStatus.ACTIVE } });
  await prisma.entry.create({ data: { seasonId: season.id, participantId: paulaParticipant.id, number: 2, status: EntryStatus.ACTIVE } });
  await prisma.entry.create({ data: { seasonId: season.id, participantId: paulaParticipant.id, number: 3, status: EntryStatus.ELIMINATED } });
  await prisma.pick.create({ data: { entryId: paulaPicked.id, gameweekId: gameweekOne.id, teamId: nextTeam(), method: "MEMBER" } });
  await prisma.payment.create({
    data: { seasonId: season.id, participantId: paulaParticipant.id, entryCount: 3, amountCents: 3000, status: PaymentStatus.CONFIRMED, receivedAt: new Date(), reference: "Demo — Paula Player" },
  });

  const pendingParticipant = await prisma.participant.create({
    data: {
      competitionId: competition.id,
      userId: pending.id,
      name: ACCOUNTS.pending.name,
      email: ACCOUNTS.pending.email,
      inviteToken: crypto.randomUUID(),
      confirmedAt: new Date(),
    },
  });
  await prisma.entry.create({ data: { seasonId: season.id, participantId: pendingParticipant.id, number: 1, status: EntryStatus.PENDING_PAYMENT } });
  await prisma.payment.create({
    data: { seasonId: season.id, participantId: pendingParticipant.id, entryCount: 1, amountCents: 1000, status: PaymentStatus.PENDING, reference: "Demo — Peter Pending" },
  });

  for (const entrant of CROWD) {
    const participant = await prisma.participant.create({
      data: {
        competitionId: competition.id,
        name: entrant.name,
        inviteToken: crypto.randomUUID(),
        confirmedAt: new Date(),
        approvedAt: new Date(),
      },
    });
    for (let number = 1; number <= entrant.entries; number++) {
      const entry = await prisma.entry.create({ data: { seasonId: season.id, participantId: participant.id, number, status: EntryStatus.ACTIVE } });
      if (entrant.pick) await prisma.pick.create({ data: { entryId: entry.id, gameweekId: gameweekOne.id, teamId: nextTeam(), method: "MEMBER" } });
    }
    await prisma.payment.create({
      data: { seasonId: season.id, participantId: participant.id, entryCount: entrant.entries, amountCents: 1000 * entrant.entries, status: PaymentStatus.CONFIRMED, receivedAt: new Date(), reference: `Demo — ${entrant.name}` },
    });
  }

  await prisma.auditEvent.create({
    data: { competitionId: competition.id, actorId: organiser.id, type: "competition.created", entityType: "Competition", entityId: competition.id, payload: { demo: true, league: league.name } },
  });

  console.log(`Seeded "${competition.name}" (join code ${competition.joinCode}).`);
  console.log(`All demo accounts use the password "${PASSWORD}":`);
  console.log(`  Platform admin: ${platformAdmin.email}`);
  console.log(`  Organiser:      ${organiser.email}`);
  console.log(`  Player:         ${player.email} (2 live entries, 1 eliminated)`);
  console.log(`  Player:         ${pending.email} (awaiting payment)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
