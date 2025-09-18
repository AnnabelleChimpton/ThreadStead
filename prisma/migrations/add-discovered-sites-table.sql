-- Migration: Add DiscoveredSites table for auto-discovered content
-- This separates auto-discovered sites from the main community index

CREATE TABLE "DiscoveredSite" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    -- Discovery metadata
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discoveryMethod" TEXT NOT NULL DEFAULT 'crawler_auto_submit',
    "discoveryContext" TEXT,
    "discoveredFrom" TEXT, -- URL that linked to this site

    -- Quality assessment
    "qualityScore" INTEGER NOT NULL,
    "qualityReasons" TEXT[],
    "suggestedCategory" TEXT,

    -- Content analysis (same as IndexedSite)
    "contentSample" TEXT,
    "extractedKeywords" TEXT[],
    "detectedLanguage" TEXT,
    "lastCrawled" TIMESTAMP(3),
    "crawlStatus" TEXT NOT NULL DEFAULT 'success',
    "contentHash" TEXT,
    "sslEnabled" BOOLEAN,
    "responseTimeMs" INTEGER,
    "outboundLinks" TEXT[],

    -- Review status
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, needs_review
    "reviewedBy" TEXT, -- User ID who reviewed
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,

    -- Promotion to main index
    "promotedToIndex" BOOLEAN NOT NULL DEFAULT false,
    "promotedAt" TIMESTAMP(3),
    "indexedSiteId" TEXT, -- Reference to IndexedSite if promoted

    CONSTRAINT "DiscoveredSite_pkey" PRIMARY KEY ("id")
);

-- Indexes for performance
CREATE UNIQUE INDEX "DiscoveredSite_url_key" ON "DiscoveredSite"("url");
CREATE INDEX "DiscoveredSite_reviewStatus_qualityScore_idx" ON "DiscoveredSite"("reviewStatus", "qualityScore");
CREATE INDEX "DiscoveredSite_discoveredAt_idx" ON "DiscoveredSite"("discoveredAt");
CREATE INDEX "DiscoveredSite_qualityScore_idx" ON "DiscoveredSite"("qualityScore" DESC);