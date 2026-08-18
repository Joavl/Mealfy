-- CreateEnum
CREATE TYPE "CommunitySource" AS ENUM ('osm', 'declared', 'region_centroid');

-- DropIndex
DROP INDEX "families_regionId_idx";

-- DropIndex
DROP INDEX "families_supportRequestedAt_idx";

-- AlterTable
ALTER TABLE "families" ADD COLUMN     "communityId" TEXT;

-- CreateTable
CREATE TABLE "communities" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameSearch" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "source" "CommunitySource" NOT NULL DEFAULT 'declared',
    "osmId" TEXT,
    "geocodedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "communities_regionId_idx" ON "communities"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "communities_regionId_nameSearch_key" ON "communities"("regionId", "nameSearch");

-- AddForeignKey
ALTER TABLE "communities" ADD CONSTRAINT "communities_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
