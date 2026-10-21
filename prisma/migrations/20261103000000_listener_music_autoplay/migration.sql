-- A visitor's own choice about other people's profile music starting on its
-- own. Additive, with a default, so existing rows need nothing; re-runnable.
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "playProfileMusicAutomatically" BOOLEAN NOT NULL DEFAULT true;
