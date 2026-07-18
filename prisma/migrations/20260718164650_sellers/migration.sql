-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "sellerId" UUID;

-- CreateTable
CREATE TABLE "Seller" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "minTarget" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Seller_competitionId_name_key" ON "Seller"("competitionId", "name");

-- CreateIndex
CREATE INDEX "Participant_sellerId_idx" ON "Participant"("sellerId");

-- AddForeignKey
ALTER TABLE "Seller" ADD CONSTRAINT "Seller_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE SET NULL ON UPDATE CASCADE;
