-- Pixel homes editor, Phase 3 step 4 (design/pixel-homes-audit/PLAN.md):
-- decorations on grid cells, and a stored send back / bring forward.
--
-- Hand-written, additive, and safe to run twice. No yard moves:
--  * gridX/gridY are set only for rows already exactly on the 16 px grid
--    (positionX and positionY both multiples of 16), so they describe the
--    same spot. Every other row stays a free placement at its exact pixels.
--  * positionX/positionY are untouched; the app keeps writing them, so
--    older code and the share snapshots read the same positions.
--  * layerBias starts at 0 for everyone. Whether rows that overlap the
--    house keep drawing in front of it is a separate, optional backfill:
--    scripts/pixel-homes-depth-backfill.ts (dry run by default).

ALTER TABLE "UserHomeDecoration" ADD COLUMN IF NOT EXISTS "gridX" INTEGER;
ALTER TABLE "UserHomeDecoration" ADD COLUMN IF NOT EXISTS "gridY" INTEGER;
ALTER TABLE "UserHomeDecoration" ADD COLUMN IF NOT EXISTS "layerBias" INTEGER NOT NULL DEFAULT 0;

UPDATE "UserHomeDecoration"
SET "gridX" = "positionX" / 16,
    "gridY" = "positionY" / 16
WHERE "gridX" IS NULL
  AND "gridY" IS NULL
  AND "positionX" % 16 = 0
  AND "positionY" % 16 = 0;
