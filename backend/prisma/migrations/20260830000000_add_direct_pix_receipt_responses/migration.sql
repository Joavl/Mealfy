ALTER TYPE "StepUpPurpose" ADD VALUE IF NOT EXISTS 'confirm_direct_pix_receipt';
ALTER TYPE "DirectPixIntentStatus" ADD VALUE IF NOT EXISTS 'CANCELED_BY_DONOR';
ALTER TYPE "DirectPixIntentStatus" ADD VALUE IF NOT EXISTS 'FAMILY_CONFIRMED';
ALTER TYPE "DirectPixIntentStatus" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_REQUIRED';

CREATE TYPE "DirectPixDeclarationCancellationReason" AS ENUM ('TRANSFER_NOT_SENT', 'DONOR_CHANGED_MIND', 'OTHER');
CREATE TYPE "DirectPixReceiptOutcome" AS ENUM ('RECEIVED_EXACT', 'RECEIVED_DIFFERENT', 'NOT_LOCATED');
CREATE TYPE "DirectPixAssistedChannel" AS ENUM ('IN_PERSON', 'PHONE');
CREATE TYPE "DirectPixFollowUpReason" AS ENUM ('RECEIVED_DIFFERENT', 'NOT_LOCATED');
CREATE TYPE "DirectPixFollowUpCaseStatus" AS ENUM ('OPEN');

CREATE TABLE "direct_pix_declaration_cancellations" (
  "id" TEXT NOT NULL,
  "declaration_id" TEXT NOT NULL,
  "canceled_by_user_id" TEXT NOT NULL,
  "reason" "DirectPixDeclarationCancellationReason" NOT NULL,
  "canceled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_pix_declaration_cancellations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "direct_pix_declaration_cancellations_declaration_id_key" ON "direct_pix_declaration_cancellations"("declaration_id");
ALTER TABLE "direct_pix_declaration_cancellations" ADD CONSTRAINT "direct_pix_declaration_cancellations_declaration_id_fkey" FOREIGN KEY ("declaration_id") REFERENCES "direct_pix_declarations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_declaration_cancellations" ADD CONSTRAINT "direct_pix_declaration_cancellations_canceled_by_user_id_fkey" FOREIGN KEY ("canceled_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "direct_pix_receipt_confirmations" (
  "id" TEXT NOT NULL,
  "intent_id" TEXT NOT NULL,
  "responsible_assignment_id" TEXT NOT NULL,
  "outcome" "DirectPixReceiptOutcome" NOT NULL,
  "received_amount_cents" INTEGER,
  "declared_by_responsible_user_id" TEXT NOT NULL,
  "recorded_by_operator_user_id" TEXT,
  "assisted_channel" "DirectPixAssistedChannel",
  "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_pix_receipt_confirmations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "direct_pix_receipt_confirmations_amount_shape_check" CHECK (("outcome" = 'RECEIVED_DIFFERENT' AND "received_amount_cents" BETWEEN 1 AND 100000) OR ("outcome" <> 'RECEIVED_DIFFERENT' AND "received_amount_cents" IS NULL)),
  CONSTRAINT "direct_pix_receipt_confirmations_assisted_shape_check" CHECK (("recorded_by_operator_user_id" IS NULL AND "assisted_channel" IS NULL) OR ("recorded_by_operator_user_id" IS NOT NULL AND "assisted_channel" IS NOT NULL))
);
CREATE UNIQUE INDEX "direct_pix_receipt_confirmations_intent_id_key" ON "direct_pix_receipt_confirmations"("intent_id");
CREATE INDEX "direct_pix_receipt_confirmations_assignment_responded_idx" ON "direct_pix_receipt_confirmations"("responsible_assignment_id", "responded_at");
ALTER TABLE "direct_pix_receipt_confirmations" ADD CONSTRAINT "direct_pix_receipt_confirmations_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "direct_pix_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_receipt_confirmations" ADD CONSTRAINT "direct_pix_receipt_confirmations_assignment_id_fkey" FOREIGN KEY ("responsible_assignment_id") REFERENCES "family_responsible_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_receipt_confirmations" ADD CONSTRAINT "direct_pix_receipt_confirmations_declarant_fkey" FOREIGN KEY ("declared_by_responsible_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_receipt_confirmations" ADD CONSTRAINT "direct_pix_receipt_confirmations_operator_fkey" FOREIGN KEY ("recorded_by_operator_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "direct_pix_follow_up_cases" (
  "id" TEXT NOT NULL,
  "intent_id" TEXT NOT NULL,
  "family_id" TEXT NOT NULL,
  "reason" "DirectPixFollowUpReason" NOT NULL,
  "status" "DirectPixFollowUpCaseStatus" NOT NULL DEFAULT 'OPEN',
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_pix_follow_up_cases_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "direct_pix_follow_up_cases_one_open_per_intent" ON "direct_pix_follow_up_cases"("intent_id") WHERE "status" = 'OPEN';
CREATE INDEX "direct_pix_follow_up_cases_family_status_opened_idx" ON "direct_pix_follow_up_cases"("family_id", "status", "opened_at");
CREATE INDEX "direct_pix_follow_up_cases_intent_status_idx" ON "direct_pix_follow_up_cases"("intent_id", "status");
ALTER TABLE "direct_pix_follow_up_cases" ADD CONSTRAINT "direct_pix_follow_up_cases_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "direct_pix_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_follow_up_cases" ADD CONSTRAINT "direct_pix_follow_up_cases_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
