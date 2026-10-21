/**
 * Per-IP signup caps (IP_LIMITS) for accounts made through /api/auth/verify.
 *
 * validateSignupLimits counts SignupAttempt rows with success: true, but only
 * the beta landing flow used to write them, so normal signups never counted
 * and the caps never fired. recordSignup writes that row in the same
 * transaction that creates the User, and re-checks the counts under a
 * per-IP advisory lock so parallel requests can't all slip past the
 * pre-check.
 */
import type { Prisma } from "@prisma/client";
import { IP_LIMITS, SIGNUP_LIMIT_MESSAGES, signupLimitsApply } from "@/lib/server/http/rate-limit";

export class SignupLimitError extends Error {}

const HOUR = 60 * 60 * 1000;

/**
 * Counts one new account against its IP. Throws SignupLimitError (rolling
 * back the transaction, and with it the User) when the IP is already at a
 * cap. A beta landing signup already has an attempt row from claiming its
 * key; that row is marked as the success instead of adding a second one.
 */
export async function recordSignup(
  tx: Prisma.TransactionClient,
  signup: { ipAddress: string; userAgent: string | null; userId: string; betaKey?: string }
): Promise<void> {
  if (!signupLimitsApply()) return;
  const { ipAddress, userAgent, userId, betaKey } = signup;

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`signup:${ipAddress}`}))`;

  const now = Date.now();
  const successes = (since?: number) =>
    tx.signupAttempt.count({
      where: { ipAddress, success: true, ...(since ? { attemptedAt: { gte: new Date(since) } } : {}) },
    });
  const [hour, day, lifetime] = await Promise.all([
    successes(now - HOUR),
    successes(now - 24 * HOUR),
    successes(),
  ]);
  if (hour >= IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_HOUR) throw new SignupLimitError(SIGNUP_LIMIT_MESSAGES.hour());
  if (day >= IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_DAY) throw new SignupLimitError(SIGNUP_LIMIT_MESSAGES.day());
  if (lifetime >= IP_LIMITS.MAX_SIGNUPS_PER_IP_LIFETIME) throw new SignupLimitError(SIGNUP_LIMIT_MESSAGES.lifetime());

  if (betaKey) {
    const claimed = await tx.signupAttempt.updateMany({
      where: { betaCode: betaKey, landingPageId: { not: null }, success: false },
      data: { success: true, userId },
    });
    // The landing flow's /complete call bumps IpSignupTracking itself
    if (claimed.count > 0) return;
  }

  await tx.signupAttempt.create({
    data: { ipAddress, userAgent, betaCode: betaKey ?? null, success: true, userId },
  });
  const at = new Date(now);
  await tx.ipSignupTracking.upsert({
    where: { ipAddress },
    update: { signupAttempts: { increment: 1 }, successfulSignups: { increment: 1 }, lastAttemptAt: at },
    create: { ipAddress, signupAttempts: 1, successfulSignups: 1, firstAttemptAt: at, lastAttemptAt: at },
  });
}
