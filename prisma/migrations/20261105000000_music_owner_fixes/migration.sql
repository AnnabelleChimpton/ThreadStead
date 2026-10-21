-- MIDI plan Phase 5, one-off data fixes. Data only, no schema change;
-- re-runnable (each statement only touches rows that still need it).

-- Profiles whose song was deleted still pointed at it, so Settings said
-- "Background music is active (Unnamed Track)". Deleting a song now clears
-- this; these are the ones from before.
UPDATE "Profile" p
SET "profileMidiId" = NULL
WHERE p."profileMidiId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Media" m
    WHERE m."id" = p."profileMidiId" AND m."userId" = p."userId" AND m."mediaType" = 'midi'
  );

-- Every song upload was marked as a featured photo and took a photo slot.
UPDATE "Media"
SET "featured" = false, "featuredOrder" = NULL
WHERE "mediaType" = 'midi' AND ("featured" = true OR "featuredOrder" IS NOT NULL);
