/*
  Warnings:

  - You are about to drop the `auth_rate_limits` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "direct_pix_intents" DROP CONSTRAINT "direct_pix_intents_cycle_id_fkey";

-- DropForeignKey
ALTER TABLE "direct_pix_intents" DROP CONSTRAINT "direct_pix_intents_responsible_assignment_id_fkey";

-- DropForeignKey
ALTER TABLE "direct_pix_old_qr_declarations" DROP CONSTRAINT "direct_pix_old_qr_declarations_declarant_fkey";

-- DropForeignKey
ALTER TABLE "direct_pix_receipt_confirmations" DROP CONSTRAINT "direct_pix_receipt_confirmations_assignment_id_fkey";

-- AlterTable
ALTER TABLE "direct_pix_evp_rotation_jobs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "direct_pix_feature_flags" ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropTable
DROP TABLE "auth_rate_limits";

-- RenameForeignKey
ALTER TABLE "direct_pix_receipt_confirmations" RENAME CONSTRAINT "direct_pix_receipt_confirmations_declarant_fkey" TO "direct_pix_receipt_confirmations_declared_by_responsible_u_fkey";

-- RenameForeignKey
ALTER TABLE "direct_pix_receipt_confirmations" RENAME CONSTRAINT "direct_pix_receipt_confirmations_operator_fkey" TO "direct_pix_receipt_confirmations_recorded_by_operator_user_fkey";

-- RenameIndex
ALTER INDEX "direct_pix_break_glass_grants_actor_user_id_key_version_id_expi" RENAME TO "direct_pix_break_glass_grants_actor_user_id_key_version_id__idx";

-- RenameIndex
ALTER INDEX "direct_pix_evp_key_fingerprints_key_version_id_fingerprint_kid_" RENAME TO "direct_pix_evp_key_fingerprints_key_version_id_fingerprint__key";

-- RenameIndex
ALTER INDEX "direct_pix_evp_key_reviews_reviewer_membership_id_created_at_id" RENAME TO "direct_pix_evp_key_reviews_reviewer_membership_id_created_a_idx";

-- RenameIndex
ALTER INDEX "direct_pix_feature_flags_entity_key_idx" RENAME TO "direct_pix_feature_flags_entity_id_key_idx";

-- RenameIndex
ALTER INDEX "direct_pix_feature_flags_family_key_idx" RENAME TO "direct_pix_feature_flags_family_id_key_idx";

-- RenameIndex
ALTER INDEX "direct_pix_follow_up_cases_family_status_opened_idx" RENAME TO "direct_pix_follow_up_cases_family_id_status_opened_at_idx";

-- RenameIndex
ALTER INDEX "direct_pix_follow_up_cases_intent_status_idx" RENAME TO "direct_pix_follow_up_cases_intent_id_status_idx";

-- RenameIndex
ALTER INDEX "direct_pix_intents_donor_created_idx" RENAME TO "direct_pix_intents_donor_id_created_at_idx";

-- RenameIndex
ALTER INDEX "direct_pix_intents_family_status_idx" RENAME TO "direct_pix_intents_family_id_status_idx";

-- RenameIndex
ALTER INDEX "direct_pix_old_qr_declarations_declarant_created_idx" RENAME TO "direct_pix_old_qr_declarations_declared_by_user_id_created__idx";

-- RenameIndex
ALTER INDEX "direct_pix_receipt_confirmations_assignment_responded_idx" RENAME TO "direct_pix_receipt_confirmations_responsible_assignment_id__idx";

-- RenameIndex
ALTER INDEX "direct_pix_terms_acceptances_actor_accepted_idx" RENAME TO "direct_pix_terms_acceptances_actor_user_id_accepted_at_idx";

-- RenameIndex
ALTER INDEX "direct_pix_terms_acceptances_actor_version_key" RENAME TO "direct_pix_terms_acceptances_actor_user_id_terms_version_id_key";

-- RenameIndex
ALTER INDEX "family_support_cycles_family_cycle_key" RENAME TO "family_support_cycles_family_id_cycle_start_at_key";

-- RenameIndex
ALTER INDEX "idempotency_records_actor_operation_key_key" RENAME TO "idempotency_records_actor_user_id_operation_idempotency_key_key";

-- RenameIndex
ALTER INDEX "outbox_events_available_processed_idx" RENAME TO "outbox_events_available_at_processed_at_idx";

-- RenameIndex
ALTER INDEX "pix_disclosure_grants_intent_actor_idx" RENAME TO "pix_disclosure_grants_intent_id_actor_user_id_expires_at_idx";
