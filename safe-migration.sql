-- Safe Production Migration Script
-- This script can be run multiple times safely and will only add missing elements

-- =============================================================================
-- PROFILE TABLE UPDATES
-- =============================================================================

-- Add avatar columns (safe to run even if they exist)
ALTER TABLE "public"."Profile" 
ADD COLUMN IF NOT EXISTS "avatarFullUrl" TEXT,
ADD COLUMN IF NOT EXISTS "avatarMediumUrl" TEXT,
ADD COLUMN IF NOT EXISTS "avatarThumbnailUrl" TEXT;

-- Add template columns (safe to run even if they exist)
ALTER TABLE "public"."Profile" 
ADD COLUMN IF NOT EXISTS "customTemplate" TEXT,
ADD COLUMN IF NOT EXISTS "customTemplateAst" TEXT,
ADD COLUMN IF NOT EXISTS "hideNavigation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "templateEnabled" BOOLEAN NOT NULL DEFAULT false;

-- =============================================================================
-- MEDIA TABLE
-- =============================================================================

-- Create Media table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "public"."Media" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- PHOTOCOMMENT TABLE
-- =============================================================================

-- Create PhotoComment table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS "public"."PhotoComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mediaId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "status" "public"."CommentStatus" NOT NULL DEFAULT 'visible',

    CONSTRAINT "PhotoComment_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- INDEXES (create only if they don't exist)
-- =============================================================================

CREATE INDEX IF NOT EXISTS "Media_userId_featured_featuredOrder_idx" ON "public"."Media"("userId", "featured", "featuredOrder");
CREATE INDEX IF NOT EXISTS "Media_userId_createdAt_idx" ON "public"."Media"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Media_userId_visibility_idx" ON "public"."Media"("userId", "visibility");
CREATE INDEX IF NOT EXISTS "PhotoComment_mediaId_createdAt_idx" ON "public"."PhotoComment"("mediaId", "createdAt");
CREATE INDEX IF NOT EXISTS "PhotoComment_authorId_createdAt_idx" ON "public"."PhotoComment"("authorId", "createdAt");
CREATE INDEX IF NOT EXISTS "PhotoComment_parentId_idx" ON "public"."PhotoComment"("parentId");

-- =============================================================================
-- FOREIGN KEY CONSTRAINTS (conditional creation)
-- =============================================================================

DO $$
BEGIN
    -- Media foreign keys
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Media') THEN
        IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'Media_userId_fkey' AND table_schema = 'public') THEN
            ALTER TABLE "public"."Media" ADD CONSTRAINT "Media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
    
    -- PhotoComment foreign keys
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PhotoComment') THEN
        IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'PhotoComment_mediaId_fkey' AND table_schema = 'public') THEN
            ALTER TABLE "public"."PhotoComment" ADD CONSTRAINT "PhotoComment_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "public"."Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'PhotoComment_authorId_fkey' AND table_schema = 'public') THEN
            ALTER TABLE "public"."PhotoComment" ADD CONSTRAINT "PhotoComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.table_constraints WHERE constraint_name = 'PhotoComment_parentId_fkey' AND table_schema = 'public') THEN
            ALTER TABLE "public"."PhotoComment" ADD CONSTRAINT "PhotoComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."PhotoComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- =============================================================================
-- VERIFICATION QUERIES (optional - run these to verify everything exists)
-- =============================================================================

-- Uncomment these to verify the migration worked:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'Profile' AND table_schema = 'public';
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Media', 'PhotoComment');
-- SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name IN ('Media', 'PhotoComment');