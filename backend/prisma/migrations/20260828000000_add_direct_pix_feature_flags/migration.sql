-- Persisted, scope-aware Direct Pix feature controls. Existing behavior is fail-closed: no row enables a feature.
CREATE TYPE "DirectPixFeatureFlagKey" AS ENUM ('ONBOARDING', 'CREATION', 'DISCLOSURE', 'JOBS', 'LEGACY_WRITE', 'KILL_SWITCH');
CREATE TYPE "DirectPixFeatureFlagScope" AS ENUM ('GLOBAL', 'ENTITY', 'FAMILY');

CREATE TABLE "direct_pix_feature_flags" (
  "id" text NOT NULL,
  "key" "DirectPixFeatureFlagKey" NOT NULL,
  "scope" "DirectPixFeatureFlagScope" NOT NULL,
  "entity_id" text,
  "family_id" text,
  "enabled" boolean NOT NULL DEFAULT false,
  "config" jsonb,
  "version" integer NOT NULL DEFAULT 1,
  "updated_by_user_id" text NOT NULL,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_pix_feature_flags_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "direct_pix_feature_flags_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "direct_pix_feature_flags_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "direct_pix_feature_flags_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "direct_pix_feature_flags_scope_target_check" CHECK (("scope" = 'GLOBAL' AND "entity_id" IS NULL AND "family_id" IS NULL) OR ("scope" = 'ENTITY' AND "entity_id" IS NOT NULL AND "family_id" IS NULL) OR ("scope" = 'FAMILY' AND "entity_id" IS NOT NULL AND "family_id" IS NOT NULL))
);

CREATE UNIQUE INDEX "direct_pix_feature_flags_global_key_unique" ON "direct_pix_feature_flags" ("key") WHERE "scope" = 'GLOBAL';
CREATE UNIQUE INDEX "direct_pix_feature_flags_entity_key_unique" ON "direct_pix_feature_flags" ("key", "entity_id") WHERE "scope" = 'ENTITY';
CREATE UNIQUE INDEX "direct_pix_feature_flags_family_key_unique" ON "direct_pix_feature_flags" ("key", "family_id") WHERE "scope" = 'FAMILY';
CREATE INDEX "direct_pix_feature_flags_key_scope_idx" ON "direct_pix_feature_flags" ("key", "scope");
CREATE INDEX "direct_pix_feature_flags_entity_key_idx" ON "direct_pix_feature_flags" ("entity_id", "key");
CREATE INDEX "direct_pix_feature_flags_family_key_idx" ON "direct_pix_feature_flags" ("family_id", "key");
