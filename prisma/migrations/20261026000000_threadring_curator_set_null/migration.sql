-- A ThreadRing row outlives its curator's account.
--
-- Rows that mirror a Ring Hub ring used to name whoever posted to the ring
-- first as curator, and the relation cascaded, so deleting that account
-- dropped the ring row and everyone's PostThreadRing links in it. Now
-- "curatorId" can be empty and is cleared (SET NULL) when the account goes.
--
-- Hand-written and safe to run twice. No rows change. The foreign key is
-- swapped inside one DO block, so there is no moment without it.

ALTER TABLE "ThreadRing" ALTER COLUMN "curatorId" DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE "ThreadRing" DROP CONSTRAINT IF EXISTS "ThreadRing_curatorId_fkey";
  ALTER TABLE "ThreadRing" ADD CONSTRAINT "ThreadRing_curatorId_fkey"
    FOREIGN KEY ("curatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END $$;
