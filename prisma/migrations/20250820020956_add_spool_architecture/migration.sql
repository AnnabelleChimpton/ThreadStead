-- AlterTable
ALTER TABLE "public"."ThreadRing" ADD COLUMN     "directChildrenCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isSystemRing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lineageDepth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lineagePath" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "totalDescendantsCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ThreadRing_parentId_idx" ON "public"."ThreadRing"("parentId");

-- CreateIndex
CREATE INDEX "ThreadRing_lineageDepth_idx" ON "public"."ThreadRing"("lineageDepth");

-- CreateIndex
CREATE INDEX "ThreadRing_isSystemRing_idx" ON "public"."ThreadRing"("isSystemRing");

-- AddForeignKey
ALTER TABLE "public"."ThreadRing" ADD CONSTRAINT "ThreadRing_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."ThreadRing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
