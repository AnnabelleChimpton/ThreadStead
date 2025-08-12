-- CreateEnum
CREATE TYPE "public"."CommentStatus" AS ENUM ('visible', 'hidden');

-- AlterTable
ALTER TABLE "public"."Comment" ADD COLUMN     "status" "public"."CommentStatus" NOT NULL DEFAULT 'visible';
