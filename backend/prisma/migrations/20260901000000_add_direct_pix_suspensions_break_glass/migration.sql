ALTER TYPE "StepUpPurpose" ADD VALUE IF NOT EXISTS 'break_glass_evp';
ALTER TYPE "DirectPixFollowUpReason" ADD VALUE IF NOT EXISTS 'HOLDER_DIVERGENT';
CREATE TYPE "DirectPixSuspensionScope" AS ENUM ('KEY', 'FAMILY', 'ENTITY', 'DONOR_ACCOUNT', 'RESPONSIBLE_ACCOUNT');
CREATE TABLE "direct_pix_suspensions" (
 "id" TEXT NOT NULL, "scope" "DirectPixSuspensionScope" NOT NULL, "key_version_id" TEXT, "family_id" TEXT, "entity_id" TEXT, "user_id" TEXT, "reason_code" TEXT NOT NULL, "expires_at" TIMESTAMP(3), "revoked_at" TIMESTAMP(3), "actor_user_id" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "direct_pix_suspensions_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "direct_pix_suspensions_target_check" CHECK (("scope" = 'KEY' AND "key_version_id" IS NOT NULL AND "family_id" IS NULL AND "entity_id" IS NULL AND "user_id" IS NULL) OR ("scope" = 'FAMILY' AND "family_id" IS NOT NULL AND "key_version_id" IS NULL AND "entity_id" IS NULL AND "user_id" IS NULL) OR ("scope" = 'ENTITY' AND "entity_id" IS NOT NULL AND "key_version_id" IS NULL AND "family_id" IS NULL AND "user_id" IS NULL) OR ("scope" IN ('DONOR_ACCOUNT','RESPONSIBLE_ACCOUNT') AND "user_id" IS NOT NULL AND "key_version_id" IS NULL AND "family_id" IS NULL AND "entity_id" IS NULL))
);
CREATE INDEX "direct_pix_suspensions_scope_expires_at_revoked_at_idx" ON "direct_pix_suspensions"("scope","expires_at","revoked_at");
CREATE INDEX "direct_pix_suspensions_family_id_expires_at_idx" ON "direct_pix_suspensions"("family_id","expires_at");
CREATE INDEX "direct_pix_suspensions_entity_id_expires_at_idx" ON "direct_pix_suspensions"("entity_id","expires_at");
CREATE INDEX "direct_pix_suspensions_user_id_expires_at_idx" ON "direct_pix_suspensions"("user_id","expires_at");
CREATE INDEX "direct_pix_suspensions_key_version_id_expires_at_idx" ON "direct_pix_suspensions"("key_version_id","expires_at");
ALTER TABLE "direct_pix_suspensions" ADD CONSTRAINT "direct_pix_suspensions_key_version_id_fkey" FOREIGN KEY ("key_version_id") REFERENCES "direct_pix_evp_key_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_suspensions" ADD CONSTRAINT "direct_pix_suspensions_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_suspensions" ADD CONSTRAINT "direct_pix_suspensions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_suspensions" ADD CONSTRAINT "direct_pix_suspensions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_suspensions" ADD CONSTRAINT "direct_pix_suspensions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "direct_pix_break_glass_grants" (
 "id" TEXT NOT NULL, "actor_user_id" TEXT NOT NULL, "key_version_id" TEXT NOT NULL, "purpose_code" TEXT NOT NULL, "token_hash" TEXT NOT NULL, "correlation_id" TEXT NOT NULL, "expires_at" TIMESTAMP(3) NOT NULL, "revoked_at" TIMESTAMP(3), "consumed_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "direct_pix_break_glass_grants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "direct_pix_break_glass_grants_token_hash_key" ON "direct_pix_break_glass_grants"("token_hash");
CREATE INDEX "direct_pix_break_glass_grants_actor_user_id_key_version_id_expires_at_idx" ON "direct_pix_break_glass_grants"("actor_user_id","key_version_id","expires_at");
CREATE INDEX "direct_pix_break_glass_grants_expires_at_idx" ON "direct_pix_break_glass_grants"("expires_at");
ALTER TABLE "direct_pix_break_glass_grants" ADD CONSTRAINT "direct_pix_break_glass_grants_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_break_glass_grants" ADD CONSTRAINT "direct_pix_break_glass_grants_key_version_id_fkey" FOREIGN KEY ("key_version_id") REFERENCES "direct_pix_evp_key_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- The partial index using HOLDER_DIVERGENT is created in the following migration: PostgreSQL cannot use a new enum value in this transaction.
