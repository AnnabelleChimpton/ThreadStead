-- Bluesky handles on residents' addresses (design/home-subdomains/SCOPE.md,
-- Phase 1 and Names): User.subdomainLabel, BlueskyHandleLink and
-- HandleTombstone. Re-runnable: every step skips what's already there.
--
-- Run the read-only audit queries (design/home-subdomains/audit-queries.sql)
-- first. Where two usernames make the same label (a_b and a-b), the older
-- account gets it and the newer one gets none (no address, no Bluesky
-- handle) until someone decides otherwise.

DO $$ BEGIN
    CREATE TYPE "BlueskyHandleStatus" AS ENUM ('pending', 'verified', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subdomainLabel" TEXT;

-- Label = the username part of primaryHandle with _ as -. Older account
-- first; only rows without a label yet, and only labels nobody holds.
UPDATE "User" u
SET "subdomainLabel" = pick.label
FROM (
    SELECT DISTINCT ON (label) id, label
    FROM (
        SELECT id, "createdAt", replace(split_part("primaryHandle", '@', 1), '_', '-') AS label
        FROM "User"
        WHERE "primaryHandle" IS NOT NULL AND "subdomainLabel" IS NULL
    ) candidates
    WHERE label <> ''
      AND NOT EXISTS (SELECT 1 FROM "User" taken WHERE taken."subdomainLabel" = candidates.label)
    ORDER BY label, "createdAt", id
) pick
WHERE u.id = pick.id;

CREATE UNIQUE INDEX IF NOT EXISTS "User_subdomainLabel_key" ON "User"("subdomainLabel");

CREATE TABLE IF NOT EXISTS "BlueskyHandleLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "previousHandle" TEXT,
    "status" "BlueskyHandleStatus" NOT NULL DEFAULT 'pending',
    "pendingUntil" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "lastCheckNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueskyHandleLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlueskyHandleLink_userId_key" ON "BlueskyHandleLink"("userId");
CREATE INDEX IF NOT EXISTS "BlueskyHandleLink_status_idx" ON "BlueskyHandleLink"("status");

DO $$ BEGIN
    ALTER TABLE "BlueskyHandleLink" ADD CONSTRAINT "BlueskyHandleLink_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "HandleTombstone" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "subdomainLabel" TEXT NOT NULL,
    "blueskyLinked" BOOLEAN NOT NULL DEFAULT false,
    "removedForAbuse" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "HandleTombstone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HandleTombstone_subdomainLabel_idx" ON "HandleTombstone"("subdomainLabel");
