-- CreateEnum
CREATE TYPE "public"."ReportType" AS ENUM ('user', 'post', 'comment', 'threadring', 'guestbook_entry', 'photo_comment');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "public"."ReportReason" AS ENUM ('spam', 'harassment', 'hate_speech', 'violence', 'misinformation', 'sexual_content', 'copyright', 'other');

-- CreateTable
CREATE TABLE "public"."UserReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "reportType" "public"."ReportType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "public"."ReportReason" NOT NULL,
    "customReason" TEXT,
    "description" TEXT,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedUserId" TEXT,
    "blockedThreadRingId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserReport_reporterId_idx" ON "public"."UserReport"("reporterId");

-- CreateIndex
CREATE INDEX "UserReport_reportedUserId_idx" ON "public"."UserReport"("reportedUserId");

-- CreateIndex
CREATE INDEX "UserReport_status_createdAt_idx" ON "public"."UserReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "UserReport_targetId_reportType_idx" ON "public"."UserReport"("targetId", "reportType");

-- CreateIndex
CREATE INDEX "UserReport_reviewedBy_idx" ON "public"."UserReport"("reviewedBy");

-- CreateIndex
CREATE INDEX "UserBlock_blockerId_idx" ON "public"."UserBlock"("blockerId");

-- CreateIndex
CREATE INDEX "UserBlock_blockedUserId_idx" ON "public"."UserBlock"("blockedUserId");

-- CreateIndex
CREATE INDEX "UserBlock_blockedThreadRingId_idx" ON "public"."UserBlock"("blockedThreadRingId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedUserId_key" ON "public"."UserBlock"("blockerId", "blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBlock_blockerId_blockedThreadRingId_key" ON "public"."UserBlock"("blockerId", "blockedThreadRingId");

-- AddForeignKey
ALTER TABLE "public"."UserReport" ADD CONSTRAINT "UserReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserReport" ADD CONSTRAINT "UserReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserReport" ADD CONSTRAINT "UserReport_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBlock" ADD CONSTRAINT "UserBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBlock" ADD CONSTRAINT "UserBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserBlock" ADD CONSTRAINT "UserBlock_blockedThreadRingId_fkey" FOREIGN KEY ("blockedThreadRingId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
