-- CreateEnum
CREATE TYPE "BookmarkSourceType" AS ENUM ('community_index', 'site_content', 'external_search', 'manual');

-- CreateEnum
CREATE TYPE "CollectionVisibility" AS ENUM ('private', 'public', 'shared');

-- CreateEnum
CREATE TYPE "BookmarkSubmissionReason" AS ENUM ('user_bookmark', 'multiple_bookmarks', 'high_engagement');

-- CreateEnum
CREATE TYPE "BookmarkSubmissionStatus" AS ENUM ('pending', 'validated', 'rejected', 'duplicate');

-- CreateTable
CREATE TABLE "UserCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "CollectionVisibility" NOT NULL DEFAULT 'private',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectionId" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "faviconUrl" TEXT,
    "sourceType" "BookmarkSourceType" NOT NULL,
    "sourceMetadata" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "visitsCount" INTEGER NOT NULL DEFAULT 0,
    "lastVisitedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookmarkCommunitySubmission" (
    "id" TEXT NOT NULL,
    "bookmarkId" TEXT NOT NULL,
    "indexedSiteId" TEXT,
    "submissionReason" "BookmarkSubmissionReason" NOT NULL,
    "submissionScore" INTEGER NOT NULL DEFAULT 0,
    "status" "BookmarkSubmissionStatus" NOT NULL DEFAULT 'pending',
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookmarkCommunitySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCollection_userId_name_key" ON "UserCollection"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UserBookmark_userId_url_key" ON "UserBookmark"("userId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "BookmarkCommunitySubmission_bookmarkId_key" ON "BookmarkCommunitySubmission"("bookmarkId");

-- AddForeignKey
ALTER TABLE "UserCollection" ADD CONSTRAINT "UserCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBookmark" ADD CONSTRAINT "UserBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBookmark" ADD CONSTRAINT "UserBookmark_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "UserCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookmarkCommunitySubmission" ADD CONSTRAINT "BookmarkCommunitySubmission_bookmarkId_fkey" FOREIGN KEY ("bookmarkId") REFERENCES "UserBookmark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookmarkCommunitySubmission" ADD CONSTRAINT "BookmarkCommunitySubmission_indexedSiteId_fkey" FOREIGN KEY ("indexedSiteId") REFERENCES "IndexedSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookmarkCommunitySubmission" ADD CONSTRAINT "BookmarkCommunitySubmission_validatedBy_fkey" FOREIGN KEY ("validatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;