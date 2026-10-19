-- Pixel homes Phase 4 (design/pixel-homes-audit/PLAN.md): the sprite pipeline.
--
-- Hand-written, additive, and safe to run twice. Nothing existing changes:
--  * width/height start empty, so every current PNG keeps rendering at the
--    size in lib/pixel-homes/decoration-dimensions.ts until it's re-uploaded
--    through admin, which reads the size from the file.
--  * frames is 1 for everyone; collection and pngVersion start empty.
--  * DecorationArtVersion starts empty. Existing pngUrls stay where they are
--    and simply have no version history.

ALTER TABLE "DecorationItem" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "DecorationItem" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "DecorationItem" ADD COLUMN IF NOT EXISTS "frames" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DecorationItem" ADD COLUMN IF NOT EXISTS "pngVersion" INTEGER;
ALTER TABLE "DecorationItem" ADD COLUMN IF NOT EXISTS "collection" TEXT;

CREATE TABLE IF NOT EXISTS "DecorationArtVersion" (
    "id" TEXT NOT NULL,
    "decorationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "frames" INTEGER NOT NULL DEFAULT 1,
    "colours" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "DecorationArtVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DecorationArtVersion_decorationId_version_key"
    ON "DecorationArtVersion"("decorationId", "version");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DecorationArtVersion_decorationId_fkey') THEN
        ALTER TABLE "DecorationArtVersion" ADD CONSTRAINT "DecorationArtVersion_decorationId_fkey"
            FOREIGN KEY ("decorationId") REFERENCES "DecorationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
