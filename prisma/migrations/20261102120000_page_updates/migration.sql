-- When a page's look last changed (Profile.pageUpdatedAt, the residents
-- list's "Recently updated"), and the opt-in "updated their page" feed items
-- (PageUpdate). Re-runnable: every step skips what's already there.

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "pageUpdatedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "PageUpdate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageUpdate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PageUpdate_userId_day_key" ON "PageUpdate"("userId", "day");
CREATE INDEX IF NOT EXISTS "PageUpdate_sharedAt_idx" ON "PageUpdate"("sharedAt" DESC);
DO $$ BEGIN
    ALTER TABLE "PageUpdate" ADD CONSTRAINT "PageUpdate_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill, best known time of the owner's last change, for rows still null:
--  * templateCompiledAt: set by every HTML save. Not when the Visual Builder
--    conversion script wrote it (2026-10-19): that run left a 'vb-convert'
--    revision moments before, so a compile within 10 minutes after one is
--    the script's, not the person's.
--  * the newest revision from the owner's own saves ('template-save',
--    'css-save', 'reset'). A revision is the state a save replaced, taken
--    just before the save, so its time is a save's time: a lower bound for
--    CSS-only pages, which have no other record. 'moderator-reset',
--    'layout-merge' and 'vb-convert' are the site's doing and don't count.
-- Pages with neither (one CSS save onto an empty page, or a theme at
-- signup) stay null and sort after everyone with a known time.
UPDATE "Profile" p
SET "pageUpdatedAt" = known.at
FROM (
    SELECT p2."userId",
           GREATEST(
               CASE WHEN p2."templateCompiledAt" IS NOT NULL AND NOT EXISTS (
                   SELECT 1 FROM "ProfileTemplateRevision" v
                   WHERE v."userId" = p2."userId"
                     AND v."trigger" = 'vb-convert'
                     AND p2."templateCompiledAt" >= v."createdAt"
                     AND p2."templateCompiledAt" <= v."createdAt" + interval '10 minutes'
               ) THEN p2."templateCompiledAt" END,
               (SELECT max(r."createdAt") FROM "ProfileTemplateRevision" r
                WHERE r."userId" = p2."userId"
                  AND r."trigger" IN ('template-save', 'css-save', 'reset'))
           ) AS at
    FROM "Profile" p2
) known
WHERE p."userId" = known."userId"
  AND p."pageUpdatedAt" IS NULL
  AND known.at IS NOT NULL;
