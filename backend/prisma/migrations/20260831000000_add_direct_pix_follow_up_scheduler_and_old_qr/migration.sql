ALTER TYPE "DirectPixFollowUpReason" ADD VALUE IF NOT EXISTS 'CONFIRMATION_TIMEOUT';
ALTER TYPE "DirectPixFollowUpReason" ADD VALUE IF NOT EXISTS 'OLD_QR_DECLARATION';

ALTER TABLE "direct_pix_follow_up_cases" ADD COLUMN "sla_started_at" TIMESTAMP(3);
ALTER TABLE "direct_pix_follow_up_cases" ADD COLUMN "escalated_at" TIMESTAMP(3);

CREATE TABLE "direct_pix_old_qr_declarations" (
  "id" TEXT NOT NULL,
  "source_intent_id" TEXT NOT NULL,
  "declared_by_user_id" TEXT NOT NULL,
  "amount_cents" INTEGER NOT NULL,
  "approximate_sent_at" TIMESTAMP(3) NOT NULL,
  "pix_key_version_id" TEXT NOT NULL,
  "source_cycle_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_pix_old_qr_declarations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "direct_pix_old_qr_declarations_amount_check" CHECK ("amount_cents" BETWEEN 1 AND 100000)
);
CREATE UNIQUE INDEX "direct_pix_old_qr_declarations_source_intent_id_key" ON "direct_pix_old_qr_declarations"("source_intent_id");
CREATE INDEX "direct_pix_old_qr_declarations_declarant_created_idx" ON "direct_pix_old_qr_declarations"("declared_by_user_id", "created_at");
ALTER TABLE "direct_pix_old_qr_declarations" ADD CONSTRAINT "direct_pix_old_qr_declarations_source_intent_id_fkey" FOREIGN KEY ("source_intent_id") REFERENCES "direct_pix_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_old_qr_declarations" ADD CONSTRAINT "direct_pix_old_qr_declarations_declarant_fkey" FOREIGN KEY ("declared_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
