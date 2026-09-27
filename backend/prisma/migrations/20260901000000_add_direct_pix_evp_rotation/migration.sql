-- Ticket 13: append-only crypto rotation state. No secret material appears in jobs or audit rows.
CREATE TYPE "DirectPixEvpRotationStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "direct_pix_evp_key_envelopes" (
  "id" TEXT NOT NULL,
  "key_version_id" TEXT NOT NULL,
  "generation" INTEGER NOT NULL,
  "aad_version" INTEGER NOT NULL,
  "encryption_kid" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_pix_evp_key_envelopes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "direct_pix_evp_key_envelopes_key_version_id_fkey" FOREIGN KEY ("key_version_id") REFERENCES "direct_pix_evp_key_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "direct_pix_evp_key_envelopes_key_version_id_generation_key" ON "direct_pix_evp_key_envelopes"("key_version_id", "generation");
CREATE INDEX "direct_pix_evp_key_envelopes_encryption_kid_idx" ON "direct_pix_evp_key_envelopes"("encryption_kid");

CREATE TABLE "direct_pix_evp_key_fingerprints" (
  "id" TEXT NOT NULL,
  "key_version_id" TEXT NOT NULL,
  "fingerprint_kid" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_pix_evp_key_fingerprints_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "direct_pix_evp_key_fingerprints_key_version_id_fkey" FOREIGN KEY ("key_version_id") REFERENCES "direct_pix_evp_key_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "direct_pix_evp_key_fingerprints_key_version_id_fingerprint_kid_key" ON "direct_pix_evp_key_fingerprints"("key_version_id", "fingerprint_kid");
CREATE INDEX "direct_pix_evp_key_fingerprints_fingerprint_kid_fingerprint_idx" ON "direct_pix_evp_key_fingerprints"("fingerprint_kid", "fingerprint");

CREATE TABLE "direct_pix_evp_rotation_jobs" (
  "id" TEXT NOT NULL,
  "encryption_target_kid" TEXT,
  "fingerprint_target_kid" TEXT,
  "status" "DirectPixEvpRotationStatus" NOT NULL DEFAULT 'RUNNING',
  "cursor_key_version_id" TEXT,
  "processed_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "direct_pix_evp_rotation_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "direct_pix_evp_rotation_jobs_status_created_at_idx" ON "direct_pix_evp_rotation_jobs"("status", "created_at");

-- Backfill establishes the legacy envelope/index as generation 1; no plaintext is materialized.
INSERT INTO "direct_pix_evp_key_envelopes" ("id", "key_version_id", "generation", "aad_version", "encryption_kid", "nonce", "ciphertext", "tag", "created_at")
SELECT md5('direct-pix-evp-envelope:' || "id"), "id", 1, "aadVersion", "encryptionKid", "nonce", "ciphertext", "tag", "submittedAt"
FROM "direct_pix_evp_key_versions";
INSERT INTO "direct_pix_evp_key_fingerprints" ("id", "key_version_id", "fingerprint_kid", "fingerprint", "created_at")
SELECT md5('direct-pix-evp-fingerprint:' || "id" || ':' || "fingerprintKid"), "id", "fingerprintKid", "fingerprint", "submittedAt"
FROM "direct_pix_evp_key_versions";

CREATE FUNCTION prevent_direct_pix_evp_rotation_secret_mutation() RETURNS trigger AS $$
BEGIN
  IF NEW."key_version_id" IS DISTINCT FROM OLD."key_version_id" OR NEW."generation" IS DISTINCT FROM OLD."generation" OR NEW."aad_version" IS DISTINCT FROM OLD."aad_version" OR NEW."encryption_kid" IS DISTINCT FROM OLD."encryption_kid" OR NEW."nonce" IS DISTINCT FROM OLD."nonce" OR NEW."ciphertext" IS DISTINCT FROM OLD."ciphertext" OR NEW."tag" IS DISTINCT FROM OLD."tag" THEN RAISE EXCEPTION 'direct Pix EVP rotation envelopes are immutable'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER direct_pix_evp_rotation_envelopes_immutable BEFORE UPDATE ON "direct_pix_evp_key_envelopes" FOR EACH ROW EXECUTE FUNCTION prevent_direct_pix_evp_rotation_secret_mutation();
CREATE FUNCTION prevent_direct_pix_evp_rotation_fingerprint_mutation() RETURNS trigger AS $$
BEGIN
  IF NEW."key_version_id" IS DISTINCT FROM OLD."key_version_id" OR NEW."fingerprint_kid" IS DISTINCT FROM OLD."fingerprint_kid" OR NEW."fingerprint" IS DISTINCT FROM OLD."fingerprint" THEN RAISE EXCEPTION 'direct Pix EVP rotation fingerprints are immutable'; END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER direct_pix_evp_rotation_fingerprints_immutable BEFORE UPDATE ON "direct_pix_evp_key_fingerprints" FOR EACH ROW EXECUTE FUNCTION prevent_direct_pix_evp_rotation_fingerprint_mutation();