-- Transactional foundation for direct Pix mutations: immutable terms acceptance,
-- request idempotency, append-only audit metadata and an atomic outbox.
ALTER TABLE "audit_logs"
  ADD COLUMN "actor_role" "UserRole",
  ADD COLUMN "channel" TEXT,
  ADD COLUMN "correlation_id" TEXT,
  ADD COLUMN "idempotency_key" TEXT,
  ADD COLUMN "result" TEXT;

CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

CREATE TABLE "direct_pix_terms_versions" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "statements" JSONB NOT NULL,
  "published_at" TIMESTAMP(3) NOT NULL,
  "effective_at" TIMESTAMP(3) NOT NULL,
  "is_current" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_pix_terms_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "direct_pix_terms_versions_version_key" ON "direct_pix_terms_versions"("version");
CREATE UNIQUE INDEX "direct_pix_terms_versions_one_current_idx"
  ON "direct_pix_terms_versions" (("is_current")) WHERE "is_current" = true;

CREATE TABLE "direct_pix_terms_acceptances" (
  "id" TEXT NOT NULL,
  "terms_version_id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "actor_role" "UserRole" NOT NULL,
  "channel" TEXT NOT NULL,
  "correlation_id" TEXT NOT NULL,
  "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_pix_terms_acceptances_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "direct_pix_terms_acceptances_actor_version_key"
  ON "direct_pix_terms_acceptances"("actor_user_id", "terms_version_id");
CREATE INDEX "direct_pix_terms_acceptances_actor_accepted_idx"
  ON "direct_pix_terms_acceptances"("actor_user_id", "accepted_at");
ALTER TABLE "direct_pix_terms_acceptances"
  ADD CONSTRAINT "direct_pix_terms_acceptances_terms_version_id_fkey"
  FOREIGN KEY ("terms_version_id") REFERENCES "direct_pix_terms_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_terms_acceptances"
  ADD CONSTRAINT "direct_pix_terms_acceptances_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "idempotency_records" (
  "id" TEXT NOT NULL,
  "actor_user_id" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "request_hash" TEXT NOT NULL,
  "resource_type" TEXT,
  "resource_id" TEXT,
  "status" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "idempotency_records_actor_operation_key_key"
  ON "idempotency_records"("actor_user_id", "operation", "idempotency_key");
CREATE INDEX "idempotency_records_expires_at_idx" ON "idempotency_records"("expires_at");
ALTER TABLE "idempotency_records"
  ADD CONSTRAINT "idempotency_records_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "outbox_events" (
  "id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "dedupe_key" TEXT NOT NULL,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "outbox_events_dedupe_key_key" ON "outbox_events"("dedupe_key");
CREATE INDEX "outbox_events_available_processed_idx" ON "outbox_events"("available_at", "processed_at");

-- Corrections are represented by new records. Published terms, acceptances and
-- audit evidence cannot be altered or removed after insertion.
CREATE FUNCTION reject_append_only_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% are append-only', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER audit_logs_append_only_rows
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();
CREATE FUNCTION reject_terms_content_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE'
    OR NEW."version" IS DISTINCT FROM OLD."version"
    OR NEW."title" IS DISTINCT FROM OLD."title"
    OR NEW."statements" IS DISTINCT FROM OLD."statements"
    OR NEW."published_at" IS DISTINCT FROM OLD."published_at"
    OR NEW."effective_at" IS DISTINCT FROM OLD."effective_at"
    OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
    RAISE EXCEPTION 'published direct Pix terms content is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER direct_pix_terms_versions_immutable_content
  BEFORE UPDATE OR DELETE ON "direct_pix_terms_versions"
  FOR EACH ROW EXECUTE FUNCTION reject_terms_content_mutation();
CREATE TRIGGER direct_pix_terms_acceptances_append_only_rows
  BEFORE UPDATE OR DELETE ON "direct_pix_terms_acceptances"
  FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

-- Deliberately no current terms are seeded here. Publishing legally approved terms
-- is an explicit operational action; tests insert synthetic fixtures themselves.
