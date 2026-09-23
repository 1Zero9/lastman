-- Fixture rows are per-competition instances of a real match, so many competitions can
-- legitimately share the same source match (externalId) at once — it was never meant to
-- be globally unique the way Team.externalId and SourceFixture.externalId are.
DROP INDEX "Fixture_externalId_key";

-- CreateIndex
CREATE INDEX "Fixture_externalId_idx" ON "Fixture"("externalId");
