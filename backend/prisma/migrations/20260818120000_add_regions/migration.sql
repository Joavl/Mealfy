-- Municípios do IBGE como lista canônica de áreas.
-- Antes, "área" era texto livre em cada família e só existia se houvesse
-- cadastro ali. Agora o município tem identidade oficial (código IBGE) e existe
-- independentemente de haver família.

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "ibgeCode" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    -- Centroide da malha do IBGE, preenchido sob demanda (ver regions.service).
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_ibgeCode_key" ON "regions"("ibgeCode");
CREATE INDEX "regions_state_idx" ON "regions"("state");
CREATE INDEX "regions_name_idx" ON "regions"("name");

-- AlterTable: vínculo opcional para não quebrar famílias já cadastradas.
-- A associação das existentes é feita pelo script de backfill.
ALTER TABLE "families" ADD COLUMN "regionId" TEXT;

-- CreateIndex
CREATE INDEX "families_regionId_idx" ON "families"("regionId");

-- AddForeignKey: SET NULL para que remover uma região nunca apague família.
ALTER TABLE "families" ADD CONSTRAINT "families_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
