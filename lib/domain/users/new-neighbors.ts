/**
 * Who the homepage's New Neighbors widget may feature.
 *
 * It used to show the newest accounts, so a spam signup sat on the
 * logged-out homepage, bio and all, within minutes. Now a newcomer shows
 * once their account is SETTLE_HOURS old and they've done one thing here:
 * a public post, a change to their house, or a guestbook entry from
 * someone else. The full directory still lists everyone.
 */
import { db } from "@/lib/config/database/connection";

export const SETTLE_HOURS = 48;

/**
 * Ids of every account that has settled in. The site has a few hundred
 * accounts, so the whole list is cheap; callers intersect it with their
 * own filters (visibility, blocks).
 */
export async function settledResidentIds(): Promise<string[]> {
  // Timestamps are UTC `timestamp(3)`; now() is timestamptz, so pin it to
  // UTC or the cutoff shifts by the session's time zone.
  // verify.ts makes the house config at signup, so only a save a few
  // minutes later counts as changing it.
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT u.id FROM "User" u
    WHERE u."createdAt" <= (now() AT TIME ZONE 'UTC') - make_interval(hours => ${SETTLE_HOURS}::int)
      AND (
        EXISTS (SELECT 1 FROM "Post" p WHERE p."authorId" = u.id AND p.visibility = 'public')
        OR EXISTS (
          SELECT 1 FROM "UserHomeConfig" h
          WHERE h."userId" = u.id AND h."updatedAt" > u."createdAt" + interval '5 minutes'
        )
        OR EXISTS (SELECT 1 FROM "UserHomeDecoration" d WHERE d."userId" = u.id)
        OR EXISTS (
          SELECT 1 FROM "GuestbookEntry" g
          WHERE g."profileOwner" = u.id AND g.status = 'visible' AND g."authorId" IS DISTINCT FROM u.id
        )
      )`;
  return rows.map((r) => r.id);
}
