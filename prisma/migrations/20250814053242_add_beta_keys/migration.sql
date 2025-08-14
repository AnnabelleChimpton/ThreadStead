-- AlterTable
ALTER TABLE "public"."Profile" ADD COLUMN     "featuredFriends" JSONB;

-- CreateTable
CREATE TABLE "public"."BetaKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "usedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "BetaKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BetaKey_key_key" ON "public"."BetaKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "BetaKey_usedBy_key" ON "public"."BetaKey"("usedBy");

-- AddForeignKey
ALTER TABLE "public"."BetaKey" ADD CONSTRAINT "BetaKey_usedBy_fkey" FOREIGN KEY ("usedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
