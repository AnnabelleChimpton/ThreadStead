-- CreateEnum
CREATE TYPE "public"."EmailTokenType" AS ENUM ('login', 'verification');

-- AlterTable
ALTER TABLE "public"."EmailLoginToken" ADD COLUMN     "type" "public"."EmailTokenType" NOT NULL DEFAULT 'login',
ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "EmailLoginToken_userId_type_idx" ON "public"."EmailLoginToken"("userId", "type");
