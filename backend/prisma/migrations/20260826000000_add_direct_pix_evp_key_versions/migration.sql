-- Dedicated immutable direct Pix EVP aggregate. It does not alter Donation, Payment, or GiftCard.
CREATE TYPE "DirectPixEvpKeyVersionStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'REVOKED', 'SUPERSEDED');

CREATE TABLE "direct_pix_evp_key_versions" (
  "id" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "submittedByUserId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "DirectPixEvpKeyVersionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "aadVersion" INTEGER NOT NULL DEFAULT 1,
  "encryptionKid" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "fingerprintKid" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_pix_evp_key_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "direct_pix_evp_key_versions_familyId_version_key" ON "direct_pix_evp_key_versions"("familyId", "version");
CREATE INDEX "direct_pix_evp_key_versions_familyId_status_submittedAt_idx" ON "direct_pix_evp_key_versions"("familyId", "status", "submittedAt");
CREATE INDEX "direct_pix_evp_key_versions_assignmentId_submittedAt_idx" ON "direct_pix_evp_key_versions"("assignmentId", "submittedAt");
CREATE INDEX "direct_pix_evp_key_versions_fingerprintKid_fingerprint_idx" ON "direct_pix_evp_key_versions"("fingerprintKid", "fingerprint");
ALTER TABLE "direct_pix_evp_key_versions" ADD CONSTRAINT "direct_pix_evp_key_versions_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_evp_key_versions" ADD CONSTRAINT "direct_pix_evp_key_versions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "family_responsible_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_evp_key_versions" ADD CONSTRAINT "direct_pix_evp_key_versions_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step-up proofs are single-use when consumed by an EVP mutation.
ALTER TABLE "step_up_authorizations" ADD COLUMN "consumedAt" TIMESTAMP(3);
-- Version status may change only during later review flows; secret binding is immutable.
CREATE FUNCTION prevent_direct_pix_evp_secret_mutation() RETURNS trigger AS $$
BEGIN
  IF NEW."familyId" IS DISTINCT FROM OLD."familyId" OR NEW."assignmentId" IS DISTINCT FROM OLD."assignmentId" OR NEW."submittedByUserId" IS DISTINCT FROM OLD."submittedByUserId" OR NEW."version" IS DISTINCT FROM OLD."version" OR NEW."aadVersion" IS DISTINCT FROM OLD."aadVersion" OR NEW."encryptionKid" IS DISTINCT FROM OLD."encryptionKid" OR NEW."nonce" IS DISTINCT FROM OLD."nonce" OR NEW."ciphertext" IS DISTINCT FROM OLD."ciphertext" OR NEW."tag" IS DISTINCT FROM OLD."tag" OR NEW."fingerprintKid" IS DISTINCT FROM OLD."fingerprintKid" OR NEW."fingerprint" IS DISTINCT FROM OLD."fingerprint" OR NEW."submittedAt" IS DISTINCT FROM OLD."submittedAt" THEN
    RAISE EXCEPTION 'direct Pix EVP key version encrypted fields are immutable';
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER direct_pix_evp_key_versions_immutable BEFORE UPDATE ON "direct_pix_evp_key_versions" FOR EACH ROW EXECUTE FUNCTION prevent_direct_pix_evp_secret_mutation();
