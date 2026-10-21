-- A MIDI song's own sound bank (GeneralUser GS trimmed to the song), made at
-- upload; older songs get one from scripts/backfill-midi-sound-banks.ts.
-- Additive and nullable (a song without one plays on the old synth);
-- re-runnable.
ALTER TABLE "Media" ADD COLUMN IF NOT EXISTS "soundBankUrl" TEXT;
