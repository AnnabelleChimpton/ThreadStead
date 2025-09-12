-- CreateTable
CREATE TABLE "public"."PixelHomeVisitor" (
    "id" TEXT NOT NULL,
    "homeOwnerId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PixelHomeVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PixelHomeVisitor_homeOwnerId_visitedAt_idx" ON "public"."PixelHomeVisitor"("homeOwnerId", "visitedAt");

-- CreateIndex
CREATE INDEX "PixelHomeVisitor_visitorId_visitedAt_idx" ON "public"."PixelHomeVisitor"("visitorId", "visitedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PixelHomeVisitor_homeOwnerId_visitorId_key" ON "public"."PixelHomeVisitor"("homeOwnerId", "visitorId");

-- AddForeignKey
ALTER TABLE "public"."PixelHomeVisitor" ADD CONSTRAINT "PixelHomeVisitor_homeOwnerId_fkey" FOREIGN KEY ("homeOwnerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PixelHomeVisitor" ADD CONSTRAINT "PixelHomeVisitor_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
