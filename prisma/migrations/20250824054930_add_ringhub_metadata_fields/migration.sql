-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "excerpt" TEXT,
ADD COLUMN     "platform" TEXT DEFAULT 'blog',
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "textPreview" TEXT;