-- 1) Add atmosphere fields
ALTER TABLE "public"."UserHomeConfig"
  ADD COLUMN IF NOT EXISTS "atmosphereSky"       TEXT     NOT NULL DEFAULT 'sunny',
  ADD COLUMN IF NOT EXISTS "atmosphereWeather"   TEXT     NOT NULL DEFAULT 'clear',
  ADD COLUMN IF NOT EXISTS "atmosphereTimeOfDay" TEXT     NOT NULL DEFAULT 'midday';

-- 2) Add color overrides
ALTER TABLE "public"."UserHomeConfig"
  ADD COLUMN IF NOT EXISTS "wallColor"   TEXT,
  ADD COLUMN IF NOT EXISTS "roofColor"   TEXT,
  ADD COLUMN IF NOT EXISTS "trimColor"   TEXT,
  ADD COLUMN IF NOT EXISTS "windowColor" TEXT,
  ADD COLUMN IF NOT EXISTS "detailColor" TEXT;

-- 3) Add style options
ALTER TABLE "public"."UserHomeConfig"
  ADD COLUMN IF NOT EXISTS "windowStyle" TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS "doorStyle"   TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS "roofTrim"    TEXT NOT NULL DEFAULT 'default';

-- 4) Add text fields
ALTER TABLE "public"."UserHomeConfig"
  ADD COLUMN IF NOT EXISTS "houseTitle"       TEXT,
  ADD COLUMN IF NOT EXISTS "houseDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "houseBoardText"   TEXT;

-- Create UserHomeDecoration table
CREATE TABLE IF NOT EXISTS "public"."UserHomeDecoration" (
  "id"             TEXT        NOT NULL,
  "userId"         TEXT        NOT NULL,
  "decorationType" TEXT        NOT NULL, -- plant, path, feature, seasonal
  "decorationId"   TEXT        NOT NULL, -- e.g., roses_red, stone_path, bird_bath
  "zone"           TEXT        NOT NULL, -- front_yard, house_facade, background
  "positionX"      INTEGER     NOT NULL,
  "positionY"      INTEGER     NOT NULL,
  "layer"          INTEGER     NOT NULL DEFAULT 1,
  "variant"        TEXT,
  "size"           TEXT        NOT NULL DEFAULT 'medium', -- small, medium, large
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserHomeDecoration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserHomeDecoration_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "public"."UserHomeConfig"("userId")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Helpful indexes for rendering/querying
CREATE INDEX IF NOT EXISTS "UserHomeDecoration_userId_idx"
  ON "public"."UserHomeDecoration"("userId");

CREATE INDEX IF NOT EXISTS "UserHomeDecoration_userId_zone_idx"
  ON "public"."UserHomeDecoration"("userId","zone");
