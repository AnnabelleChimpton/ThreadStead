-- Account moderation: suspend (until a date), ban, lift, with an audit log
-- (EXTERNAL_AUDIT_REVIEW S-3). Hand-written and additive: two enums, five
-- columns on "User" (one NOT NULL with a default, so no rewrite on PG 11+),
-- and one new table. Safe to re-run.

DO $$ BEGIN
  CREATE TYPE "ModerationStatus" AS ENUM ('active', 'suspended', 'banned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ModerationActionType" AS ENUM ('suspend', 'ban', 'lift', 'delete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "moderatedById" TEXT;

CREATE INDEX IF NOT EXISTS "User_moderationStatus_idx" ON "User"("moderationStatus");

DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_moderatedById_fkey"
    FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ModerationAction" (
    "id" TEXT NOT NULL,
    "action" "ModerationActionType" NOT NULL,
    "userId" TEXT,
    "userHandle" TEXT,
    "actorId" TEXT,
    "reason" TEXT,
    "until" TIMESTAMP(3),
    "reportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ModerationAction_userId_createdAt_idx" ON "ModerationAction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ModerationAction_createdAt_idx" ON "ModerationAction"("createdAt");

DO $$ BEGIN
  ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
