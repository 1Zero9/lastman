-- AlterTable
ALTER TABLE "Entry" ADD COLUMN "buyBackRequestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Gameweek" ADD COLUMN "sourceMatchweek" INTEGER;

-- CreateTable
CREATE TABLE "RoundAnnouncement" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "seasonId" UUID NOT NULL,
    "gameweekId" UUID NOT NULL,
    "survivorCount" INTEGER NOT NULL,
    "extended" BOOLEAN NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoundAnnouncement_competitionId_resolvedAt_idx" ON "RoundAnnouncement"("competitionId", "resolvedAt");

-- AddForeignKey
ALTER TABLE "RoundAnnouncement" ADD CONSTRAINT "RoundAnnouncement_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
