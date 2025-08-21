/*
  Warnings:

  - You are about to drop the column `createdBy` on the `ThreadRingBadge` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."ThreadRingBlockType" AS ENUM ('user', 'instance', 'actor');

-- DropForeignKey
ALTER TABLE "public"."ThreadRingBadge" DROP CONSTRAINT "ThreadRingBadge_createdBy_fkey";

-- AlterTable
ALTER TABLE "public"."ThreadRingBadge" DROP COLUMN "createdBy";

-- CreateTable
CREATE TABLE "public"."ThreadRingPrompt" (
    "id" TEXT NOT NULL,
    "threadRingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreadRingPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostThreadRingPrompt" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostThreadRingPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ThreadRingBlock" (
    "id" TEXT NOT NULL,
    "threadRingId" TEXT NOT NULL,
    "blockedUserId" TEXT,
    "blockedInstance" TEXT,
    "blockedActorUri" TEXT,
    "blockType" "public"."ThreadRingBlockType" NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadRingBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThreadRingPrompt_threadRingId_isActive_idx" ON "public"."ThreadRingPrompt"("threadRingId", "isActive");

-- CreateIndex
CREATE INDEX "ThreadRingPrompt_threadRingId_startsAt_idx" ON "public"."ThreadRingPrompt"("threadRingId", "startsAt");

-- CreateIndex
CREATE INDEX "ThreadRingPrompt_threadRingId_isPinned_idx" ON "public"."ThreadRingPrompt"("threadRingId", "isPinned");

-- CreateIndex
CREATE INDEX "PostThreadRingPrompt_promptId_createdAt_idx" ON "public"."PostThreadRingPrompt"("promptId", "createdAt");

-- CreateIndex
CREATE INDEX "PostThreadRingPrompt_postId_idx" ON "public"."PostThreadRingPrompt"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PostThreadRingPrompt_postId_promptId_key" ON "public"."PostThreadRingPrompt"("postId", "promptId");

-- CreateIndex
CREATE INDEX "ThreadRingBlock_threadRingId_blockType_idx" ON "public"."ThreadRingBlock"("threadRingId", "blockType");

-- CreateIndex
CREATE INDEX "ThreadRingBlock_blockedUserId_idx" ON "public"."ThreadRingBlock"("blockedUserId");

-- CreateIndex
CREATE INDEX "ThreadRingBlock_blockedInstance_idx" ON "public"."ThreadRingBlock"("blockedInstance");

-- CreateIndex
CREATE INDEX "ThreadRingBlock_createdBy_idx" ON "public"."ThreadRingBlock"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRingBlock_threadRingId_blockedUserId_key" ON "public"."ThreadRingBlock"("threadRingId", "blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRingBlock_threadRingId_blockedInstance_key" ON "public"."ThreadRingBlock"("threadRingId", "blockedInstance");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRingBlock_threadRingId_blockedActorUri_key" ON "public"."ThreadRingBlock"("threadRingId", "blockedActorUri");

-- AddForeignKey
ALTER TABLE "public"."ThreadRingPrompt" ADD CONSTRAINT "ThreadRingPrompt_threadRingId_fkey" FOREIGN KEY ("threadRingId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingPrompt" ADD CONSTRAINT "ThreadRingPrompt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostThreadRingPrompt" ADD CONSTRAINT "PostThreadRingPrompt_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostThreadRingPrompt" ADD CONSTRAINT "PostThreadRingPrompt_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "public"."ThreadRingPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingBlock" ADD CONSTRAINT "ThreadRingBlock_threadRingId_fkey" FOREIGN KEY ("threadRingId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingBlock" ADD CONSTRAINT "ThreadRingBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingBlock" ADD CONSTRAINT "ThreadRingBlock_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
