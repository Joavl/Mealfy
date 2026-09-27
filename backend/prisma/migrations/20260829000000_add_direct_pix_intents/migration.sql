CREATE TYPE "DirectPixIntentStatus" AS ENUM ('OPEN', 'DONOR_DECLARED');
CREATE TYPE "FamilySupportCycleStatus" AS ENUM ('IN_PROGRESS');

CREATE TABLE "direct_pix_intents" (
  "id" TEXT NOT NULL, "donor_id" TEXT NOT NULL, "family_id" TEXT NOT NULL, "responsible_assignment_id" TEXT NOT NULL, "pix_key_version_id" TEXT NOT NULL,
  "amount_cents" INTEGER NOT NULL, "txid" TEXT NOT NULL, "status" "DirectPixIntentStatus" NOT NULL DEFAULT 'OPEN',
  "cycle_start_at" TIMESTAMP(3) NOT NULL, "cycle_end_at" TIMESTAMP(3) NOT NULL, "first_disclosed_at" TIMESTAMP(3), "last_disclosure_expires_at" TIMESTAMP(3),
  "declaration_deadline_at" TIMESTAMP(3) NOT NULL, "cycle_id" TEXT, "cohort_captured_at" TIMESTAMP(3), "declared_at" TIMESTAMP(3), "confirmation_deadline_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_pix_intents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "direct_pix_intents_amount_cents_check" CHECK ("amount_cents" BETWEEN 500 AND 100000),
  CONSTRAINT "direct_pix_intents_txid_check" CHECK ("txid" ~ '^[A-Za-z0-9]{1,25}$'),
  CONSTRAINT "direct_pix_intents_deadline_check" CHECK ("declaration_deadline_at" <= "created_at" + INTERVAL '24 hours')
);
CREATE UNIQUE INDEX "direct_pix_intents_txid_key" ON "direct_pix_intents"("txid");
CREATE INDEX "direct_pix_intents_donor_created_idx" ON "direct_pix_intents"("donor_id", "created_at");
CREATE INDEX "direct_pix_intents_family_status_idx" ON "direct_pix_intents"("family_id", "status");
ALTER TABLE "direct_pix_intents" ADD CONSTRAINT "direct_pix_intents_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_intents" ADD CONSTRAINT "direct_pix_intents_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_intents" ADD CONSTRAINT "direct_pix_intents_responsible_assignment_id_fkey" FOREIGN KEY ("responsible_assignment_id") REFERENCES "family_responsible_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_intents" ADD CONSTRAINT "direct_pix_intents_pix_key_version_id_fkey" FOREIGN KEY ("pix_key_version_id") REFERENCES "direct_pix_evp_key_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "pix_disclosure_grants" (
  "id" TEXT NOT NULL, "intent_id" TEXT NOT NULL, "actor_user_id" TEXT NOT NULL, "purpose" TEXT NOT NULL, "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL, "revoked_at" TIMESTAMP(3), "last_accessed_at" TIMESTAMP(3), "access_count" INTEGER NOT NULL DEFAULT 0, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pix_disclosure_grants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pix_disclosure_grants_expiry_check" CHECK ("expires_at" <= "created_at" + INTERVAL '15 minutes')
);
CREATE UNIQUE INDEX "pix_disclosure_grants_token_hash_key" ON "pix_disclosure_grants"("token_hash");
CREATE INDEX "pix_disclosure_grants_intent_actor_idx" ON "pix_disclosure_grants"("intent_id", "actor_user_id", "expires_at");
ALTER TABLE "pix_disclosure_grants" ADD CONSTRAINT "pix_disclosure_grants_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "direct_pix_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pix_disclosure_grants" ADD CONSTRAINT "pix_disclosure_grants_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "family_support_cycles" (
  "id" TEXT NOT NULL, "family_id" TEXT NOT NULL, "cycle_start_at" TIMESTAMP(3) NOT NULL, "cycle_end_at" TIMESTAMP(3) NOT NULL,
  "status" "FamilySupportCycleStatus" NOT NULL DEFAULT 'IN_PROGRESS', "blocked_at" TIMESTAMP(3) NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "family_support_cycles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "family_support_cycles_family_cycle_key" ON "family_support_cycles"("family_id", "cycle_start_at");
ALTER TABLE "family_support_cycles" ADD CONSTRAINT "family_support_cycles_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_intents" ADD CONSTRAINT "direct_pix_intents_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "family_support_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "direct_pix_declarations" (
  "id" TEXT NOT NULL, "intent_id" TEXT NOT NULL, "declared_by_user_id" TEXT NOT NULL, "declared_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_pix_declarations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "direct_pix_declarations_intent_id_key" ON "direct_pix_declarations"("intent_id");
ALTER TABLE "direct_pix_declarations" ADD CONSTRAINT "direct_pix_declarations_intent_id_fkey" FOREIGN KEY ("intent_id") REFERENCES "direct_pix_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_declarations" ADD CONSTRAINT "direct_pix_declarations_declared_by_user_id_fkey" FOREIGN KEY ("declared_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
