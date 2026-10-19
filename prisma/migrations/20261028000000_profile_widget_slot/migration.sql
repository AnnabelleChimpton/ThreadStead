-- The widget slot on the standard profile layout: a small template fragment
-- picked from a few widgets, stored with its compiled form so a profile view
-- never compiles (lib/domain/profile/widget-slot). Re-runnable.
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "widgetSlot" JSONB;
