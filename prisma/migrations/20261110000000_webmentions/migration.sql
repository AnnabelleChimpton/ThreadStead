-- Webmentions (lib/webmentions): a notification type for "an outside page
-- links to your post", and the resident's switch for telling sites their
-- public posts link to. Starts on for everyone. Re-runnable.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'webmention';

ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "sendWebmentions" BOOLEAN NOT NULL DEFAULT true;
