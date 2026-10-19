-- Profile tabs the owner hid from Settings > Your page. Re-runnable.
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "hiddenTabs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
