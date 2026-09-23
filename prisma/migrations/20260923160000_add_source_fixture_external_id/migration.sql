-- AlterTable
ALTER TABLE "SourceFixture" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SourceFixture_externalId_key" ON "SourceFixture"("externalId");
