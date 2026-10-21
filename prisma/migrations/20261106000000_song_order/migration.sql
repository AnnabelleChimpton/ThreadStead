-- The order of a resident's songs in Settings → Music, once they've moved
-- one. Additive and nullable (songs never moved keep newest-first);
-- re-runnable.
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "songOrder" INTEGER;
