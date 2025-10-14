-- Add CSS mode field to Profile table
-- This field replaces the old CSS comment parsing system

-- Add cssMode field (stores 'inherit', 'override', or 'disable')
ALTER TABLE "Profile" ADD COLUMN "cssMode" TEXT NOT NULL DEFAULT 'inherit';

-- Add comment for documentation
COMMENT ON COLUMN "Profile"."cssMode" IS 'CSS mode: inherit (add to site CSS), override (take precedence), or disable (complete control)';
