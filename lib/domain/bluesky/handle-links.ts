/**
 * Residents using their address as their Bluesky handle
 * (design/home-subdomains/SCOPE.md, Phase 1).
 *
 *   1. Settings: they paste their Bluesky handle or DID. I look the account
 *      up and store a pending link, which /.well-known/atproto-did on their
 *      address serves for 72 hours.
 *   2. They switch their handle in Bluesky's own settings ("I have my own
 *      domain" → "No DNS panel"). Bluesky reads that file to check it.
 *   3. "Check": plc.directory's copy of their DID document now names
 *      alice.homepageagain.com, so the link is verified. Only then does the
 *      profile show it.
 *   4. Verified links are checked again every day. If the document names
 *      some other handle now, the link is revoked and the file stops serving.
 */
import { db } from '@/lib/config/database/connection';
import { ApiError } from '@/lib/api/errors';
import { activeUserWhere, isRestricted, MODERATION_SELECT } from '@/lib/domain/users/moderation';
import { INFRA_LABELS, residentAddress, residentApex } from '@/lib/subdomains/host';
import {
  BlueskyLookupError,
  defaultFetcher,
  lookupBlueskyAccount,
  parseBlueskyInput,
  plcHandle,
  type BlueskyAccount,
  type Fetcher,
} from './atproto';
import { invalidateServedDids } from './served-dids';

const HOUR = 60 * 60 * 1000;
export const PENDING_HOURS = 72;
/** The daily re-check takes links last checked longer ago than this */
export const RECHECK_AFTER_HOURS = 20;

export type LinkStatus = 'pending' | 'verified' | 'revoked' | 'expired';

export interface BlueskyLinkView {
  did: string;
  previousHandle: string | null;
  status: LinkStatus;
  pendingUntil: string | null;
  verifiedAt: string | null;
  lastCheckedAt: string | null;
  lastCheckNote: string | null;
}

export interface BlueskySettingsState {
  /** alice.homepageagain.com, or null when they can't use one */
  address: string | null;
  /** Why there's no address, in words for them */
  noAddressReason: string | null;
  link: BlueskyLinkView | null;
}

type LinkRow = {
  did: string;
  previousHandle: string | null;
  status: 'pending' | 'verified' | 'revoked';
  pendingUntil: Date | null;
  verifiedAt: Date | null;
  lastCheckedAt: Date | null;
  lastCheckNote: string | null;
};

const LINK_SELECT = {
  did: true,
  previousHandle: true,
  status: true,
  pendingUntil: true,
  verifiedAt: true,
  lastCheckedAt: true,
  lastCheckNote: true,
} as const;

/** A pending link past its 72 hours reads as expired (and isn't served). */
export function linkStatus(link: Pick<LinkRow, 'status' | 'pendingUntil'>, now = new Date()): LinkStatus {
  if (link.status === 'pending' && (!link.pendingUntil || link.pendingUntil <= now)) return 'expired';
  return link.status;
}

function view(link: LinkRow, now: Date): BlueskyLinkView {
  return {
    did: link.did,
    previousHandle: link.previousHandle,
    status: linkStatus(link, now),
    pendingUntil: link.pendingUntil?.toISOString() ?? null,
    verifiedAt: link.verifiedAt?.toISOString() ?? null,
    lastCheckedAt: link.lastCheckedAt?.toISOString() ?? null,
    lastCheckNote: link.lastCheckNote,
  };
}

/** Their address, or why they don't have one they can use as a handle. */
export function addressForLabel(label: string | null): { address: string | null; noAddressReason: string | null } {
  if (!residentApex()) return { address: null, noAddressReason: "Addresses aren't switched on for this site yet." };
  if (!label) {
    return {
      address: null,
      noAddressReason:
        "Your username doesn't have an address yet (an older account has the same name with - and _ swapped). Send me a message and I'll sort it out.",
    };
  }
  if (INFRA_LABELS.has(label)) {
    return {
      address: null,
      noAddressReason: "Your username is one I keep for the site's own addresses, so it can't be a Bluesky handle. Sorry!",
    };
  }
  return { address: residentAddress(label), noAddressReason: null };
}

async function loadUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { subdomainLabel: true, blueskyHandleLink: { select: LINK_SELECT } },
  });
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

export async function getBlueskyState(userId: string, now = new Date()): Promise<BlueskySettingsState> {
  const user = await loadUser(userId);
  return {
    ...addressForLabel(user.subdomainLabel),
    link: user.blueskyHandleLink ? view(user.blueskyHandleLink, now) : null,
  };
}

interface Options {
  fetcher?: Fetcher;
  now?: Date;
}

/**
 * Step 1: look up the account they pasted and start a pending link. Linking
 * again replaces the old link. When the account already uses the address
 * (they're linking again), it's checked straight away.
 */
export async function linkBluesky(
  userId: string,
  rawInput: unknown,
  { fetcher = defaultFetcher, now = new Date() }: Options = {}
): Promise<BlueskySettingsState & { account: BlueskyAccount }> {
  const user = await loadUser(userId);
  const { address, noAddressReason } = addressForLabel(user.subdomainLabel);
  if (!address) throw new ApiError(400, noAddressReason ?? "You don't have an address yet.");

  const input = parseBlueskyInput(rawInput);
  if (input.kind === 'invalid') throw new ApiError(400, input.message);
  if (input.kind === 'handle' && input.handle === address) {
    throw new ApiError(400, "That's your address here. Paste the Bluesky handle you have now, like @you.bsky.social");
  }

  let account: BlueskyAccount;
  try {
    account = await lookupBlueskyAccount(input, fetcher);
  } catch (error) {
    if (error instanceof BlueskyLookupError) throw new ApiError(error.status, error.message);
    throw error;
  }

  const previousHandle =
    account.handle && account.handle !== address && account.handle !== 'handle.invalid'
      ? account.handle
      : user.blueskyHandleLink?.previousHandle ?? null;
  const fields = {
    did: account.did,
    previousHandle,
    status: 'pending' as const,
    pendingUntil: new Date(now.getTime() + PENDING_HOURS * HOUR),
    verifiedAt: null,
    lastCheckedAt: null,
    lastCheckNote: null,
  };
  await db.blueskyHandleLink.upsert({ where: { userId }, create: { userId, ...fields }, update: fields });
  invalidateServedDids();

  if (account.handle === address) {
    return { ...(await checkBluesky(userId, { fetcher, now })), account };
  }
  return { ...(await getBlueskyState(userId, now)), account };
}

/** Steps 3 and 4 for one link: what plc.directory says, and what that changes. */
async function applyCheck(
  userId: string,
  link: LinkRow,
  address: string,
  fetcher: Fetcher,
  now: Date,
  /** They pressed Check (rather than the daily re-check), so tell them about a failed lookup */
  manual: boolean
): Promise<'verified' | 'still-pending' | 'revoked' | 'unreachable'> {
  const status = linkStatus(link, now);
  const result = await plcHandle(link.did, fetcher);
  if (!result.ok) {
    if (!manual) return 'unreachable';
    await db.blueskyHandleLink.update({
      where: { userId },
      data: { lastCheckNote: "I couldn't reach Bluesky's directory just now, so nothing changed. Try again in a minute?" },
    });
    return 'unreachable';
  }

  if (result.handle === address) {
    await db.blueskyHandleLink.update({
      where: { userId },
      data: { status: 'verified', verifiedAt: link.verifiedAt ?? now, pendingUntil: null, lastCheckedAt: now, lastCheckNote: null },
    });
    if (status !== 'verified') invalidateServedDids();
    return 'verified';
  }

  const theirs = result.handle ? `@${result.handle}` : 'no handle';
  if (status === 'pending') {
    await db.blueskyHandleLink.update({
      where: { userId },
      data: {
        lastCheckedAt: now,
        lastCheckNote: `Bluesky still has you as ${theirs}. Finish the steps there, then check again.`,
      },
    });
    return 'still-pending';
  }

  // Verified before, and their document names another handle now
  await db.blueskyHandleLink.update({
    where: { userId },
    data: {
      status: 'revoked',
      pendingUntil: null,
      lastCheckedAt: now,
      lastCheckNote: `Bluesky has you as ${theirs} now, so I stopped answering for @${address}. You can link it again any time.`,
    },
  });
  invalidateServedDids();
  return 'revoked';
}

/** "Check": has Bluesky switched them over yet? */
export async function checkBluesky(
  userId: string,
  { fetcher = defaultFetcher, now = new Date() }: Options = {}
): Promise<BlueskySettingsState> {
  const user = await loadUser(userId);
  const link = user.blueskyHandleLink;
  const { address, noAddressReason } = addressForLabel(user.subdomainLabel);
  if (!address) throw new ApiError(400, noAddressReason ?? "You don't have an address yet.");
  if (!link) throw new ApiError(404, 'Link your Bluesky account first.');

  const status = linkStatus(link, now);
  if (status === 'expired') {
    throw new ApiError(409, 'That link waited 72 hours and ran out. Start again and it gets another 72.');
  }
  if (status === 'revoked') throw new ApiError(409, 'Link your Bluesky account again first.');

  await applyCheck(userId, link, address, fetcher, now, true);
  return getBlueskyState(userId, now);
}

/** Stop using the address as a handle. The row stays, revoked (see HandleTombstone). */
export async function unlinkBluesky(userId: string, now = new Date()): Promise<BlueskySettingsState> {
  const updated = await db.blueskyHandleLink.updateMany({
    where: { userId, status: { not: 'revoked' } },
    data: { status: 'revoked', pendingUntil: null, lastCheckNote: null },
  });
  if (updated.count > 0) invalidateServedDids();
  return getBlueskyState(userId, now);
}

/** Their verified handle for the profile page, or null. */
export async function verifiedBlueskyHandle(userId: string, now = new Date()): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { subdomainLabel: true, ...MODERATION_SELECT, blueskyHandleLink: { select: { status: true } } },
  });
  if (!user || isRestricted(user, now) || user.blueskyHandleLink?.status !== 'verified') return null;
  return addressForLabel(user.subdomainLabel).address;
}

/**
 * The handle the endpoint answers for (or would, if they weren't
 * restricted): verified, or pending and in its 72 hours. For the
 * moderation dialog, which says what a ban does to it.
 */
export async function linkedBlueskyHandle(userId: string, now = new Date()): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { subdomainLabel: true, blueskyHandleLink: { select: { status: true, pendingUntil: true } } },
  });
  const link = user?.blueskyHandleLink;
  if (!user || !link) return null;
  const status = linkStatus(link, now);
  if (status !== 'verified' && status !== 'pending') return null;
  return residentAddress(user.subdomainLabel);
}

export interface RecheckStats {
  checked: number;
  verified: number;
  revoked: number;
  unreachable: number;
}

/**
 * The daily re-check of verified links (lib/domain/bluesky/recheck-scheduler.ts,
 * or scripts/bluesky-handles-recheck.ts by hand). Accounts that are
 * suspended or banned aren't served, so they're skipped.
 */
export async function recheckBlueskyLinks({
  fetcher = defaultFetcher,
  now = new Date(),
  gapMs = 500,
  limit = 500,
}: Options & { gapMs?: number; limit?: number } = {}): Promise<RecheckStats> {
  const due = await db.blueskyHandleLink.findMany({
    where: {
      status: 'verified',
      OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: new Date(now.getTime() - RECHECK_AFTER_HOURS * HOUR) } }],
      user: activeUserWhere(now),
    },
    select: { userId: true, ...LINK_SELECT, user: { select: { subdomainLabel: true } } },
    orderBy: { lastCheckedAt: { sort: 'asc', nulls: 'first' } },
    take: limit,
  });

  const stats: RecheckStats = { checked: 0, verified: 0, revoked: 0, unreachable: 0 };
  for (const [i, link] of due.entries()) {
    const { address } = addressForLabel(link.user.subdomainLabel);
    if (!address) continue;
    if (i > 0 && gapMs > 0) await new Promise((resolve) => setTimeout(resolve, gapMs));
    const outcome = await applyCheck(link.userId, link, address, fetcher, now, false);
    stats.checked += 1;
    if (outcome === 'verified') stats.verified += 1;
    else if (outcome === 'revoked') stats.revoked += 1;
    else if (outcome === 'unreachable') stats.unreachable += 1;
  }
  return stats;
}
