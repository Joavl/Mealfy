ALTER TABLE "direct_pix_old_qr_declarations"
  ADD COLUMN "reason_code" TEXT NOT NULL DEFAULT 'SAVED_QR_CODE';

ALTER TABLE "direct_pix_old_qr_declarations"
  ADD CONSTRAINT "direct_pix_old_qr_declarations_reason_code_check"
  CHECK ("reason_code" IN ('SAVED_QR_CODE', 'LATE_DECLARATION', 'OTHER'));
