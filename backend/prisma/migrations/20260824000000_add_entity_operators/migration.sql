-- Add identifiable entity operators with explicit, entity-scoped authority.
CREATE TYPE "EntityOperatorStatus" AS ENUM ('active', 'suspended', 'revoked');

CREATE TABLE "entity_operator_memberships" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "EntityOperatorStatus" NOT NULL DEFAULT 'active',
  "permissions" TEXT[] NOT NULL,
  "invitedByUserId" TEXT,
  "activatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "suspendedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "entity_operator_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "entity_operator_invitations" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "permissions" TEXT[] NOT NULL,
  "invitedByUserId" TEXT NOT NULL,
  "acceptedByUserId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "entity_operator_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "entity_operator_memberships_entityId_userId_key" ON "entity_operator_memberships"("entityId", "userId");
CREATE INDEX "entity_operator_memberships_userId_status_idx" ON "entity_operator_memberships"("userId", "status");
CREATE INDEX "entity_operator_memberships_entityId_status_idx" ON "entity_operator_memberships"("entityId", "status");
CREATE UNIQUE INDEX "entity_operator_invitations_tokenHash_key" ON "entity_operator_invitations"("tokenHash");
CREATE INDEX "entity_operator_invitations_entityId_email_idx" ON "entity_operator_invitations"("entityId", "email");
CREATE INDEX "entity_operator_invitations_expiresAt_idx" ON "entity_operator_invitations"("expiresAt");

ALTER TABLE "entity_operator_memberships" ADD CONSTRAINT "entity_operator_memberships_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entity_operator_memberships" ADD CONSTRAINT "entity_operator_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entity_operator_memberships" ADD CONSTRAINT "entity_operator_memberships_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "entity_operator_invitations" ADD CONSTRAINT "entity_operator_invitations_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entity_operator_invitations" ADD CONSTRAINT "entity_operator_invitations_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entity_operator_invitations" ADD CONSTRAINT "entity_operator_invitations_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A user may operate only one entity at a time. Suspended and revoked links retain history.
CREATE UNIQUE INDEX "entity_operator_memberships_one_active_user_key"
  ON "entity_operator_memberships"("userId") WHERE "status" = 'active';

-- Existing institutional users become active managers. This preserves access while
-- making the membership, rather than Entity.userId, the authority source.
INSERT INTO "entity_operator_memberships" (
  "id", "entityId", "userId", "status", "permissions", "activatedAt", "createdAt", "updatedAt"
)
SELECT gen_random_uuid()::text, e."id", e."userId", 'active'::"EntityOperatorStatus",
  ARRAY['operators.manage','families.read','families.write','pix.submit','pix.review','pix.follow_up','audit.read']::TEXT[],
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "entities" e
ON CONFLICT ("entityId", "userId") DO NOTHING;

CREATE TABLE "direct_pix_operator_actions" (
  "id" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_pix_operator_actions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "direct_pix_operator_actions_resourceType_resourceId_action_idx" ON "direct_pix_operator_actions"("resourceType", "resourceId", "action");
CREATE INDEX "direct_pix_operator_actions_entityId_createdAt_idx" ON "direct_pix_operator_actions"("entityId", "createdAt");
ALTER TABLE "direct_pix_operator_actions" ADD CONSTRAINT "direct_pix_operator_actions_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_operator_actions" ADD CONSTRAINT "direct_pix_operator_actions_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "entity_operator_memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "direct_pix_operator_actions" ADD CONSTRAINT "direct_pix_operator_actions_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
