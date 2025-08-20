-- CreateEnum
CREATE TYPE "public"."BadgeTemplate" AS ENUM ('classic_blue', 'retro_green', 'sunset_orange', 'midnight_purple', 'matrix_green', 'neon_pink', 'vintage_brown', 'cyber_teal');

-- CreateTable
CREATE TABLE "public"."ThreadRingBadge" (
    "id" TEXT NOT NULL,
    "threadRingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "templateId" TEXT,
    "backgroundColor" TEXT NOT NULL DEFAULT '#4A90E2',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "isGenerated" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "ThreadRingBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRingBadge_threadRingId_key" ON "public"."ThreadRingBadge"("threadRingId");

-- CreateIndex
CREATE INDEX "ThreadRingBadge_threadRingId_idx" ON "public"."ThreadRingBadge"("threadRingId");

-- CreateIndex
CREATE INDEX "ThreadRingBadge_isActive_idx" ON "public"."ThreadRingBadge"("isActive");

-- AddForeignKey
ALTER TABLE "public"."ThreadRingBadge" ADD CONSTRAINT "ThreadRingBadge_threadRingId_fkey" FOREIGN KEY ("threadRingId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingBadge" ADD CONSTRAINT "ThreadRingBadge_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
