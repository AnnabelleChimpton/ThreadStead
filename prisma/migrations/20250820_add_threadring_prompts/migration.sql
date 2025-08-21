-- CreateTable
CREATE TABLE "ThreadRingPrompt" (
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
CREATE TABLE "PostThreadRingPrompt" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostThreadRingPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ThreadRingPrompt_threadRingId_isActive_idx" ON "ThreadRingPrompt"("threadRingId", "isActive");

-- CreateIndex
CREATE INDEX "ThreadRingPrompt_threadRingId_startsAt_idx" ON "ThreadRingPrompt"("threadRingId", "startsAt");

-- CreateIndex
CREATE INDEX "ThreadRingPrompt_threadRingId_isPinned_idx" ON "ThreadRingPrompt"("threadRingId", "isPinned");

-- CreateIndex
CREATE UNIQUE INDEX "PostThreadRingPrompt_postId_promptId_key" ON "PostThreadRingPrompt"("postId", "promptId");

-- CreateIndex
CREATE INDEX "PostThreadRingPrompt_promptId_createdAt_idx" ON "PostThreadRingPrompt"("promptId", "createdAt");

-- CreateIndex
CREATE INDEX "PostThreadRingPrompt_postId_idx" ON "PostThreadRingPrompt"("postId");

-- AddForeignKey
ALTER TABLE "ThreadRingPrompt" ADD CONSTRAINT "ThreadRingPrompt_threadRingId_fkey" FOREIGN KEY ("threadRingId") REFERENCES "ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadRingPrompt" ADD CONSTRAINT "ThreadRingPrompt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostThreadRingPrompt" ADD CONSTRAINT "PostThreadRingPrompt_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostThreadRingPrompt" ADD CONSTRAINT "PostThreadRingPrompt_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "ThreadRingPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (Drop column that was accidentally added)
ALTER TABLE "ThreadRingBadge" DROP COLUMN IF EXISTS "createdBy";