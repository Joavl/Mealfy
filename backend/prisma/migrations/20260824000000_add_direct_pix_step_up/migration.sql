CREATE TYPE "StepUpPurpose" AS ENUM ('view_pix_key', 'change_pix_key', 'revoke_pix_key');

CREATE TABLE "step_up_challenges" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" "StepUpPurpose" NOT NULL,
  "resourceId" TEXT,
  "codeHash" TEXT NOT NULL,
  "sessionVersion" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "deliveredAt" TIMESTAMP(3),
  "failedAttempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "invalidatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "step_up_challenges_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "step_up_challenges_codeHash_key" ON "step_up_challenges"("codeHash");
CREATE INDEX "step_up_challenges_userId_purpose_createdAt_idx" ON "step_up_challenges"("userId", "purpose", "createdAt");
CREATE INDEX "step_up_challenges_expiresAt_idx" ON "step_up_challenges"("expiresAt");
ALTER TABLE "step_up_challenges" ADD CONSTRAINT "step_up_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "step_up_authorizations" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" "StepUpPurpose" NOT NULL,
  "resourceId" TEXT,
  "tokenHash" TEXT NOT NULL,
  "sessionVersion" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "step_up_authorizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "step_up_authorizations_tokenHash_key" ON "step_up_authorizations"("tokenHash");
CREATE INDEX "step_up_authorizations_userId_purpose_resourceId_expiresAt_idx" ON "step_up_authorizations"("userId", "purpose", "resourceId", "expiresAt");
CREATE INDEX "step_up_authorizations_expiresAt_idx" ON "step_up_authorizations"("expiresAt");
ALTER TABLE "step_up_authorizations" ADD CONSTRAINT "step_up_authorizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Shared, restart-safe counters for authentication abuse controls. Keys are one-way digests.
CREATE TABLE "auth_rate_limits" (
  "keyHash" TEXT NOT NULL,
  "hitCount" INTEGER NOT NULL,
  "windowStartedAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("keyHash")
);
CREATE INDEX "auth_rate_limits_expiresAt_idx" ON "auth_rate_limits"("expiresAt");
