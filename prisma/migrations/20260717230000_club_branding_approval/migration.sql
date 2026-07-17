-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "clubColor" TEXT,
ADD COLUMN     "clubName" TEXT,
ADD COLUMN     "clubWebsite" TEXT,
ADD COLUMN     "welcomeMessage" TEXT;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "approvedAt" TIMESTAMP(3);

