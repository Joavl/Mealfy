-- Exclusive, historical authority for direct Pix family representatives.
CREATE TYPE "FamilyResponsibleAssignmentEndReason" AS ENUM ('reassigned', 'relationship_ended', 'account_inactive', 'data_correction');

CREATE TABLE "family_responsible_invitations" (
  "id" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "invitedByUserId" TEXT NOT NULL,
  "acceptedByUserId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "family_responsible_invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "family_responsible_assignments" (
  "id" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "responsibleUserId" TEXT NOT NULL,
  "invitationId" TEXT,
  "invitedByUserId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "endReason" "FamilyResponsibleAssignmentEndReason",
  CONSTRAINT "family_responsible_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "family_responsible_invitations_tokenHash_key" ON "family_responsible_invitations"("tokenHash");
CREATE UNIQUE INDEX "family_responsible_assignments_invitationId_key" ON "family_responsible_assignments"("invitationId");
CREATE INDEX "family_responsible_invitations_familyId_email_idx" ON "family_responsible_invitations"("familyId", "email");
CREATE INDEX "family_responsible_invitations_expiresAt_idx" ON "family_responsible_invitations"("expiresAt");
CREATE INDEX "family_responsible_assignments_familyId_endedAt_idx" ON "family_responsible_assignments"("familyId", "endedAt");
CREATE INDEX "family_responsible_assignments_responsibleUserId_endedAt_idx" ON "family_responsible_assignments"("responsibleUserId", "endedAt");

-- The two database-enforced cardinality invariants. Historical ended records are retained.
CREATE UNIQUE INDEX "family_responsible_assignments_one_active_family_key"
  ON "family_responsible_assignments"("familyId") WHERE "endedAt" IS NULL;
CREATE UNIQUE INDEX "family_responsible_assignments_one_active_user_key"
  ON "family_responsible_assignments"("responsibleUserId") WHERE "endedAt" IS NULL;

ALTER TABLE "family_responsible_invitations" ADD CONSTRAINT "family_responsible_invitations_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "family_responsible_invitations" ADD CONSTRAINT "family_responsible_invitations_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "family_responsible_invitations" ADD CONSTRAINT "family_responsible_invitations_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "family_responsible_assignments" ADD CONSTRAINT "family_responsible_assignments_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "family_responsible_assignments" ADD CONSTRAINT "family_responsible_assignments_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "family_responsible_assignments" ADD CONSTRAINT "family_responsible_assignments_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "family_responsible_invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "family_responsible_assignments" ADD CONSTRAINT "family_responsible_assignments_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
