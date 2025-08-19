-- CreateTable
CREATE TABLE "public"."ThreadRingFork" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "forkReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadRingFork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ThreadRingFork_childId_key" ON "public"."ThreadRingFork"("childId");

-- CreateIndex
CREATE INDEX "ThreadRingFork_parentId_idx" ON "public"."ThreadRingFork"("parentId");

-- CreateIndex
CREATE INDEX "ThreadRingFork_createdBy_idx" ON "public"."ThreadRingFork"("createdBy");

-- AddForeignKey
ALTER TABLE "public"."ThreadRingFork" ADD CONSTRAINT "ThreadRingFork_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingFork" ADD CONSTRAINT "ThreadRingFork_childId_fkey" FOREIGN KEY ("childId") REFERENCES "public"."ThreadRing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThreadRingFork" ADD CONSTRAINT "ThreadRingFork_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
