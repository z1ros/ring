-- DropIndex
DROP INDEX "Lead_phone_key";

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");
