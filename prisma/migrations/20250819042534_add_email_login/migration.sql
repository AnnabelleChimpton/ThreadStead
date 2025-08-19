-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "encryptedEmail" TEXT;

-- CreateTable
CREATE TABLE "public"."EmailLoginToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "encryptedEmail" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailLoginToken_token_key" ON "public"."EmailLoginToken"("token");

-- CreateIndex
CREATE INDEX "EmailLoginToken_token_idx" ON "public"."EmailLoginToken"("token");

-- CreateIndex
CREATE INDEX "EmailLoginToken_encryptedEmail_expiresAt_idx" ON "public"."EmailLoginToken"("encryptedEmail", "expiresAt");
