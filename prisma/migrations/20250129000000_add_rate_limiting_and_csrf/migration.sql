-- CreateTable
  CREATE TABLE "RateLimit" (
      "id" TEXT NOT NULL,
      "identifier" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "requestCount" INTEGER NOT NULL DEFAULT 1,
      "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" TIMESTAMP(3) NOT NULL,

      CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
  );

  -- CreateIndex
  CREATE UNIQUE INDEX "RateLimit_identifier_category_key" ON
  "RateLimit"("identifier", "category");

  -- CreateIndex
  CREATE INDEX "RateLimit_identifier_category_windowStart_idx" ON
  "RateLimit"("identifier", "category", "windowStart");

  -- CreateIndex
  CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");