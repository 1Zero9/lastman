-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('FOOTBALL', 'RUGBY', 'GAA', 'GOLF', 'OTHER');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('CORE_PII', 'LEADERBOARD_HISTORY', 'MARKETING', 'ANALYTICS');

-- CreateEnum
CREATE TYPE "DataRequestType" AS ENUM ('EXPORT', 'DELETE');

-- CreateEnum
CREATE TYPE "DataRequestStatus" AS ENUM ('PENDING', 'COMPLETED');

-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "buyBackCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "anonymisedAt" TIMESTAMP(3),
ADD COLUMN     "club" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "location" TEXT;

-- AlterTable
ALTER TABLE "Season" ADD COLUMN     "leagueId" UUID;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "leagueId" UUID;

-- CreateTable
CREATE TABLE "League" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sport" "Sport" NOT NULL DEFAULT 'FOOTBALL',
    "region" TEXT,
    "seasonLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceFixture" (
    "id" UUID NOT NULL,
    "leagueId" UUID NOT NULL,
    "matchweek" INTEGER NOT NULL,
    "homeTeamId" UUID NOT NULL,
    "awayTeamId" UUID NOT NULL,
    "kickoffAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceFixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRequest" (
    "id" UUID NOT NULL,
    "participantId" UUID,
    "email" TEXT,
    "type" "DataRequestType" NOT NULL,
    "status" "DataRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "League_name_seasonLabel_key" ON "League"("name", "seasonLabel");

-- CreateIndex
CREATE INDEX "SourceFixture_leagueId_matchweek_idx" ON "SourceFixture"("leagueId", "matchweek");

-- CreateIndex
CREATE INDEX "SourceFixture_leagueId_kickoffAt_idx" ON "SourceFixture"("leagueId", "kickoffAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_participantId_purpose_idx" ON "ConsentRecord"("participantId", "purpose");

-- CreateIndex
CREATE INDEX "DataRequest_status_createdAt_idx" ON "DataRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_inviteToken_key" ON "Participant"("inviteToken");

-- CreateIndex
CREATE INDEX "Team_leagueId_idx" ON "Team"("leagueId");

-- AddForeignKey
ALTER TABLE "SourceFixture" ADD CONSTRAINT "SourceFixture_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceFixture" ADD CONSTRAINT "SourceFixture_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceFixture" ADD CONSTRAINT "SourceFixture_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

