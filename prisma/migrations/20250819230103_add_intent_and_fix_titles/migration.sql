/*
  Warnings:

  - Made the column `title` on table `Post` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."PostIntent" AS ENUM ('sharing', 'asking', 'feeling', 'announcing', 'showing', 'teaching', 'looking', 'celebrating');

-- First, update any NULL titles to default value
UPDATE "public"."Post" SET "title" = 'Untitled Post' WHERE "title" IS NULL;

-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "intent" "public"."PostIntent",
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "title" SET DEFAULT 'Untitled Post';
