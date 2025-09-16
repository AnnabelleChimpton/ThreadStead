-- CreateTable
CREATE TABLE "public"."CuratedSite" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "addedBy" TEXT,
    "lastChecked" TIMESTAMP(3),
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuratedSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CuratedSite_url_key" ON "public"."CuratedSite"("url");

-- CreateIndex
CREATE INDEX "CuratedSite_active_idx" ON "public"."CuratedSite"("active");

-- CreateIndex
CREATE INDEX "CuratedSite_tags_idx" ON "public"."CuratedSite"("tags");

-- CreateIndex
CREATE INDEX "CuratedSite_weight_idx" ON "public"."CuratedSite"("weight");
