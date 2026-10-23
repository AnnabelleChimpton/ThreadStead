/**
 * Whether a new username can be claimed, past validateUsername. Signup asks
 * this twice: check-handle while typing and claim-handle for real.
 *
 * A username is also an address label (a_b → a-b.homepageagain.com), so
 * the two spellings exclude each other: a-b is taken once a_b exists, and
 * the other way round. User.subdomainLabel is unique, which settles a race
 * between the two. A deleted account's name stays held by its tombstone.
 */
import { Prisma } from '@prisma/client';
import { db } from '@/lib/config/database/connection';
import { SITE_NAME } from '@/lib/config/site/constants';
import { subdomainLabelFor } from '@/lib/subdomains/host';
import { isLabelTombstoned } from './handle-tombstones';

export type HandleUnavailable = 'taken' | 'same-address' | 'held';

export const HANDLE_UNAVAILABLE_MESSAGES: Record<HandleUnavailable, string> = {
  taken: 'Username is already taken',
  'same-address': "That's taken (here - and _ count as the same)",
  held: "That username isn't available",
};

/** Null when the name is free, otherwise why it isn't. */
export async function handleUnavailableReason(handle: string, now = new Date()): Promise<HandleUnavailable | null> {
  const name = handle.toLowerCase();
  const label = subdomainLabelFor(name);

  const rows = await db.$queryRaw<Array<{ handle: string }>>(Prisma.sql`
    SELECT handle FROM "Handle"
    WHERE host = ${SITE_NAME} AND replace(lower(handle), '_', '-') = ${label}
    LIMIT 5
  `);
  if (rows.some((row) => row.handle.toLowerCase() === name)) return 'taken';
  if (rows.length > 0) return 'same-address';

  const labelHolder = await db.user.findUnique({ where: { subdomainLabel: label }, select: { id: true } });
  if (labelHolder) return 'same-address';

  if (await isLabelTombstoned(db, label, now)) return 'held';
  return null;
}

/** A unique-constraint failure on User.subdomainLabel: the other spelling won a race. */
export function isSubdomainLabelConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = (error.meta as { target?: unknown } | undefined)?.target;
  const fields = Array.isArray(target) ? target : [target];
  return fields.some((field) => typeof field === 'string' && field.includes('subdomainLabel'));
}
