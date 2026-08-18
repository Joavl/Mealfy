-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('donor', 'entity', 'beneficiary', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'pending', 'suspended', 'blocked');

-- CreateEnum
CREATE TYPE "GiftCardProvider" AS ENUM ('ifood', 'ninetynine', 'carrefour');

-- CreateEnum
CREATE TYPE "FamilyApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'blocked');

-- CreateEnum
CREATE TYPE "FamilyVerificationStatus" AS ENUM ('unverified', 'gov_mock', 'manual');

-- CreateEnum
CREATE TYPE "FamilySupportStatus" AS ENUM ('needs_help', 'supported', 'fed');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('gov', 'manual');

-- CreateEnum
CREATE TYPE "LocationPrecision" AS ENUM ('approximate', 'exact_admin_only');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('pending_payment', 'payment_confirmed', 'gift_card_reserved', 'gift_card_released', 'completed', 'failed', 'canceled', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'expired', 'canceled', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('pix');

-- CreateEnum
CREATE TYPE "GiftCardStatus" AS ENUM ('available', 'reserved', 'used', 'expired', 'invalid');

-- CreateEnum
CREATE TYPE "RecurringStatus" AS ENUM ('active', 'paused', 'canceled');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL,
    "avatarUrl" TEXT,
    "instagram" TEXT,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donor_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicSlug" TEXT NOT NULL,
    "totalDonations" INTEGER NOT NULL DEFAULT 0,
    "totalFamiliesHelped" INTEGER NOT NULL DEFAULT 0,
    "rankingPosition" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "responsibleName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "responsibleName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "entityId" TEXT,
    "nisMasked" TEXT,
    "cpfMasked" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "neighborhood" TEXT,
    "community" TEXT,
    "approximateAddress" TEXT,
    "fullAddressEncrypted" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationPrecision" "LocationPrecision" NOT NULL DEFAULT 'approximate',
    "preferredGiftCardProvider" "GiftCardProvider",
    "todayRequestedProvider" "GiftCardProvider",
    "supportStatus" "FamilySupportStatus" NOT NULL DEFAULT 'needs_help',
    "lastFedAt" TIMESTAMP(3),
    "lastDonationId" TEXT,
    "lastDonorId" TEXT,
    "lastDonorName" TEXT,
    "lastDonorInstagram" TEXT,
    "lastGiftCardProvider" "GiftCardProvider",
    "verificationStatus" "FamilyVerificationStatus" NOT NULL DEFAULT 'unverified',
    "approvalStatus" "FamilyApprovalStatus" NOT NULL DEFAULT 'pending',
    "dataSource" "DataSource" NOT NULL DEFAULT 'manual',
    "socialDescription" TEXT,
    "needToday" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_dependents" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "relationship" TEXT,
    "isEligibleMinor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_dependents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "provider" "GiftCardProvider" NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'pending_payment',
    "paymentId" TEXT,
    "giftCardId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'pix',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "amount" INTEGER NOT NULL,
    "pixQrCode" TEXT,
    "pixCopyPaste" TEXT,
    "externalPaymentId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_cards" (
    "id" TEXT NOT NULL,
    "provider" "GiftCardProvider" NOT NULL,
    "codeEncrypted" TEXT NOT NULL,
    "codeMasked" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "GiftCardStatus" NOT NULL DEFAULT 'available',
    "batchId" TEXT NOT NULL,
    "reservedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "donationId" TEXT,
    "familyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_card_batches" (
    "id" TEXT NOT NULL,
    "provider" "GiftCardProvider" NOT NULL,
    "batchName" TEXT NOT NULL,
    "importedByUserId" TEXT NOT NULL,
    "totalCodes" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_card_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gift_card_events" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "userId" TEXT,
    "donationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gift_card_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_support_intents" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "status" "RecurringStatus" NOT NULL DEFAULT 'active',
    "type" TEXT NOT NULL DEFAULT 'daily_reminder',
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "maxDailyAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_support_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "donor_profiles_userId_key" ON "donor_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "donor_profiles_publicSlug_key" ON "donor_profiles"("publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "entities_userId_key" ON "entities"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "entities_cnpj_key" ON "entities"("cnpj");

-- CreateIndex
CREATE INDEX "families_approvalStatus_idx" ON "families"("approvalStatus");

-- CreateIndex
CREATE INDEX "families_entityId_idx" ON "families"("entityId");

-- CreateIndex
CREATE INDEX "family_dependents_familyId_idx" ON "family_dependents"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "donations_paymentId_key" ON "donations"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "donations_giftCardId_key" ON "donations"("giftCardId");

-- CreateIndex
CREATE INDEX "donations_donorId_idx" ON "donations"("donorId");

-- CreateIndex
CREATE INDEX "donations_familyId_idx" ON "donations"("familyId");

-- CreateIndex
CREATE INDEX "donations_status_idx" ON "donations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_donationId_key" ON "payments"("donationId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_externalPaymentId_key" ON "payments"("externalPaymentId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_externalEventId_key" ON "payment_events"("externalEventId");

-- CreateIndex
CREATE INDEX "payment_events_paymentId_idx" ON "payment_events"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "gift_cards_codeHash_key" ON "gift_cards"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "gift_cards_donationId_key" ON "gift_cards"("donationId");

-- CreateIndex
CREATE INDEX "gift_cards_provider_status_idx" ON "gift_cards"("provider", "status");

-- CreateIndex
CREATE INDEX "gift_cards_batchId_idx" ON "gift_cards"("batchId");

-- CreateIndex
CREATE INDEX "gift_card_events_giftCardId_idx" ON "gift_card_events"("giftCardId");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_donorId_familyId_key" ON "favorites"("donorId", "familyId");

-- CreateIndex
CREATE INDEX "recurring_support_intents_donorId_idx" ON "recurring_support_intents"("donorId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "donor_profiles" ADD CONSTRAINT "donor_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_dependents" ADD CONSTRAINT "family_dependents_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "gift_card_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

