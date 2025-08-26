/*
  Warnings:

  - You are about to drop the `PostThreadRingPrompt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ThreadRingPrompt` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."PostThreadRingPrompt" DROP CONSTRAINT "PostThreadRingPrompt_postId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PostThreadRingPrompt" DROP CONSTRAINT "PostThreadRingPrompt_promptId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ThreadRingPrompt" DROP CONSTRAINT "ThreadRingPrompt_createdById_fkey";

-- DropForeignKey
ALTER TABLE "public"."ThreadRingPrompt" DROP CONSTRAINT "ThreadRingPrompt_threadRingId_fkey";

-- DropTable
DROP TABLE "public"."PostThreadRingPrompt";

-- DropTable
DROP TABLE "public"."ThreadRingPrompt";
