-- CreateTable
CREATE TABLE "CompetitionSetupCode" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "createdByUserId" UUID NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByUserId" UUID,
    "competitionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionSetupCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionSetupCode_code_key" ON "CompetitionSetupCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionSetupCode_competitionId_key" ON "CompetitionSetupCode"("competitionId");

-- AddForeignKey
ALTER TABLE "CompetitionSetupCode" ADD CONSTRAINT "CompetitionSetupCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionSetupCode" ADD CONSTRAINT "CompetitionSetupCode_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionSetupCode" ADD CONSTRAINT "CompetitionSetupCode_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
