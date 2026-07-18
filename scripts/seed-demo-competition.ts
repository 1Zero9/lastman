import { CompetitionStatus, EntryStatus, PaymentStatus, SeasonStatus } from "@prisma/client";
import { defaultRules, injectLeagueSchedule } from "../lib/competition";
import { prisma } from "../lib/prisma";

const SLUG = "demo-rvr-last-man-standing";
const LEAGUE_NAME = "Premier League";

const SELLERS: Array<{ name: string; minTarget: number }> = [
  { name: "Jay", minTarget: 10 },
  { name: "Dave", minTarget: 5 },
  { name: "Aidan", minTarget: 5 },
  { name: "Rui", minTarget: 5 },
  { name: "Stephen", minTarget: 5 },
];

const ENTRANTS: Array<{ name: string; entries: number; paid: boolean }> = [
  { name: "Alice Byrne", entries: 3, paid: true },
  { name: "Brian O'Connor", entries: 2, paid: true },
  { name: "Ciara Murphy", entries: 2, paid: true },
  { name: "Dara Kelly", entries: 1, paid: true },
  { name: "Emma Walsh", entries: 2, paid: true },
  { name: "Fionn Doyle", entries: 1, paid: true },
  { name: "Grainne Ryan", entries: 1, paid: true },
  { name: "Harry Nolan", entries: 2, paid: true },
  { name: "Ines Castrillion", entries: 1, paid: true },
  { name: "Jack Power", entries: 1, paid: true },
  { name: "Katie Brennan", entries: 2, paid: false },
  { name: "Liam Duffy", entries: 1, paid: false },
];

async function main() {
  const existing = await prisma.competition.findUnique({ where: { slug: SLUG } });
  if (existing) {
    console.log(`Demo competition already exists (${existing.name}). Delete it from the admin danger zone to reseed.`);
    return;
  }

  const ownerEmail = process.argv[2];
  const owner = ownerEmail
    ? await prisma.user.findUnique({ where: { email: ownerEmail.toLowerCase() } })
    : await prisma.user.findFirst({ where: { organiserApprovedAt: { not: null } }, orderBy: { createdAt: "asc" } });
  if (!owner) throw new Error("No organiser-approved user found. Pass an email: npx tsx scripts/seed-demo-competition.ts you@example.com");

  const activeMembership = await prisma.competitionMember.findFirst({
    where: { userId: owner.id, competition: { status: { not: CompetitionStatus.ARCHIVED } } },
  });
  if (activeMembership) throw new Error(`${owner.email} already manages a live competition. Delete or archive it first.`);

  const league = await prisma.league.findFirstOrThrow({ where: { name: LEAGUE_NAME } });
  const range = await prisma.sourceFixture.aggregate({ where: { leagueId: league.id }, _min: { kickoffAt: true }, _max: { kickoffAt: true } });
  if (!range._min.kickoffAt || !range._max.kickoffAt) throw new Error(`No fixtures loaded for ${LEAGUE_NAME}. Run the league seed first.`);
  const from = new Date(range._min.kickoffAt.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(range._max.kickoffAt.getTime() + 24 * 60 * 60 * 1000);

  const competition = await prisma.competition.create({
    data: {
      name: "River Valley Rangers Last Man Standing (Demo)",
      slug: SLUG,
      currency: "EUR",
      timezone: "Europe/Dublin",
      entryFeeCents: 1000,
      clubName: "River Valley Rangers",
      clubWebsite: "https://rivervalleyrangers.ie",
      welcomeMessage: "Thanks for backing the boys' trip — best of luck!",
      prizePercentage: 30,
      fundraisingPercentage: 70,
      status: CompetitionStatus.ACTIVE,
    },
  });

  await prisma.competitionMember.create({ data: { competitionId: competition.id, userId: owner.id, role: "OWNER" } });

  const season = await prisma.season.create({
    data: {
      competitionId: competition.id,
      leagueId: league.id,
      name: "2026/27 Demo Fundraiser",
      slug: "2026-27-demo-fundraiser",
      rules: { ...defaultRules, buyBack: { ...defaultRules.buyBack, enabled: true } },
      startsAt: from,
      endsAt: to,
      status: SeasonStatus.OPEN,
    },
  });

  const schedule = await injectLeagueSchedule(prisma, season.id, league.id, from, to);

  const gameweekOne = await prisma.gameweek.findFirstOrThrow({ where: { seasonId: season.id, number: 1 } });
  await prisma.gameweek.update({ where: { id: gameweekOne.id }, data: { status: "OPEN" } });

  const sellers = [] as Array<{ id: string; name: string }>;
  for (const seller of SELLERS) {
    sellers.push(await prisma.seller.create({ data: { competitionId: competition.id, name: seller.name, minTarget: seller.minTarget } }));
  }

  const fixtures = await prisma.fixture.findMany({ where: { gameweekId: gameweekOne.id }, orderBy: { kickoffAt: "asc" } });
  const pickableTeamIds = fixtures.map((fixture) => fixture.homeTeamId);

  let pickIndex = 0;
  for (const [index, entrant] of ENTRANTS.entries()) {
    const seller = sellers[index % sellers.length];
    const participant = await prisma.participant.create({
      data: {
        competitionId: competition.id,
        name: entrant.name,
        sellerId: seller.id,
        inviteToken: crypto.randomUUID(),
        confirmedAt: entrant.paid ? new Date() : null,
        approvedAt: entrant.paid ? new Date() : null,
      },
    });
    await prisma.entry.createMany({
      data: Array.from({ length: entrant.entries }, (_, entryIndex) => ({
        seasonId: season.id,
        participantId: participant.id,
        number: entryIndex + 1,
        status: entrant.paid ? EntryStatus.ACTIVE : EntryStatus.PENDING_PAYMENT,
      })),
    });
    await prisma.payment.create({
      data: {
        seasonId: season.id,
        participantId: participant.id,
        entryCount: entrant.entries,
        amountCents: competition.entryFeeCents * entrant.entries,
        status: entrant.paid ? PaymentStatus.CONFIRMED : PaymentStatus.PENDING,
        receivedAt: entrant.paid ? new Date() : null,
        reference: `Revolut — ${entrant.name}`,
      },
    });
    if (entrant.paid && index % 2 === 0) {
      const entries = await prisma.entry.findMany({ where: { seasonId: season.id, participantId: participant.id } });
      for (const entry of entries) {
        const teamId = pickableTeamIds[pickIndex % pickableTeamIds.length];
        pickIndex += 1;
        await prisma.pick.create({ data: { entryId: entry.id, gameweekId: gameweekOne.id, teamId, method: "MEMBER" } });
      }
    }
  }

  await prisma.auditEvent.create({
    data: {
      competitionId: competition.id,
      actorId: owner.id,
      type: "competition.created",
      entityType: "Competition",
      entityId: competition.id,
      payload: { demo: true, league: league.name, ...schedule },
    },
  });

  console.log(`Seeded demo competition "${competition.name}" owned by ${owner.email}.`);
  console.log(`${SELLERS.length} sellers, ${ENTRANTS.length} entrants, gameweek 1 open with sample picks.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
