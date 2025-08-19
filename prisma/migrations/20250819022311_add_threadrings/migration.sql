-- CreateEnum
CREATE TYPE "public"."ThreadRingJoinType" AS ENUM ('open', 'invite', 'closed');

-- CreateEnum
CREATE TYPE "public"."ThreadRingVisibility" AS ENUM ('public', 'unlisted', 'private');

-- CreateEnum
CREATE TYPE "public"."ThreadRingRole" AS ENUM ('member', 'moderator', 'curator');

-- CreateEnum
CREATE TYPE "public"."ThreadRingInviteStatus" AS ENUM ('pending', 'accepted', 'declined', 'revoked');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'threadring_invite';
ALTER TYPE "public"."NotificationType" ADD VALUE 'threadring_join';
ALTER TYPE "public"."NotificationType" ADD VALUE 'threadring_post';
ALTER TYPE "public"."NotificationType" ADD VALUE 'threadring_fork';

-- CreateTable
CREATE TABLE "public"."ThreadRing" (
    "id" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "curatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "joinType" "public"."ThreadRingJoinType" NOT NULL DEFAULT 'open',
    "visibility" "public"."ThreadRingVisibility" NOT NULL DEFAULT 'public',
    "memberCount" INTEGER NOT NULL DEFAULT 1,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "currentPrompt" TEXT,
    "curatorNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreadRing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ThreadRingMember" (
    "id" TEXT NOT NULL,
    "threadRingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."ThreadRingRole" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadRingMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostThreadRing" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "threadRingId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "pinnedBy" TEXT,

    CONSTRAINT "PostThreadRing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ThreadRingInvite" (
    "id" TEXT NOT NULL,
    "threadRingId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "public"."ThreadRingInviteStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ThreadRingInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRing_uri_key" ON "public"."ThreadRing"("uri");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRing_slug_key" ON "public"."ThreadRing"("slug");

-- CreateIndex
CREATE INDEX "ThreadRing_curatorId_idx" ON "public"."ThreadRing"("curatorId");

-- CreateIndex
CREATE INDEX "ThreadRing_slug_idx" ON "public"."ThreadRing"("slug");

-- CreateIndex
CREATE INDEX "ThreadRing_uri_idx" ON "public"."ThreadRing"("uri");

-- CreateIndex
CREATE INDEX "ThreadRing_visibility_joinType_idx" ON "public"."ThreadRing"("visibility", "joinType");

-- CreateIndex
CREATE INDEX "ThreadRing_memberCount_postCount_idx" ON "public"."ThreadRing"("memberCount", "postCount");

-- CreateIndex
CREATE INDEX "ThreadRingMember_userId_idx" ON "public"."ThreadRingMember"("userId");

-- CreateIndex
CREATE INDEX "ThreadRingMember_threadRingId_role_idx" ON "public"."ThreadRingMember"("threadRingId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRingMember_threadRingId_userId_key" ON "public"."ThreadRingMember"("threadRingId", "userId");

-- CreateIndex
CREATE INDEX "PostThreadRing_threadRingId_addedAt_idx" ON "public"."PostThreadRing"("threadRingId", "addedAt");

-- CreateIndex
CREATE INDEX "PostThreadRing_threadRingId_isPinned_pinnedAt_idx" ON "public"."PostThreadRing"("threadRingId", "isPinned", "pinnedAt");

-- CreateIndex
CREATE INDEX "PostThreadRing_postId_idx" ON "public"."PostThreadRing"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "PostThreadRing_postId_threadRingId_key" ON "public"."PostThreadRing"("postId", "threadRingId");

-- CreateIndex
CREATE INDEX "ThreadRingInvite_inviteeId_status_idx" ON "public"."ThreadRingInvite"("inviteeId", "status");

-- CreateIndex
CREATE INDEX "ThreadRingInvite_threadRingId_idx" ON "public"."ThreadRingInvite"("threadRingId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRingInvite_threadRingId_inviteeId_key" ON "public"."ThreadRingInvite"("threadRingId", "inviteeId");

-- AddForeignKey
ALTER TABLE "public"."ThreadRing" ADD CONSTRAINT "ThreadRing_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingMember" ADD CONSTRAINT "ThreadRingMember_threadRingId_fkey" FOREIGN KEY ("threadRingId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingMember" ADD CONSTRAINT "ThreadRingMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostThreadRing" ADD CONSTRAINT "PostThreadRing_postId_fkey" FOREIGN KEY ("postId") REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostThreadRing" ADD CONSTRAINT "PostThreadRing_threadRingId_fkey" FOREIGN KEY ("threadRingId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostThreadRing" ADD CONSTRAINT "PostThreadRing_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingInvite" ADD CONSTRAINT "ThreadRingInvite_threadRingId_fkey" FOREIGN KEY ("threadRingId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingInvite" ADD CONSTRAINT "ThreadRingInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingInvite" ADD CONSTRAINT "ThreadRingInvite_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
