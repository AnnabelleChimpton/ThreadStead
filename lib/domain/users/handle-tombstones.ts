/**
 * Usernames of deleted accounts, held back so a link to someone's page (or
 * their Bluesky handle, @alice.homepageagain.com) can't start pointing at a
 * stranger who signs up with the freed name.
 *
 * 12 months by default. Forever when the account ever linked Bluesky (a
 * handle in someone's old posts and follows would resolve to the new owner)
 * or was removed for abuse. Written by every path that deletes a user:
 * lib/domain/users/account-removal.ts, scripts/delete-user.ts and
 * scripts/delete-test-users.ts. Matched by address label, so tombstoning
 * a_b also holds a-b.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { subdomainLabelFor } from '@/lib/subdomains/host';

export const TOMBSTONE_MONTHS = 12;

type Reader = Pick<PrismaClient, 'user'> | Prisma.TransactionClient;
type TombstoneClient = Pick<PrismaClient, 'handleTombstone'> | Prisma.TransactionClient;

export interface TombstoneOptions {
  /** A moderation deletion (banned first): the name is never given out again */
  removedForAbuse: boolean;
  now?: Date;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

/** When a tombstone stops holding the name; null is forever. */
export function tombstoneExpiry(
  { blueskyLinked, removedForAbuse }: { blueskyLinked: boolean; removedForAbuse: boolean },
  now = new Date()
): Date | null {
  return blueskyLinked || removedForAbuse ? null : addMonths(now, TOMBSTONE_MONTHS);
}

/**
 * The tombstone rows for one account, read before it's deleted: one per
 * username it held (older accounts can have more than one Handle). Any
 * Bluesky link counts, revoked or not: the handle may still be in a DID
 * document or in people's follows.
 */
export async function tombstonesForUser(
  client: Reader,
  userId: string,
  { removedForAbuse, now = new Date() }: TombstoneOptions
): Promise<Prisma.HandleTombstoneCreateManyInput[]> {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      primaryHandle: true,
      handles: { select: { handle: true } },
      blueskyHandleLink: { select: { id: true } },
    },
  });
  if (!user) return [];

  const names = new Set(user.handles.map((h) => h.handle.toLowerCase()));
  const primary = user.primaryHandle?.split('@')[0];
  if (primary) names.add(primary.toLowerCase());

  const blueskyLinked = !!user.blueskyHandleLink;
  const expiresAt = tombstoneExpiry({ blueskyLinked, removedForAbuse }, now);
  return [...names].map((handle) => ({
    handle,
    subdomainLabel: subdomainLabelFor(handle),
    blueskyLinked,
    removedForAbuse,
    createdAt: now,
    expiresAt,
  }));
}

/** Whether a tombstone still holds this address label. */
export async function isLabelTombstoned(client: TombstoneClient, label: string, now = new Date()): Promise<boolean> {
  const held = await client.handleTombstone.findFirst({
    where: { subdomainLabel: label, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    select: { id: true },
  });
  return !!held;
}
