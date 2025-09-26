-- CreateEnum
CREATE TYPE "UploadContext" AS ENUM ('media_collection', 'post_embed', 'profile_photo', 'threadring_badge', 'other');

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "uploadContext" "UploadContext" NOT NULL DEFAULT 'media_collection',
ADD COLUMN     "isGalleryItem" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Media_userId_isGalleryItem_idx" ON "Media"("userId", "isGalleryItem");

-- Update existing records to maintain current behavior
-- Set non-featured items to post_embed context (likely embedded in posts)
-- Keep featured items as media_collection (intentional gallery items)
UPDATE "Media" SET
    "uploadContext" = CASE
        WHEN "featured" = true THEN 'media_collection'::UploadContext
        ELSE 'post_embed'::UploadContext
    END,
    "isGalleryItem" = CASE
        WHEN "featured" = true THEN true
        ELSE false
    END
WHERE 1=1;