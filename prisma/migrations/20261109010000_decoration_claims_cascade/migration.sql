-- A decoration claim goes with its account. It was ON DELETE RESTRICT, so
-- deleting any account that had claimed a decoration failed at the very last
-- step (lib/domain/users/account-removal.ts eraseAccount). Re-runnable.

ALTER TABLE "UserDecorationClaim" DROP CONSTRAINT IF EXISTS "UserDecorationClaim_userId_fkey";
ALTER TABLE "UserDecorationClaim" ADD CONSTRAINT "UserDecorationClaim_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
