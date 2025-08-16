-- CreateTable
CREATE TABLE "public"."CustomPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "showInNav" BOOLEAN NOT NULL DEFAULT false,
    "navOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomPage_slug_key" ON "public"."CustomPage"("slug");

-- CreateIndex
CREATE INDEX "CustomPage_published_showInNav_navOrder_idx" ON "public"."CustomPage"("published", "showInNav", "navOrder");
