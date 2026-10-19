-- A moderator can put someone's profile page back to the standard layout
-- (lib/domain/users/page-reset.ts). Re-runnable.
ALTER TYPE "ModerationActionType" ADD VALUE IF NOT EXISTS 'reset_page';
