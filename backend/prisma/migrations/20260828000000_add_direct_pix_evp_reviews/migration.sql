-- Immutable, scoped review trail for Direct Pix EVP key versions.
CREATE TYPE "DirectPixEvpReviewDecision" AS ENUM ('APPROVE', 'REJECT');
CREATE TYPE "DirectPixEvpReviewReason" AS ENUM ('EXACT_NAME_MATCH', 'ABBREVIATED_NAME', 'SOCIAL_NAME', 'CIVIL_NAME_UPDATE', 'HOLDER_NAME_MISMATCH', 'EVP_MISMATCH', 'OTHER_MISMATCH');
ALTER TYPE "DirectPixEvpKeyVersionStatus" ADD VALUE 'SECOND_APPROVAL_REQUIRED';

CREATE TABLE "direct_pix_evp_key_reviews" (
  "id" TEXT NOT NULL,
  "key_version_id" TEXT NOT NULL,
  "reviewer_user_id" TEXT NOT NULL,
  "reviewer_membership_id" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "decision" "DirectPixEvpReviewDecision" NOT NULL,
  "reason" "DirectPixEvpReviewReason" NOT NULL,
  "expected_name_encryption_kid" TEXT NOT NULL,
  "expected_name_nonce" TEXT NOT NULL,
  "expected_name_ciphertext" TEXT NOT NULL,
  "expected_name_tag" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_pix_evp_key_reviews_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "direct_pix_evp_key_reviews_key_version_id_sequence_key" ON "direct_pix_evp_key_reviews"("key_version_id", "sequence");
CREATE INDEX "direct_pix_evp_key_reviews_reviewer_membership_id_created_at_idx" ON "direct_pix_evp_key_reviews"("reviewer_membership_id", "created_at");
ALTER TABLE "direct_pix_evp_key_reviews" ADD CONSTRAINT "direct_pix_evp_key_reviews_key_version_id_fkey" FOREIGN KEY ("key_version_id") REFERENCES "direct_pix_evp_key_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_evp_key_reviews" ADD CONSTRAINT "direct_pix_evp_key_reviews_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_evp_key_reviews" ADD CONSTRAINT "direct_pix_evp_key_reviews_reviewer_membership_id_fkey" FOREIGN KEY ("reviewer_membership_id") REFERENCES "entity_operator_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A family has at most one currently usable EVP, even under concurrent approvals.
CREATE UNIQUE INDEX "direct_pix_evp_key_versions_one_active_per_family" ON "direct_pix_evp_key_versions"("familyId") WHERE "status" = 'ACTIVE';
