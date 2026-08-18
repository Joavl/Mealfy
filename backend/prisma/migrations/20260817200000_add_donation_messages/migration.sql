-- Mensagens trocadas em torno de uma doação (doador ↔ beneficiário).
-- Nesta versão o conteúdo vem sempre de uma lista fixa: guardamos a CHAVE do
-- template (garante que só mensagem prevista entre) e o TEXTO renderizado no
-- envio (congela o histórico se o template for reescrito depois).

-- CreateEnum
CREATE TYPE "DonationMessageAuthor" AS ENUM ('donor', 'beneficiary');

-- CreateTable
CREATE TABLE "donation_messages" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "author" "DonationMessageAuthor" NOT NULL,
    "templateKey" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: uma mensagem por lado, por doação
CREATE UNIQUE INDEX "donation_messages_donationId_author_key" ON "donation_messages"("donationId", "author");

-- CreateIndex
CREATE INDEX "donation_messages_donationId_idx" ON "donation_messages"("donationId");

-- AddForeignKey
ALTER TABLE "donation_messages" ADD CONSTRAINT "donation_messages_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "donations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
