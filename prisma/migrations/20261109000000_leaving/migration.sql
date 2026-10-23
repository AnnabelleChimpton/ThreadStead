-- Leaving (lib/domain/users/leaving.ts): a resident asked to delete their
-- account; it goes at "deletesAt", and is hidden from everyone else until
-- then. New column and index only; nothing existing changes. Re-runnable.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletesAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "User_deletesAt_idx" ON "User"("deletesAt");
