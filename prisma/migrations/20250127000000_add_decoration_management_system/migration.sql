-- CreateEnum
CREATE TYPE "ReleaseType" AS ENUM ('PUBLIC', 'LIMITED_TIME', 'CLAIM_CODE', 'ADMIN_ONLY', 'BETA_USERS');

-- CreateEnum
CREATE TYPE "ClaimMethod" AS ENUM ('DIRECT', 'CODE', 'ADMIN_GRANT', 'BETA_ACCESS');

-- CreateTable
CREATE TABLE "DecorationItem" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "iconSvg" TEXT,
    "renderSvg" TEXT,
    "imagePath" TEXT,
    "gridWidth" INTEGER NOT NULL DEFAULT 1,
    "gridHeight" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "releaseType" "ReleaseType" NOT NULL DEFAULT 'PUBLIC',
    "releaseStartAt" TIMESTAMP(3),
    "releaseEndAt" TIMESTAMP(3),
    "claimCode" TEXT,
    "maxClaims" INTEGER,
    "claimCount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "DecorationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDecorationClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decorationId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimMethod" "ClaimMethod" NOT NULL DEFAULT 'DIRECT',

    CONSTRAINT "UserDecorationClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DecorationItem_itemId_key" ON "DecorationItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "DecorationItem_claimCode_key" ON "DecorationItem"("claimCode");

-- CreateIndex
CREATE INDEX "DecorationItem_releaseType_idx" ON "DecorationItem"("releaseType");

-- CreateIndex
CREATE INDEX "DecorationItem_releaseStartAt_releaseEndAt_idx" ON "DecorationItem"("releaseStartAt", "releaseEndAt");

-- CreateIndex
CREATE INDEX "DecorationItem_claimCode_idx" ON "DecorationItem"("claimCode");

-- CreateIndex
CREATE INDEX "DecorationItem_isActive_idx" ON "DecorationItem"("isActive");

-- CreateIndex
CREATE INDEX "DecorationItem_itemId_idx" ON "DecorationItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDecorationClaim_userId_decorationId_key" ON "UserDecorationClaim"("userId", "decorationId");

-- CreateIndex
CREATE INDEX "UserDecorationClaim_userId_idx" ON "UserDecorationClaim"("userId");

-- CreateIndex
CREATE INDEX "UserDecorationClaim_decorationId_idx" ON "UserDecorationClaim"("decorationId");

-- AddForeignKey
ALTER TABLE "DecorationItem" ADD CONSTRAINT "DecorationItem_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDecorationClaim" ADD CONSTRAINT "UserDecorationClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDecorationClaim" ADD CONSTRAINT "UserDecorationClaim_decorationId_fkey" FOREIGN KEY ("decorationId") REFERENCES "DecorationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;