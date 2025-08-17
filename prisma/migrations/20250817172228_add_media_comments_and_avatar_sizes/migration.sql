-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."NotificationType" ADD VALUE 'photo_comment';
ALTER TYPE "public"."NotificationType" ADD VALUE 'photo_reply';

-- AlterTable
ALTER TABLE "public"."Profile" ADD COLUMN     "avatarFullUrl" TEXT,
ADD COLUMN     "avatarMediumUrl" TEXT,
ADD COLUMN     "avatarThumbnailUrl" TEXT,

-- CreateTable
CREATE TABLE "public"."Media" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caption" TEXT,
    "title" TEXT,
    "thumbnailUrl" TEXT NOT NULL,
    "mediumUrl" TEXT NOT NULL,
    "fullUrl" TEXT NOT NULL,
    "originalName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder" INTEGER,
    "visibility" "public"."Visibility" NOT NULL DEFAULT 'public',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PhotoComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mediaId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "status" "public"."CommentStatus" NOT NULL DEFAULT 'visible',

    CONSTRAINT "PhotoComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Media_userId_featured_featuredOrder_idx" ON "public"."Media"("userId", "featured", "featuredOrder");

-- CreateIndex
CREATE INDEX "Media_userId_createdAt_idx" ON "public"."Media"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Media_userId_visibility_idx" ON "public"."Media"("userId", "visibility");

-- CreateIndex
CREATE INDEX "PhotoComment_mediaId_createdAt_idx" ON "public"."PhotoComment"("mediaId", "createdAt");

-- CreateIndex
CREATE INDEX "PhotoComment_authorId_createdAt_idx" ON "public"."PhotoComment"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "PhotoComment_parentId_idx" ON "public"."PhotoComment"("parentId");

-- AddForeignKey
ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhotoComment" ADD CONSTRAINT "PhotoComment_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "public"."Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhotoComment" ADD CONSTRAINT "PhotoComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PhotoComment" ADD CONSTRAINT "PhotoComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."PhotoComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
