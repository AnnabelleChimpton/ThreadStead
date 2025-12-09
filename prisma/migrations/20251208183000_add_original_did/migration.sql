-- AlterTable
ALTER TABLE "User" ADD COLUMN "originalDid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_originalDid_key" ON "User"("originalDid");
