-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "contentWarning" TEXT,
ADD COLUMN     "isSpoiler" BOOLEAN NOT NULL DEFAULT false;
