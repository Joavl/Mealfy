-- AlterTable: vínculo beneficiário -> família
ALTER TABLE "families" ADD COLUMN "beneficiaryUserId" TEXT;

-- CreateIndex
CREATE INDEX "families_beneficiaryUserId_idx" ON "families"("beneficiaryUserId");

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_beneficiaryUserId_fkey" FOREIGN KEY ("beneficiaryUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
