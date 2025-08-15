-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('comment', 'reply', 'follow', 'friend', 'guestbook');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('unread', 'read', 'dismissed');

-- AlterTable
ALTER TABLE "public"."Comment" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "status" "public"."NotificationStatus" NOT NULL DEFAULT 'unread',
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_recipientId_status_createdAt_idx" ON "public"."Notification"("recipientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_actorId_type_idx" ON "public"."Notification"("recipientId", "actorId", "type");

-- AddForeignKey
ALTER TABLE "public"."Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
