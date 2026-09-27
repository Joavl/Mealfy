-- Assisted submissions are held until the currently assigned family responsible confirms them.
ALTER TYPE "DirectPixEvpKeyVersionStatus" ADD VALUE 'AWAITING_RESPONSIBLE_CONFIRMATION' BEFORE 'PENDING_REVIEW';
