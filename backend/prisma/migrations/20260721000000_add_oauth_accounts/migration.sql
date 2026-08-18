-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('google', 'facebook', 'apple', 'govbr');

-- AlterTable: CPF verificado (Gov.br)
ALTER TABLE "users" ADD COLUMN "cpf" TEXT;

-- CreateIndex: CPF único quando presente
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateTable: identidades sociais vinculadas
CREATE TABLE "oauth_accounts" (
    "id" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_providerUserId_key" ON "oauth_accounts"("provider", "providerUserId");

-- CreateIndex
CREATE INDEX "oauth_accounts_userId_idx" ON "oauth_accounts"("userId");

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
