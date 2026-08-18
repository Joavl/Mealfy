-- Drift capturado via `prisma migrate diff` (banco ↔ schema) em 22/07/2026:
-- preferências de privacidade do usuário + fulfillment assíncrono de gift cards.

-- CreateEnum
CREATE TYPE "GiftCardProviderName" AS ENUM ('manual_inventory', 'todo_incomm', 'incentive_me', 'ding_connect', 'ifood_card', 'stub');

-- CreateEnum
CREATE TYPE "GiftCardOrderStatus" AS ENUM ('pending', 'processing', 'issued', 'failed', 'manual_review', 'canceled');

-- AlterEnum
ALTER TYPE "DonationStatus" ADD VALUE 'gift_card_purchase_pending';
ALTER TYPE "DonationStatus" ADD VALUE 'manual_review';

-- DropForeignKey
ALTER TABLE "gift_cards" DROP CONSTRAINT "gift_cards_batchId_fkey";

-- AlterTable
ALTER TABLE "gift_cards" ALTER COLUMN "batchId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "anonymousMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showInstagram" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showOnRanking" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "gift_card_orders" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "provider" "GiftCardProvider" NOT NULL,
    "externalProvider" "GiftCardProviderName" NOT NULL DEFAULT 'manual_inventory',
    "externalOrderId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "GiftCardOrderStatus" NOT NULL DEFAULT 'pending',
    "failureReason" TEXT,
    "rawRequestMetadata" JSONB,
    "rawResponseMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_card_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gift_card_orders_idempotencyKey_key" ON "gift_card_orders"("idempotencyKey");

-- CreateIndex
CREATE INDEX "gift_card_orders_donationId_idx" ON "gift_card_orders"("donationId");

-- CreateIndex
CREATE INDEX "gift_card_orders_familyId_idx" ON "gift_card_orders"("familyId");

-- CreateIndex
CREATE INDEX "gift_card_orders_status_idx" ON "gift_card_orders"("status");

-- AddForeignKey
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "gift_card_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
