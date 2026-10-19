-- Pixel homes Phase 5 (design/pixel-homes-audit/PLAN.md): "Stopped by".
--
-- Hand-written, additive, and safe to run twice.
--  * Profile.showInVisitorTrails starts true for everyone, which is how the
--    trail already works: signed-in visitors appear. People can turn it off.
--  * PixelHomeVisitCount starts empty. It holds one number per home per day
--    for visits that don't appear in the trail, and nothing about who.

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "showInVisitorTrails" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "PixelHomeVisitCount" (
    "homeOwnerId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PixelHomeVisitCount_pkey" PRIMARY KEY ("homeOwnerId","day")
);

CREATE INDEX IF NOT EXISTS "PixelHomeVisitCount_day_idx" ON "PixelHomeVisitCount"("day");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PixelHomeVisitCount_homeOwnerId_fkey') THEN
    ALTER TABLE "PixelHomeVisitCount"
      ADD CONSTRAINT "PixelHomeVisitCount_homeOwnerId_fkey"
      FOREIGN KEY ("homeOwnerId") REFERENCES "UserHomeConfig"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
