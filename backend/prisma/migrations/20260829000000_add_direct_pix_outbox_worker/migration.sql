-- Direct Pix transactional outbox worker. Operational rows contain opaque IDs and codes only.
CREATE TYPE "OutboxEventState" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'DEAD_LETTER');
CREATE TYPE "JobRunStatus" AS ENUM ('CLAIMED', 'PROCESSED', 'RETRIED', 'DEAD_LETTER');

ALTER TABLE "outbox_events"
  ADD COLUMN "state" "OutboxEventState" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "locked_at" TIMESTAMP(3),
  ADD COLUMN "locked_by" TEXT,
  ADD COLUMN "lease_expires_at" TIMESTAMP(3),
  ADD COLUMN "last_error_code" TEXT;

-- Existing rows retain their historical disposition when this is deployed.
UPDATE "outbox_events"
SET "state" = CASE WHEN "processed_at" IS NULL THEN 'PENDING'::"OutboxEventState" ELSE 'PROCESSED'::"OutboxEventState" END;

CREATE INDEX "outbox_events_state_available_at_idx" ON "outbox_events"("state", "available_at");
CREATE INDEX "outbox_events_state_lease_expires_at_idx" ON "outbox_events"("state", "lease_expires_at");

CREATE TABLE "in_app_notifications" (
  "id" TEXT NOT NULL,
  "outbox_event_id" TEXT NOT NULL,
  "recipient_user_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "email_sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "in_app_notifications_outbox_event_id_key" ON "in_app_notifications"("outbox_event_id");
CREATE INDEX "in_app_notifications_recipient_user_id_created_at_idx" ON "in_app_notifications"("recipient_user_id", "created_at");
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_outbox_event_id_fkey"
  FOREIGN KEY ("outbox_event_id") REFERENCES "outbox_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_recipient_user_id_fkey"
  FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "job_runs" (
  "id" TEXT NOT NULL,
  "job_name" TEXT NOT NULL,
  "outbox_event_id" TEXT NOT NULL,
  "scheduled_for" TIMESTAMP(3) NOT NULL,
  "lease_owner" TEXT NOT NULL,
  "lease_expires_at" TIMESTAMP(3) NOT NULL,
  "attempt" INTEGER NOT NULL,
  "status" "JobRunStatus" NOT NULL DEFAULT 'CLAIMED',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "duration_ms" INTEGER,
  "error_code" TEXT,
  CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "job_runs_job_name_started_at_idx" ON "job_runs"("job_name", "started_at");
CREATE INDEX "job_runs_outbox_event_id_attempt_idx" ON "job_runs"("outbox_event_id", "attempt");
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_outbox_event_id_fkey"
  FOREIGN KEY ("outbox_event_id") REFERENCES "outbox_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Error values are stable public operational codes, never arbitrary exception text.
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_last_error_code_safe"
  CHECK ("last_error_code" IS NULL OR "last_error_code" ~ '^[a-z0-9_]{1,64}$');
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_error_code_safe"
  CHECK ("error_code" IS NULL OR "error_code" ~ '^[a-z0-9_]{1,64}$');
