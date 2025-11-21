-- CreateEnum
CREATE TYPE "BulletinCategory" AS ENUM ('LOOKING_FOR', 'SHARING', 'INVITATION', 'HELP_FEEDBACK', 'COMMUNITY_NOTICE');

-- CreateTable
CREATE TABLE "Bulletin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "BulletinCategory" NOT NULL,
    "text" TEXT NOT NULL,
    "linkUrl" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bulletin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bulletin_userId_idx" ON "Bulletin"("userId");

-- CreateIndex
CREATE INDEX "Bulletin_isActive_expiresAt_idx" ON "Bulletin"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "Bulletin_createdAt_idx" ON "Bulletin"("createdAt");

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
