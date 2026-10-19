-- A short status line of the owner's own on their profile. Re-runnable.
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "status" TEXT;
