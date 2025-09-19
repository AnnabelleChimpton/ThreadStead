-- AlterTable
ALTER TABLE "IndexedSite" ADD COLUMN     "extractedLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "extractionCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "indexingPurpose" TEXT DEFAULT 'full_index',
ADD COLUMN     "parentProfileUrl" TEXT,
ADD COLUMN     "platformType" TEXT DEFAULT 'unknown';

-- CreateTable
CREATE TABLE "DiscoveryLink" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourcePlatform" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "linkLocation" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DiscoveryLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndexedSite_indexingPurpose_idx" ON "IndexedSite"("indexingPurpose");

-- CreateIndex
CREATE INDEX "IndexedSite_platformType_idx" ON "IndexedSite"("platformType");

-- CreateIndex
CREATE INDEX "IndexedSite_extractionCompleted_idx" ON "IndexedSite"("extractionCompleted");

-- CreateIndex
CREATE INDEX "IndexedSite_parentProfileUrl_idx" ON "IndexedSite"("parentProfileUrl");

-- CreateIndex
CREATE INDEX "DiscoveryLink_sourceUrl_idx" ON "DiscoveryLink"("sourceUrl");

-- CreateIndex
CREATE INDEX "DiscoveryLink_targetUrl_idx" ON "DiscoveryLink"("targetUrl");

-- CreateIndex
CREATE INDEX "DiscoveryLink_sourcePlatform_idx" ON "DiscoveryLink"("sourcePlatform");

-- CreateIndex
CREATE INDEX "DiscoveryLink_processed_idx" ON "DiscoveryLink"("processed");

-- Update existing corporate profile records to be marked for link extraction
UPDATE "IndexedSite"
SET
    "indexingPurpose" = 'link_extraction',
    "platformType" = 'corporate_profile'
WHERE
    url LIKE '%youtube.com/@%' OR
    url LIKE '%youtube.com/channel/%' OR
    url LIKE '%twitter.com/%' OR
    url LIKE '%x.com/%' OR
    url LIKE '%instagram.com/%' OR
    url LIKE '%facebook.com/%' OR
    url LIKE '%linkedin.com/in/%' OR
    url LIKE '%github.com/%' OR
    url LIKE '%mastodon.%/@%' OR
    url LIKE '%reddit.com/u/%' OR
    url LIKE '%reddit.com/user/%' OR
    url LIKE '%tiktok.com/@%' OR
    url LIKE '%twitch.tv/%' OR
    url LIKE '%patreon.com/%' OR
    url LIKE '%ko-fi.com/%';

-- Mark indie platforms
UPDATE "IndexedSite"
SET
    "indexingPurpose" = 'full_index',
    "platformType" = 'indie_platform'
WHERE
    (url LIKE '%.neocities.org%' OR
     url LIKE '%.github.io%' OR
     url LIKE '%.netlify.app%' OR
     url LIKE '%.vercel.app%' OR
     url LIKE '%.bearblog.dev%' OR
     url LIKE '%.tilde.%' OR
     url LIKE '%.micro.blog%')
    AND "indexingPurpose" != 'link_extraction';

-- Mark likely independent sites
UPDATE "IndexedSite"
SET
    "platformType" = 'independent'
WHERE
    "indexingPurpose" = 'full_index' AND
    "platformType" = 'unknown' AND
    url NOT LIKE '%.wordpress.com%' AND
    url NOT LIKE '%.blogspot.com%' AND
    url NOT LIKE '%.tumblr.com%' AND
    url NOT LIKE '%.medium.com%' AND
    url NOT LIKE '%.substack.com%';