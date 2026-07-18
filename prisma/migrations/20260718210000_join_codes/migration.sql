-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "joinCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Competition_joinCode_key" ON "Competition"("joinCode");
