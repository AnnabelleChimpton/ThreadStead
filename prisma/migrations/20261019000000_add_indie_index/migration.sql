-- Indie Index (SEARCH_PLAN.md §3.5): a community-built index of personal
-- sites, refreshed from their RSS/Atom feeds by a nightly job. Hand-written.
--
-- Additive only: IndexedSite and the crawler tables are left alone here and
-- dropped by a later migration, after their rows have moved over
-- (scripts/indie-index-migrate-legacy.ts) and been dumped.
--
-- Site.search_tsv and SiteItem.search_tsv are kept up to date by triggers,
-- like 20261017000000_add_search_fts (which this needs: it uses that
-- migration's immutable_unaccent() and search_plain_text()). schema.prisma
-- declares them as Unsupported("tsvector")? and declares every index, so
-- `prisma migrate diff` against a migrated database is empty.
--
-- Safe to re-run: every statement is IF NOT EXISTS / OR REPLACE or guarded.

-- ---------------------------------------------------------------- Enums ----
DO $$ BEGIN
  CREATE TYPE "SiteSource" AS ENUM ('community', 'pool');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SiteTier" AS ENUM ('resident', 'vouched', 'community', 'pool', 'candidate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SiteStatus" AS ENUM ('active', 'stale', 'dead', 'hidden');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SiteSignalKind" AS ENUM ('own', 'backlink', 'blogroll', 'home_link', 'home_button', 'page_link');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SiteOptOutVia" AS ENUM ('robots', 'meta', 'owner', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------------- Tables ----
CREATE TABLE IF NOT EXISTS "Site" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "feedUrl" TEXT,
    "buttonUrl" TEXT,
    "source" "SiteSource" NOT NULL DEFAULT 'community',
    "tier" "SiteTier" NOT NULL DEFAULT 'candidate',
    "status" "SiteStatus" NOT NULL DEFAULT 'active',
    "ownerId" TEXT,
    "grandfathered" BOOLEAN NOT NULL DEFAULT false,
    "residentSignals" INTEGER NOT NULL DEFAULT 0,
    "vouchCount" INTEGER NOT NULL DEFAULT 0,
    "linkedFromSites" INTEGER NOT NULL DEFAULT 0,
    "lastPostAt" TIMESTAMP(3),
    "postsLast90d" INTEGER NOT NULL DEFAULT 0,
    "feedEtag" TEXT,
    "feedLastModified" TEXT,
    "nextFetchAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFetchedAt" TIMESTAMP(3),
    "homepageCheckedAt" TIMESTAMP(3),
    "lastOkAt" TIMESTAMP(3),
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "search_tsv" tsvector,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SiteItem" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "excerpt" TEXT,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "search_tsv" tsvector,

    CONSTRAINT "SiteItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Vouch" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vouch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SiteSignal" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "SiteSignalKind" NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteSignal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SiteLink" (
    "id" TEXT NOT NULL,
    "fromSiteId" TEXT NOT NULL,
    "toKey" TEXT NOT NULL,
    "toSiteId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SiteOptOut" (
    "key" TEXT NOT NULL,
    "via" "SiteOptOutVia" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteOptOut_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "IndexRun" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'nightly',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "notModified" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "itemsAdded" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "IndexRun_pkey" PRIMARY KEY ("id")
);

-- -------------------------------------------------------------- Indexes ----
CREATE UNIQUE INDEX IF NOT EXISTS "Site_key_key" ON "Site"("key");
CREATE INDEX IF NOT EXISTS "Site_host_idx" ON "Site"("host");
CREATE INDEX IF NOT EXISTS "Site_status_tier_idx" ON "Site"("status", "tier");
CREATE INDEX IF NOT EXISTS "Site_source_nextFetchAt_idx" ON "Site"("source", "nextFetchAt");
CREATE INDEX IF NOT EXISTS "Site_ownerId_idx" ON "Site"("ownerId");
CREATE INDEX IF NOT EXISTS "Site_search_tsv_idx" ON "Site" USING GIN ("search_tsv");
CREATE INDEX IF NOT EXISTS "Site_title_trgm_idx" ON "Site" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Site_key_trgm_idx" ON "Site" USING GIN ("key" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "SiteItem_siteId_publishedAt_idx" ON "SiteItem"("siteId", "publishedAt" DESC);
CREATE INDEX IF NOT EXISTS "SiteItem_search_tsv_idx" ON "SiteItem" USING GIN ("search_tsv");
CREATE UNIQUE INDEX IF NOT EXISTS "SiteItem_siteId_url_key" ON "SiteItem"("siteId", "url");

CREATE INDEX IF NOT EXISTS "Vouch_userId_idx" ON "Vouch"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Vouch_siteId_userId_key" ON "Vouch"("siteId", "userId");

CREATE INDEX IF NOT EXISTS "SiteSignal_userId_idx" ON "SiteSignal"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "SiteSignal_siteId_userId_kind_key" ON "SiteSignal"("siteId", "userId", "kind");

CREATE INDEX IF NOT EXISTS "SiteLink_toKey_idx" ON "SiteLink"("toKey");
CREATE INDEX IF NOT EXISTS "SiteLink_toSiteId_idx" ON "SiteLink"("toSiteId");
CREATE UNIQUE INDEX IF NOT EXISTS "SiteLink_fromSiteId_toKey_key" ON "SiteLink"("fromSiteId", "toKey");

CREATE INDEX IF NOT EXISTS "IndexRun_startedAt_idx" ON "IndexRun"("startedAt" DESC);

-- --------------------------------------------------------- Foreign keys ----
DO $$ BEGIN
  ALTER TABLE "Site" ADD CONSTRAINT "Site_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SiteItem" ADD CONSTRAINT "SiteItem_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Vouch" ADD CONSTRAINT "Vouch_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Vouch" ADD CONSTRAINT "Vouch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SiteSignal" ADD CONSTRAINT "SiteSignal_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SiteSignal" ADD CONSTRAINT "SiteSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SiteLink" ADD CONSTRAINT "SiteLink_fromSiteId_fkey" FOREIGN KEY ("fromSiteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SiteLink" ADD CONSTRAINT "SiteLink_toSiteId_fkey" FOREIGN KEY ("toSiteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------- Site search_tsv ----
-- title (A) + key (A) + description (B), english. The key goes in twice: as
-- is ("jvns.ca", one host token) and split on punctuation, so "jvns" alone
-- finds it too. Titles and descriptions come from other people's HTML, so
-- they go through search_plain_text().
CREATE OR REPLACE FUNCTION public.site_search_tsv_update() RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW."search_tsv" :=
       setweight(to_tsvector('english', public.immutable_unaccent(public.search_plain_text(COALESCE(NEW."title", '')))), 'A')
    || setweight(to_tsvector('english', NEW."key" || ' ' || regexp_replace(NEW."key", '[./~_-]+', ' ', 'g')), 'A')
    || setweight(to_tsvector('english', public.immutable_unaccent(left(public.search_plain_text(COALESCE(NEW."description", '')), 10000))), 'B');
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS "Site_search_tsv_trigger" ON "Site";
CREATE TRIGGER "Site_search_tsv_trigger"
  BEFORE INSERT OR UPDATE OF "title", "key", "description" ON "Site"
  FOR EACH ROW EXECUTE FUNCTION public.site_search_tsv_update();

UPDATE "Site" SET "key" = "key";

-- --------------------------------------------------- SiteItem search_tsv ----
-- title (A) + excerpt (C), english. The refresher stores the excerpt as plain
-- text already; the title still goes through search_plain_text().
CREATE OR REPLACE FUNCTION public.site_item_search_tsv_update() RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW."search_tsv" :=
       setweight(to_tsvector('english', public.immutable_unaccent(public.search_plain_text(COALESCE(NEW."title", '')))), 'A')
    || setweight(to_tsvector('english', public.immutable_unaccent(left(COALESCE(NEW."excerpt", ''), 10000))), 'C');
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS "SiteItem_search_tsv_trigger" ON "SiteItem";
CREATE TRIGGER "SiteItem_search_tsv_trigger"
  BEFORE INSERT OR UPDATE OF "title", "excerpt" ON "SiteItem"
  FOR EACH ROW EXECUTE FUNCTION public.site_item_search_tsv_update();

UPDATE "SiteItem" SET "title" = "title";
