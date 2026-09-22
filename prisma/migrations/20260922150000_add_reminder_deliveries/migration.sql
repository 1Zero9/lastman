-- CreateTable
CREATE TABLE "ReminderDelivery" (
    "id" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "gameweekId" UUID NOT NULL,
    "emailId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderDelivery_entryId_gameweekId_key" ON "ReminderDelivery"("entryId", "gameweekId");

-- CreateIndex
CREATE INDEX "ReminderDelivery_gameweekId_idx" ON "ReminderDelivery"("gameweekId");

-- AddForeignKey
ALTER TABLE "ReminderDelivery" ADD CONSTRAINT "ReminderDelivery_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderDelivery" ADD CONSTRAINT "ReminderDelivery_gameweekId_fkey" FOREIGN KEY ("gameweekId") REFERENCES "Gameweek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
