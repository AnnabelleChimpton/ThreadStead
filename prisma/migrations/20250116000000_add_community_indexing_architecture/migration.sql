-- Community Index Models for ThreadStead
-- Phase 1 & 2 Implementation

-- IndexedSite: Main table for community-discovered sites
CREATE TABLE "IndexedSite" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    -- Discovery metadata
    "submittedBy" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discoveryMethod" TEXT NOT NULL DEFAULT 'manual',
    "discoveryContext" TEXT,

    -- Content analysis
    "contentSample" TEXT,
    "extractedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "detectedLanguage" TEXT,
    "siteType" TEXT,

    -- Technical metadata
    "lastCrawled" TIMESTAMP(3),
    "crawlStatus" TEXT NOT NULL DEFAULT 'pending',
    "contentHash" TEXT,
    "sslEnabled" BOOLEAN,
    "responseTimeMs" INTEGER,
    "lastModified" TIMESTAMP(3),

    -- Community curation
    "communityScore" INTEGER NOT NULL DEFAULT 0,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "verifiedBy" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,

    -- Seeding specific fields
    "seedingScore" INTEGER,
    "seedingReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "communityValidated" BOOLEAN NOT NULL DEFAULT false,
    "validationVotes" INTEGER NOT NULL DEFAULT 0,

    -- Connectivity
    "outboundLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "inboundLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexedSite_pkey" PRIMARY KEY ("id")
);

-- SiteVote: Enhanced voting system with quality flags
CREATE TABLE "SiteVote" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voteType" TEXT NOT NULL, -- approve, reject, improve, quality, interesting, helpful, creative, broken, spam, outdated
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVote_pkey" PRIMARY KEY ("id")
);

-- SiteTag: Community tagging system
CREATE TABLE "SiteTag" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "suggestedBy" TEXT NOT NULL,
    "votes" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteTag_pkey" PRIMARY KEY ("id")
);

-- DiscoveryPath: Track how users discover sites
CREATE TABLE "DiscoveryPath" (
    "id" TEXT NOT NULL,
    "fromSite" TEXT,
    "toSite" TEXT NOT NULL,
    "discoveredBy" TEXT NOT NULL,
    "discoveryMethod" TEXT NOT NULL, -- link_click, search_result, webring, random
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryPath_pkey" PRIMARY KEY ("id")
);

-- SiteRelationship: Map relationships between sites
CREATE TABLE "SiteRelationship" (
    "id" TEXT NOT NULL,
    "siteA" TEXT NOT NULL,
    "siteB" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL, -- links_to, same_author, webring_member, similar_content
    "strength" INTEGER NOT NULL DEFAULT 1,
    "discoveredBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteRelationship_pkey" PRIMARY KEY ("id")
);

-- CrawlQueue: Queue for automated site crawling
CREATE TABLE "CrawlQueue" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttempt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawlQueue_pkey" PRIMARY KEY ("id")
);

-- SiteReview: Phase 2 - Detailed site reviews and comments
CREATE TABLE "SiteReview" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "rating" INTEGER, -- 1-5 star rating (optional)
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteReview_pkey" PRIMARY KEY ("id")
);

-- Indexes for IndexedSite
CREATE UNIQUE INDEX "IndexedSite_url_key" ON "IndexedSite"("url");
CREATE INDEX "IndexedSite_discoveryMethod_idx" ON "IndexedSite"("discoveryMethod");
CREATE INDEX "IndexedSite_crawlStatus_idx" ON "IndexedSite"("crawlStatus");
CREATE INDEX "IndexedSite_communityScore_idx" ON "IndexedSite"("communityScore");
CREATE INDEX "IndexedSite_communityValidated_idx" ON "IndexedSite"("communityValidated");
CREATE INDEX "IndexedSite_seedingScore_idx" ON "IndexedSite"("seedingScore");
CREATE INDEX "IndexedSite_featured_idx" ON "IndexedSite"("featured");
CREATE INDEX "IndexedSite_siteType_idx" ON "IndexedSite"("siteType");
CREATE INDEX "IndexedSite_submittedBy_idx" ON "IndexedSite"("submittedBy");
CREATE INDEX "IndexedSite_verifiedBy_idx" ON "IndexedSite"("verifiedBy");

-- Indexes for SiteVote
CREATE UNIQUE INDEX "SiteVote_siteId_userId_voteType_key" ON "SiteVote"("siteId", "userId", "voteType");
CREATE INDEX "SiteVote_siteId_idx" ON "SiteVote"("siteId");
CREATE INDEX "SiteVote_userId_idx" ON "SiteVote"("userId");
CREATE INDEX "SiteVote_voteType_idx" ON "SiteVote"("voteType");

-- Indexes for SiteTag
CREATE UNIQUE INDEX "SiteTag_siteId_tag_key" ON "SiteTag"("siteId", "tag");
CREATE INDEX "SiteTag_siteId_idx" ON "SiteTag"("siteId");
CREATE INDEX "SiteTag_tag_idx" ON "SiteTag"("tag");
CREATE INDEX "SiteTag_suggestedBy_idx" ON "SiteTag"("suggestedBy");

-- Indexes for DiscoveryPath
CREATE INDEX "DiscoveryPath_toSite_idx" ON "DiscoveryPath"("toSite");
CREATE INDEX "DiscoveryPath_discoveredBy_idx" ON "DiscoveryPath"("discoveredBy");
CREATE INDEX "DiscoveryPath_discoveryMethod_idx" ON "DiscoveryPath"("discoveryMethod");
CREATE INDEX "DiscoveryPath_sessionId_idx" ON "DiscoveryPath"("sessionId");
CREATE INDEX "DiscoveryPath_createdAt_idx" ON "DiscoveryPath"("createdAt");

-- Indexes for SiteRelationship
CREATE UNIQUE INDEX "SiteRelationship_siteA_siteB_relationshipType_key" ON "SiteRelationship"("siteA", "siteB", "relationshipType");
CREATE INDEX "SiteRelationship_siteA_idx" ON "SiteRelationship"("siteA");
CREATE INDEX "SiteRelationship_siteB_idx" ON "SiteRelationship"("siteB");
CREATE INDEX "SiteRelationship_relationshipType_idx" ON "SiteRelationship"("relationshipType");

-- Indexes for CrawlQueue
CREATE INDEX "CrawlQueue_status_scheduledFor_idx" ON "CrawlQueue"("status", "scheduledFor");
CREATE INDEX "CrawlQueue_priority_scheduledFor_idx" ON "CrawlQueue"("priority", "scheduledFor");
CREATE INDEX "CrawlQueue_url_idx" ON "CrawlQueue"("url");

-- Indexes for SiteReview
CREATE UNIQUE INDEX "SiteReview_siteId_userId_key" ON "SiteReview"("siteId", "userId");
CREATE INDEX "SiteReview_siteId_idx" ON "SiteReview"("siteId");
CREATE INDEX "SiteReview_userId_idx" ON "SiteReview"("userId");
CREATE INDEX "SiteReview_helpful_idx" ON "SiteReview"("helpful");
CREATE INDEX "SiteReview_rating_idx" ON "SiteReview"("rating");

-- Foreign Key Constraints
ALTER TABLE "IndexedSite" ADD CONSTRAINT "IndexedSite_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IndexedSite" ADD CONSTRAINT "IndexedSite_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SiteVote" ADD CONSTRAINT "SiteVote_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "IndexedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteVote" ADD CONSTRAINT "SiteVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SiteTag" ADD CONSTRAINT "SiteTag_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "IndexedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteTag" ADD CONSTRAINT "SiteTag_suggestedBy_fkey" FOREIGN KEY ("suggestedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DiscoveryPath" ADD CONSTRAINT "DiscoveryPath_discoveredBy_fkey" FOREIGN KEY ("discoveredBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SiteReview" ADD CONSTRAINT "SiteReview_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "IndexedSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteReview" ADD CONSTRAINT "SiteReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;