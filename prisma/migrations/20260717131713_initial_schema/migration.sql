-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'ELIMINATED', 'WINNER', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "GameweekStatus" AS ENUM ('DRAFT', 'OPEN', 'LOCKED', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FixtureStatus" AS ENUM ('SCHEDULED', 'FINISHED', 'POSTPONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PickMethod" AS ENUM ('MEMBER', 'AUTOPICK', 'ADMIN');

-- CreateEnum
CREATE TYPE "PickOutcome" AS ENUM ('PENDING', 'WIN', 'DRAW', 'LOSS', 'VOID');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Dublin',
    "entryFeeCents" INTEGER NOT NULL DEFAULT 1000,
    "prizePercentage" INTEGER NOT NULL DEFAULT 30,
    "fundraisingPercentage" INTEGER NOT NULL DEFAULT 70,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionMember" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" "SeasonStatus" NOT NULL DEFAULT 'DRAFT',
    "prizeFundCents" INTEGER NOT NULL DEFAULT 0,
    "fundraisingCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "userId" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "eliminatedGameweekId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gameweek" (
    "id" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "status" "GameweekStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gameweek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" UUID NOT NULL,
    "gameweekId" UUID NOT NULL,
    "homeTeamId" UUID NOT NULL,
    "awayTeamId" UUID NOT NULL,
    "kickoffAt" TIMESTAMP(3) NOT NULL,
    "status" "FixtureStatus" NOT NULL DEFAULT 'SCHEDULED',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pick" (
    "id" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "gameweekId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "method" "PickMethod" NOT NULL DEFAULT 'MEMBER',
    "outcome" "PickOutcome" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "Pick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "actorId" UUID,
    "type" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Competition_slug_key" ON "Competition"("slug");

-- CreateIndex
CREATE INDEX "CompetitionMember_userId_idx" ON "CompetitionMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionMember_competitionId_userId_key" ON "CompetitionMember"("competitionId", "userId");

-- CreateIndex
CREATE INDEX "Season_competitionId_status_idx" ON "Season"("competitionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Season_competitionId_slug_key" ON "Season"("competitionId", "slug");

-- CreateIndex
CREATE INDEX "Participant_competitionId_name_idx" ON "Participant"("competitionId", "name");

-- CreateIndex
CREATE INDEX "Participant_userId_idx" ON "Participant"("userId");

-- CreateIndex
CREATE INDEX "Entry_seasonId_status_idx" ON "Entry"("seasonId", "status");

-- CreateIndex
CREATE INDEX "Entry_participantId_idx" ON "Entry"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_seasonId_participantId_number_key" ON "Entry"("seasonId", "participantId", "number");

-- CreateIndex
CREATE INDEX "Payment_seasonId_status_idx" ON "Payment"("seasonId", "status");

-- CreateIndex
CREATE INDEX "Payment_participantId_idx" ON "Payment"("participantId");

-- CreateIndex
CREATE INDEX "Gameweek_seasonId_status_idx" ON "Gameweek"("seasonId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Gameweek_seasonId_number_key" ON "Gameweek"("seasonId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_externalId_key" ON "Team"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Fixture_externalId_key" ON "Fixture"("externalId");

-- CreateIndex
CREATE INDEX "Fixture_gameweekId_kickoffAt_idx" ON "Fixture"("gameweekId", "kickoffAt");

-- CreateIndex
CREATE INDEX "Pick_gameweekId_teamId_idx" ON "Pick"("gameweekId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Pick_entryId_gameweekId_key" ON "Pick"("entryId", "gameweekId");

-- CreateIndex
CREATE INDEX "AuditEvent_competitionId_createdAt_idx" ON "AuditEvent"("competitionId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "CompetitionMember" ADD CONSTRAINT "CompetitionMember_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionMember" ADD CONSTRAINT "CompetitionMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gameweek" ADD CONSTRAINT "Gameweek_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_gameweekId_fkey" FOREIGN KEY ("gameweekId") REFERENCES "Gameweek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_gameweekId_fkey" FOREIGN KEY ("gameweekId") REFERENCES "Gameweek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
