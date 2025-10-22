-- CreateTable
CREATE TABLE "BlockedSite" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockedSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedSite_domain_key" ON "BlockedSite"("domain");

-- CreateIndex
CREATE INDEX "BlockedSite_category_idx" ON "BlockedSite"("category");

-- CreateIndex
CREATE INDEX "BlockedSite_domain_idx" ON "BlockedSite"("domain");
