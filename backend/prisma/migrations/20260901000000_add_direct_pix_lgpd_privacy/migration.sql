-- Direct Pix-only LGPD controls. Legacy donation/payment aggregates are intentionally untouched.
CREATE TABLE "direct_pix_privacy_deactivations" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "direct_pix_privacy_deactivations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "direct_pix_privacy_deactivations_user_id_key" ON "direct_pix_privacy_deactivations"("user_id");
CREATE INDEX "direct_pix_privacy_deactivations_requested_at_idx" ON "direct_pix_privacy_deactivations"("requested_at");
ALTER TABLE "direct_pix_privacy_deactivations" ADD CONSTRAINT "direct_pix_privacy_deactivations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "direct_pix_legal_holds" (
  "id" TEXT NOT NULL,
  "subject_user_id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "released_at" TIMESTAMP(3),
  CONSTRAINT "direct_pix_legal_holds_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "direct_pix_legal_holds_subject_user_id_released_at_idx" ON "direct_pix_legal_holds"("subject_user_id", "released_at");
ALTER TABLE "direct_pix_legal_holds" ADD CONSTRAINT "direct_pix_legal_holds_subject_user_id_fkey" FOREIGN KEY ("subject_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
