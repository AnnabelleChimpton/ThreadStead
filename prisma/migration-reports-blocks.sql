-- Add new enums for reporting system
CREATE TYPE "ReportType" AS ENUM ('user', 'post', 'comment', 'threadring', 'guestbook_entry', 'photo_comment');
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
CREATE TYPE "ReportReason" AS ENUM ('spam', 'harassment', 'hate_speech', 'violence', 'misinformation', 'sexual_content', 'copyright', 'other');

-- User Reports table
CREATE TABLE "UserReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "reportType" "ReportType" NOT NULL,
    "targetId" TEXT NOT NULL, -- ID of the reported content (post, comment, etc.)
    "reason" "ReportReason" NOT NULL,
    "customReason" TEXT,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

-- User Blocks table (personal blocklists)
CREATE TABLE "UserBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedUserId" TEXT,
    "blockedThreadRingId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserReport" ADD CONSTRAINT "UserReport_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBlock" ADD CONSTRAINT "UserBlock_blockedThreadRingId_fkey" FOREIGN KEY ("blockedThreadRingId") REFERENCES "ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "UserReport_reporterId_idx" ON "UserReport"("reporterId");
CREATE INDEX "UserReport_reportedUserId_idx" ON "UserReport"("reportedUserId");
CREATE INDEX "UserReport_status_createdAt_idx" ON "UserReport"("status", "createdAt");
CREATE INDEX "UserReport_targetId_reportType_idx" ON "UserReport"("targetId", "reportType");
CREATE INDEX "UserReport_reviewedBy_idx" ON "UserReport"("reviewedBy");

CREATE INDEX "UserBlock_blockerId_idx" ON "UserBlock"("blockerId");
CREATE INDEX "UserBlock_blockedUserId_idx" ON "UserBlock"("blockedUserId");
CREATE INDEX "UserBlock_blockedThreadRingId_idx" ON "UserBlock"("blockedThreadRingId");

-- Unique constraints to prevent duplicate blocks
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedUserId_key" ON "UserBlock"("blockerId", "blockedUserId") WHERE "blockedUserId" IS NOT NULL;
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedThreadRingId_key" ON "UserBlock"("blockerId", "blockedThreadRingId") WHERE "blockedThreadRingId" IS NOT NULL;