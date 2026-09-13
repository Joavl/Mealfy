-- Top 20 manual, composto exclusivamente por usuários do tipo doador.
CREATE TABLE "ranking_stories" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ranking_stories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ranking_stories_donorId_key" ON "ranking_stories"("donorId");
CREATE UNIQUE INDEX "ranking_stories_position_key" ON "ranking_stories"("position");
CREATE INDEX "ranking_stories_position_idx" ON "ranking_stories"("position");
CREATE INDEX "donations_status_donorId_idx" ON "donations"("status", "donorId");

ALTER TABLE "ranking_stories"
  ADD CONSTRAINT "ranking_stories_donorId_fkey"
  FOREIGN KEY ("donorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
