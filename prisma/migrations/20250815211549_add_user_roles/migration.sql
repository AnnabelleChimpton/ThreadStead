-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('member', 'admin');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "role" "public"."UserRole" NOT NULL DEFAULT 'member';
