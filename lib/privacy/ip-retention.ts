/**
 * How long visitors' IP addresses stay in the database, and the job that
 * forgets them. Every place an address is stored keeps it for what it's for
 * and no longer (signup audit follow-up, 2026-10-26: these were kept forever):
 *
 * - Abuse limits (SignupAttempt, IpSignupTracking): the checks look back a
 *   day at most (lib/server/http/rate-limit.ts); admins get ADDRESS_DAYS of
 *   history to look into a wave of signups. An address an admin blocked by
 *   hand stays while it's blocked.
 * - The beta funnel, invite shares and consent records keep their rows, for
 *   the counts and the record that someone agreed; the address and the
 *   browser's user agent go after ADDRESS_DAYS.
 * - Post views (PostView.ipHash) only need the hash for an hour, to count a
 *   signed-out reader once; it goes after POST_VIEW_HASH_HOURS. The hash of
 *   an IPv4 address is as good as the address.
 * - Rate-limit rows are keyed `ip:<address>` for signed-out callers; expired
 *   ones go (cleanupExpiredRateLimits, which nothing was running).
 *
 * Home visits never store an address (lib/pixel-homes/visit-count.ts).
 */
import type { PrismaClient } from '@prisma/client';
import { db as defaultDb } from '@/lib/config/database/connection';

export const ADDRESS_DAYS = 30;
export const POST_VIEW_HASH_HOURS = 24;

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

export interface ForgottenAddresses {
  signupAttempts: number;
  ipTracking: number;
  betaSignups: number;
  inviteShares: number;
  consents: number;
  consentLogs: number;
  postViews: number;
  rateLimits: number;
}

type Db = Pick<
  PrismaClient,
  'signupAttempt' | 'ipSignupTracking' | 'betaLandingSignup' | 'betaInviteShare' | 'userConsent' | 'consentLog' | 'postView' | 'rateLimit'
>;

/** Deletes or blanks every stored address past its time. Safe to run any time, as often as you like. */
export async function forgetOldAddresses(now: Date = new Date(), db: Db = defaultDb): Promise<ForgottenAddresses> {
  const before = new Date(now.getTime() - ADDRESS_DAYS * DAY);
  const blank = { ipAddress: null, userAgent: null };
  const holdsAddress = { OR: [{ ipAddress: { not: null } }, { userAgent: { not: null } }] };

  const [signupAttempts, ipTracking, betaSignups, inviteShares, consents, consentLogs, postViews, rateLimits] = await Promise.all([
    db.signupAttempt.deleteMany({ where: { attemptedAt: { lt: before } } }),
    db.ipSignupTracking.deleteMany({
      where: {
        lastAttemptAt: { lt: before },
        // A block an admin made stays; an automatic one that has run out doesn't
        OR: [{ isBlocked: false }, { autoBlocked: true, unblockAt: { lt: now } }],
      },
    }),
    db.betaLandingSignup.updateMany({ where: { signupStartedAt: { lt: before }, ...holdsAddress }, data: blank }),
    db.betaInviteShare.updateMany({ where: { sharedAt: { lt: before }, ...holdsAddress }, data: blank }),
    db.userConsent.updateMany({ where: { timestamp: { lt: before }, ...holdsAddress }, data: blank }),
    db.consentLog.updateMany({ where: { timestamp: { lt: before }, ...holdsAddress }, data: blank }),
    db.postView.updateMany({
      where: { createdAt: { lt: new Date(now.getTime() - POST_VIEW_HASH_HOURS * HOUR) }, ipHash: { not: null } },
      data: { ipHash: null },
    }),
    db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);

  return {
    signupAttempts: signupAttempts.count,
    ipTracking: ipTracking.count,
    betaSignups: betaSignups.count,
    inviteShares: inviteShares.count,
    consents: consents.count,
    consentLogs: consentLogs.count,
    postViews: postViews.count,
    rateLimits: rateLimits.count,
  };
}

// Let the server finish starting before the first run
const FIRST_RUN_DELAY_MS = 15 * 60 * 1000;
const globalForRetention = globalThis as unknown as { __ipRetentionStarted?: boolean };

async function tick(): Promise<void> {
  try {
    const forgotten = await forgetOldAddresses();
    const total = Object.values(forgotten).reduce((sum, n) => sum + n, 0);
    if (total > 0) console.log(`Forgot old IP addresses: ${JSON.stringify(forgotten)}`);
  } catch (error) {
    console.error('Forgetting old IP addresses failed:', error);
  }
}

/** Daily, production only; started from instrumentation.ts like the other timed jobs */
export function startIpRetention(): void {
  if (globalForRetention.__ipRetentionStarted) return;
  if (process.env.NODE_ENV !== 'production') return;
  globalForRetention.__ipRetentionStarted = true;
  setTimeout(() => {
    void tick();
    setInterval(() => void tick(), DAY).unref();
  }, FIRST_RUN_DELAY_MS).unref();
}
