-- Drop the crawler-era index (SEARCH_PLAN.md §3.5). Hand-written.
--
-- The Indie Index (20261019000000_add_indie_index) replaced these tables.
-- The rows people chose were moved into it on prod by
-- scripts/indie-index-migrate-legacy.ts --apply, and the tables were dumped
-- (pg_dump -Fc, ~/legacy-index-tables.dump on the server) on 2026-10-18.
-- BlockedSite, UserCollection and UserBookmark stay.
--
-- Children before parents and no CASCADE, so an unexpected dependency fails
-- loudly instead of taking something else with it. Safe to re-run.

DROP TABLE IF EXISTS "BookmarkCommunitySubmission";
DROP TABLE IF EXISTS "SiteVote";
DROP TABLE IF EXISTS "SiteTag";
DROP TABLE IF EXISTS "SiteReview";
DROP TABLE IF EXISTS "IndexedSite";
DROP TABLE IF EXISTS "DiscoveryPath";
DROP TABLE IF EXISTS "SiteRelationship";
DROP TABLE IF EXISTS "CrawlQueue";
DROP TABLE IF EXISTS "DiscoveryLink";
DROP TABLE IF EXISTS "DiscoveredSite";
DROP TABLE IF EXISTS "CuratedSite";

DROP TYPE IF EXISTS "BookmarkSubmissionReason";
DROP TYPE IF EXISTS "BookmarkSubmissionStatus";
