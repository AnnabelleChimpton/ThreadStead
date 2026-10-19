-- Share snapshot of each pixel home's yard (PLAN.md Phase 1, FUTURE_IMPROVEMENTS §I2).
-- Hand-written and additive: four nullable columns, no defaults, no rewrite.
-- Filled after each save, lazily on first view, and by
-- scripts/backfill-home-snapshots.ts.

ALTER TABLE "UserHomeConfig" ADD COLUMN IF NOT EXISTS "snapshotUrl" TEXT;
ALTER TABLE "UserHomeConfig" ADD COLUMN IF NOT EXISTS "snapshotCardUrl" TEXT;
ALTER TABLE "UserHomeConfig" ADD COLUMN IF NOT EXISTS "snapshotHash" TEXT;
ALTER TABLE "UserHomeConfig" ADD COLUMN IF NOT EXISTS "snapshotAt" TIMESTAMP(3);
