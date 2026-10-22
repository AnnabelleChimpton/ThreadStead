-- Rings for any site (design/rings-for-any-site/SCOPE.md): residents'
-- outside sites as their stops in ThreadRings. New tables and enum values
-- only; nothing existing changes. No foreign key to the Indie Index "Site"
-- table on purpose. Re-runnable: every step skips what's already there.

DO $$ BEGIN
    CREATE TYPE "ExternalSiteState" AS ENUM ('pending', 'verified', 'resting', 'removed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "ExternalSiteVerifyMethod" AS ENUM ('strip', 'relme', 'meta');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "RingStopStatus" AS ENUM ('listed', 'pending', 'hidden');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "RingOutsideSites" AS ENUM ('allow', 'ask', 'off');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "RingDoorway" AS ENUM ('next', 'prev', 'random', 'ring');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ring_site';
ALTER TYPE "ReportType" ADD VALUE IF NOT EXISTS 'site';
ALTER TYPE "SiteSignalKind" ADD VALUE IF NOT EXISTS 'verified';

CREATE TABLE IF NOT EXISTS "ExternalSite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "siteRef" TEXT NOT NULL,
    "stripPageUrl" TEXT,
    "title" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifyMethod" "ExternalSiteVerifyMethod",
    "lastCheckedAt" TIMESTAMP(3),
    "lastOkAt" TIMESTAMP(3),
    "missCount" INTEGER NOT NULL DEFAULT 0,
    "state" "ExternalSiteState" NOT NULL DEFAULT 'pending',
    "restingSince" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExternalSite_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ExternalSite_siteRef_idx" ON "ExternalSite"("siteRef");
CREATE INDEX IF NOT EXISTS "ExternalSite_state_lastCheckedAt_idx" ON "ExternalSite"("state", "lastCheckedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "ExternalSite_userId_siteRef_key" ON "ExternalSite"("userId", "siteRef");

CREATE TABLE IF NOT EXISTS "RingStop" (
    "id" TEXT NOT NULL,
    "ringSlug" TEXT NOT NULL,
    "externalSiteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RingStopStatus" NOT NULL,
    "hiddenByUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RingStop_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RingStop_externalSiteId_idx" ON "RingStop"("externalSiteId");
CREATE UNIQUE INDEX IF NOT EXISTS "RingStop_ringSlug_externalSiteId_key" ON "RingStop"("ringSlug", "externalSiteId");
CREATE UNIQUE INDEX IF NOT EXISTS "RingStop_ringSlug_userId_key" ON "RingStop"("ringSlug", "userId");

CREATE TABLE IF NOT EXISTS "RingSiteSettings" (
    "ringSlug" TEXT NOT NULL,
    "outsideSites" "RingOutsideSites" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RingSiteSettings_pkey" PRIMARY KEY ("ringSlug")
);

CREATE TABLE IF NOT EXISTS "RingDoorwayCount" (
    "ringSlug" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "doorway" "RingDoorway" NOT NULL,
    "day" DATE NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RingDoorwayCount_pkey" PRIMARY KEY ("ringSlug", "siteId", "doorway", "day")
);
CREATE INDEX IF NOT EXISTS "RingDoorwayCount_day_idx" ON "RingDoorwayCount"("day");

DO $$ BEGIN
    ALTER TABLE "ExternalSite" ADD CONSTRAINT "ExternalSite_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "RingStop" ADD CONSTRAINT "RingStop_externalSiteId_fkey"
        FOREIGN KEY ("externalSiteId") REFERENCES "ExternalSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "RingStop" ADD CONSTRAINT "RingStop_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "RingStop" ADD CONSTRAINT "RingStop_hiddenByUserId_fkey"
        FOREIGN KEY ("hiddenByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "RingDoorwayCount" ADD CONSTRAINT "RingDoorwayCount_siteId_fkey"
        FOREIGN KEY ("siteId") REFERENCES "ExternalSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
