import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { getClientIp } from "./client-ip";
import { randomUUID } from "crypto";

/**
 * Every rate limiter in the app lives here:
 *
 *  1. Per-category request limits for API routes, stored in Postgres
 *     (`RateLimit` table) so they survive restarts. apiHandler's `rateLimit`
 *     option and `withRateLimit` use these.
 *  2. An in-memory sliding-window limiter, for traffic that never touches an
 *     API route (chat over socket.io).
 *  3. Signup abuse limits per IP (signup attempts and IP blocks).
 */

// ─── 1. Per-category API limits ─────────────────────────────────────────────

export type RateLimitCategory =
  | "posts"
  | "comments"
  | "uploads"
  | "profile_updates" // Legacy - use more specific categories below
  | "template_editing" // Template and CSS saves
  | "profile_metadata" // Bio, avatar, display name, settings
  | "profile_toggles" // Enable/disable operations
  | "threadring_operations"
  | "guestbook"
  | "polls" // Poll voting
  | "search" // External (paid) web search
  | "admin"
  | "default";

interface RateLimitConfig {
  limit: number; // Max requests allowed
  windowMs: number; // Time window in milliseconds
}

/**
 * Rate limit configurations by category
 * Format: { requests per window }
 *
 * In development, limits are 10x higher to allow for testing
 */
const isDevelopment = process.env.NODE_ENV === 'development';
const DEV_MULTIPLIER = isDevelopment ? 10 : 1;

export const RATE_LIMIT_CONFIGS: Record<RateLimitCategory, RateLimitConfig> = {
  posts: { limit: 20 * DEV_MULTIPLIER, windowMs: 60 * 1000 }, // 20 per minute (200 in dev)
  comments: { limit: 100 * DEV_MULTIPLIER, windowMs: 60 * 1000 }, // 100 per minute (1000 in dev)
  uploads: { limit: 5 * DEV_MULTIPLIER, windowMs: 60 * 60 * 1000 }, // 5 per hour (50 in dev)
  profile_updates: { limit: 10 * DEV_MULTIPLIER, windowMs: 60 * 60 * 1000 }, // 10 per hour (100 in dev) - LEGACY
  template_editing: { limit: 100 * DEV_MULTIPLIER, windowMs: 60 * 60 * 1000 }, // 100 per hour (1000 in dev)
  profile_metadata: { limit: 30 * DEV_MULTIPLIER, windowMs: 60 * 60 * 1000 }, // 30 per hour (300 in dev)
  profile_toggles: { limit: 50 * DEV_MULTIPLIER, windowMs: 60 * 60 * 1000 }, // 50 per hour (500 in dev)
  threadring_operations: { limit: 200 * DEV_MULTIPLIER, windowMs: 60 * 60 * 1000 }, // 200 per hour (2000 in dev)
  guestbook: { limit: 50 * DEV_MULTIPLIER, windowMs: 60 * 60 * 1000 }, // 50 per hour (500 in dev)
  polls: { limit: 30 * DEV_MULTIPLIER, windowMs: 60 * 1000 }, // 30 per minute (300 in dev)
  search: { limit: 20 * DEV_MULTIPLIER, windowMs: 60 * 1000 }, // 20 per minute (200 in dev) — each miss can spend paid Brave quota
  admin: { limit: 100 * DEV_MULTIPLIER, windowMs: 60 * 1000 }, // 100 per minute (1000 in dev)
  default: { limit: 60 * DEV_MULTIPLIER, windowMs: 60 * 1000 }, // 60 per minute (600 in dev)
};

/** `user:<id>` when signed in, else `ip:<address>`. */
function getIdentifier(req: NextApiRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  return `ip:${getClientIp(req) ?? "unknown"}`;
}

/**
 * Count this request and report whether it's within the limit.
 *
 * One INSERT … ON CONFLICT statement does the read, the window reset and the
 * increment together, under the row lock Postgres takes for the upsert. A
 * read-then-write version let parallel requests all see the same count and
 * all pass. The count stops at limit + 1 so a hammering caller can't grow it
 * forever.
 */
export async function checkRateLimit(
  identifier: string,
  category: RateLimitCategory
): Promise<{ allowed: boolean; remaining: number; resetTime: Date; total: number }> {
  const config = RATE_LIMIT_CONFIGS[category];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);
  const expiresAt = new Date(now.getTime() + config.windowMs + 24 * 60 * 60 * 1000); // +24h for cleanup

  // Timestamps go in as ISO text cast to `timestamp` and come back as epoch
  // ms: the columns hold UTC wall time without a zone (Prisma's convention),
  // and raw Date params/results would get shifted by the session time zone.
  const nowTs = now.toISOString();
  const windowStartTs = windowStart.toISOString();
  const expiresTs = expiresAt.toISOString();

  try {
    const rows = await db.$queryRaw<{ requestCount: number; windowStartMs: number }[]>`
      INSERT INTO "RateLimit" ("id", "identifier", "category", "requestCount", "windowStart", "expiresAt")
      VALUES (${randomUUID()}, ${identifier}, ${category}, 1, ${nowTs}::timestamp, ${expiresTs}::timestamp)
      ON CONFLICT ("identifier", "category") DO UPDATE SET
        "requestCount" = CASE WHEN "RateLimit"."windowStart" > ${windowStartTs}::timestamp
          THEN LEAST("RateLimit"."requestCount" + 1, ${config.limit + 1}::int)
          ELSE 1 END,
        "windowStart" = CASE WHEN "RateLimit"."windowStart" > ${windowStartTs}::timestamp
          THEN "RateLimit"."windowStart" ELSE ${nowTs}::timestamp END,
        "expiresAt" = CASE WHEN "RateLimit"."windowStart" > ${windowStartTs}::timestamp
          THEN "RateLimit"."expiresAt" ELSE ${expiresTs}::timestamp END
      RETURNING "requestCount", (EXTRACT(EPOCH FROM "windowStart") * 1000)::float8 AS "windowStartMs"
    `;
    const { requestCount, windowStartMs } = rows[0];
    const allowed = requestCount <= config.limit;

    return {
      allowed,
      remaining: allowed ? config.limit - requestCount : 0,
      resetTime: new Date(windowStartMs + config.windowMs),
      total: config.limit,
    };
  } catch (error) {
    // If database error, log and allow request (fail open for availability)
    console.error("Rate limit check failed:", error);
    return {
      allowed: true,
      remaining: config.limit,
      resetTime: new Date(now.getTime() + config.windowMs),
      total: config.limit,
    };
  }
}

/**
 * Rate limiting middleware
 * Returns true if allowed, false if rate limited (response already sent)
 */
export async function rateLimitCheck(
  req: NextApiRequest,
  res: NextApiResponse,
  category: RateLimitCategory,
  userId?: string
): Promise<boolean> {
  const identifier = getIdentifier(req, userId);
  const result = await checkRateLimit(identifier, category);

  // Add rate limit headers
  res.setHeader("X-RateLimit-Limit", result.total.toString());
  res.setHeader("X-RateLimit-Remaining", Math.max(0, result.remaining).toString());
  res.setHeader("X-RateLimit-Reset", result.resetTime.toISOString());

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime.getTime() - Date.now()) / 1000);
    res.setHeader("Retry-After", retryAfter.toString());

    res.status(429).json({
      error: "Too many requests",
      message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      retryAfter,
      resetTime: result.resetTime.toISOString(),
    });
    return false;
  }

  return true;
}

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<void | NextApiResponse>;

/**
 * Wrap a hand-written route with a category limit (per user when signed in,
 * else per IP). Routes on apiHandler use its `rateLimit` option instead.
 *
 *   export default withRateLimit('posts')(withCsrfProtection(handler));
 */
export function withRateLimit(category: RateLimitCategory) {
  return (handler: Handler) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const user = await getSessionUser(req);
      // On failure the 429 has already been sent
      if (!(await rateLimitCheck(req, res, category, user?.id))) return;
      return handler(req, res);
    };
  };
}

/**
 * Clean up expired rate limit entries
 * Should be called periodically (e.g., via cron job)
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const result = await db.rateLimit.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}

export interface RateLimitCategoryStats {
  limit: number;
  windowSeconds: number;
  /** Callers (users or IPs) with a request in the current window. */
  activeCallers: number;
  /** Of those, how many are at the limit right now. */
  limitedCallers: number;
}

/** Live numbers from the RateLimit table, for monitoring. */
export async function getRateLimitStats(): Promise<Record<RateLimitCategory, RateLimitCategoryStats>> {
  const now = Date.now();
  const entries = await Promise.all(
    (Object.entries(RATE_LIMIT_CONFIGS) as [RateLimitCategory, RateLimitConfig][]).map(
      async ([category, config]) => {
        const inWindow = { category, windowStart: { gt: new Date(now - config.windowMs) } };
        const [activeCallers, limitedCallers] = await Promise.all([
          db.rateLimit.count({ where: inWindow }),
          db.rateLimit.count({ where: { ...inWindow, requestCount: { gte: config.limit } } }),
        ]);
        const stats: RateLimitCategoryStats = {
          limit: config.limit,
          windowSeconds: config.windowMs / 1000,
          activeCallers,
          limitedCallers,
        };
        return [category, stats] as const;
      }
    )
  );
  return Object.fromEntries(entries) as Record<RateLimitCategory, RateLimitCategoryStats>;
}

// ─── 2. In-memory sliding windows ───────────────────────────────────────────

export interface SlidingWindow<Name extends string> {
  name: Name;
  max: number;
  windowMs: number;
}

export type MemoryLimitResult<Name extends string> = { allowed: true } | { allowed: false; reason: Name };

/**
 * Per-key sliding-window limits kept in this process's memory. Each key must
 * stay under every window; windows are checked in order and the first one
 * that is full is the `reason`. A rejected attempt is not counted.
 *
 * State is lost on restart and not shared between processes, which is fine
 * for the single-process chat server.
 */
export function createMemoryRateLimiter<Name extends string>(
  windows: SlidingWindow<Name>[],
  { sweepEveryMs = 10 * 60 * 1000 }: { sweepEveryMs?: number } = {}
) {
  const hits = new Map<string, number[]>();
  const longest = Math.max(...windows.map((w) => w.windowMs));

  function prune(key: string, now: number): number[] {
    const kept = (hits.get(key) ?? []).filter((ts) => now - ts < longest);
    if (kept.length) hits.set(key, kept);
    else hits.delete(key);
    return kept;
  }

  // Evict idle keys so the map doesn't grow with every user ever seen
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const key of hits.keys()) prune(key, now);
  }, sweepEveryMs);
  sweeper.unref?.();

  return {
    check(key: string): MemoryLimitResult<Name> {
      const now = Date.now();
      const recent = prune(key, now);
      for (const w of windows) {
        if (recent.filter((ts) => now - ts < w.windowMs).length >= w.max) {
          return { allowed: false, reason: w.name };
        }
      }
      recent.push(now);
      hits.set(key, recent);
      return { allowed: true };
    },
    /** Keys with activity inside the longest window. */
    get size() {
      return hits.size;
    },
    stop() {
      clearInterval(sweeper);
    },
  };
}

// ─── 3. Signup limits per IP ────────────────────────────────────────────────

export const IP_LIMITS = {
  // Per IP address limits
  MAX_SIGNUPS_PER_IP_PER_DAY: 3,
  MAX_SIGNUPS_PER_IP_PER_HOUR: 2,
  MAX_FAILED_ATTEMPTS_PER_HOUR: 10,

  // Campaign-specific limits
  MAX_SIGNUPS_PER_IP_PER_CAMPAIGN: 1,

  // Automatic blocking thresholds
  AUTO_BLOCK_AFTER_FAILED_ATTEMPTS: 15,
  AUTO_BLOCK_DURATION_HOURS: 24,

  // Suspicious behavior detection
  MAX_SIGNUPS_PER_IP_LIFETIME: 10,
  SUSPICIOUS_USER_AGENT_PATTERNS: [
    /bot/i, /crawler/i, /spider/i, /headless/i, /phantom/i, /selenium/i
  ]
};

export async function checkIPBlocked(ipAddress: string): Promise<{ isBlocked: boolean; reason?: string }> {
  try {
    const tracking = await db.ipSignupTracking.findUnique({
      where: { ipAddress }
    });

    if (!tracking) {
      return { isBlocked: false };
    }

    // Check manual block
    if (tracking.isBlocked && !tracking.autoBlocked) {
      return {
        isBlocked: true,
        reason: tracking.blockedReason || "IP address has been blocked"
      };
    }

    // Check auto-block with expiry
    if (tracking.isBlocked && tracking.autoBlocked && tracking.unblockAt) {
      if (new Date() < tracking.unblockAt) {
        return {
          isBlocked: true,
          reason: `IP address is temporarily blocked until ${tracking.unblockAt.toISOString()}`
        };
      } else {
        // Auto-unblock expired block
        await db.ipSignupTracking.update({
          where: { ipAddress },
          data: {
            isBlocked: false,
            blockedAt: null,
            blockedReason: null,
            autoBlocked: false,
            unblockAt: null
          }
        });
        return { isBlocked: false };
      }
    }

    // Check permanent auto-block
    if (tracking.isBlocked && tracking.autoBlocked && !tracking.unblockAt) {
      return {
        isBlocked: true,
        reason: "IP address has been automatically blocked due to suspicious activity"
      };
    }

    return { isBlocked: false };
  } catch (error) {
    console.error("Error checking IP block status:", error);
    return { isBlocked: false };
  }
}

export async function validateSignupLimits(
  ipAddress: string,
  landingPageId?: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Check if IP is blocked
    const blockCheck = await checkIPBlocked(ipAddress);
    if (blockCheck.isBlocked) {
      return { valid: false, reason: blockCheck.reason };
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check daily signup limit
    const dailySuccessfulSignups = await db.signupAttempt.count({
      where: {
        ipAddress,
        success: true,
        attemptedAt: { gte: oneDayAgo }
      }
    });

    if (dailySuccessfulSignups >= IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_DAY) {
      return {
        valid: false,
        reason: `Daily signup limit exceeded (${IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_DAY} per day)`
      };
    }

    // Check hourly signup limit
    const hourlySuccessfulSignups = await db.signupAttempt.count({
      where: {
        ipAddress,
        success: true,
        attemptedAt: { gte: oneHourAgo }
      }
    });

    if (hourlySuccessfulSignups >= IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_HOUR) {
      return {
        valid: false,
        reason: `Hourly signup limit exceeded (${IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_HOUR} per hour)`
      };
    }

    // Check failed attempts in the last hour
    const hourlyFailedAttempts = await db.signupAttempt.count({
      where: {
        ipAddress,
        success: false,
        attemptedAt: { gte: oneHourAgo }
      }
    });

    if (hourlyFailedAttempts >= IP_LIMITS.MAX_FAILED_ATTEMPTS_PER_HOUR) {
      return {
        valid: false,
        reason: "Too many failed signup attempts. Please try again later."
      };
    }

    // Check campaign-specific limit
    if (landingPageId) {
      const campaignSignups = await db.betaLandingSignup.count({
        where: {
          landingPageId,
          ipAddress,
          status: 'completed'
        }
      });

      if (campaignSignups >= IP_LIMITS.MAX_SIGNUPS_PER_IP_PER_CAMPAIGN) {
        return {
          valid: false,
          reason: "You can only sign up once per campaign"
        };
      }
    }

    // Check lifetime signups
    const lifetimeSignups = await db.signupAttempt.count({
      where: {
        ipAddress,
        success: true
      }
    });

    if (lifetimeSignups >= IP_LIMITS.MAX_SIGNUPS_PER_IP_LIFETIME) {
      return {
        valid: false,
        reason: "Maximum number of accounts reached for this IP address"
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("Error validating signup limits:", error);
    return { valid: false, reason: "Unable to validate signup limits" };
  }
}

export async function detectSuspiciousActivity(
  ipAddress: string,
  userAgent: string
): Promise<string[]> {
  const flags: string[] = [];

  try {
    // Check user agent patterns
    if (IP_LIMITS.SUSPICIOUS_USER_AGENT_PATTERNS.some(pattern => pattern.test(userAgent))) {
      flags.push('suspicious_user_agent');
    }

    // Check for rapid-fire attempts (more than 5 attempts in 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentAttempts = await db.signupAttempt.count({
      where: {
        ipAddress,
        attemptedAt: { gte: tenMinutesAgo }
      }
    });

    if (recentAttempts > 5) {
      flags.push('rapid_attempts');
    }

    // Check for distributed attack patterns (same user agent from many IPs)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const similarUserAgents = await db.signupAttempt.findMany({
      where: {
        userAgent,
        attemptedAt: { gte: oneHourAgo }
      },
      select: {
        ipAddress: true
      },
      distinct: ['ipAddress']
    });

    if (similarUserAgents.length > 10) {
      flags.push('possible_distributed_attack');
    }

    // Check for high failure rate
    const totalAttempts = await db.signupAttempt.count({
      where: { ipAddress }
    });
    const successfulAttempts = await db.signupAttempt.count({
      where: { ipAddress, success: true }
    });

    if (totalAttempts >= 5) {
      const successRate = successfulAttempts / totalAttempts;
      if (successRate < 0.2) { // Less than 20% success rate
        flags.push('low_success_rate');
      }
    }

    return flags;
  } catch (error) {
    console.error("Error detecting suspicious activity:", error);
    return [];
  }
}

export async function autoBlockIPIfNeeded(ipAddress: string): Promise<boolean> {
  try {
    const tracking = await db.ipSignupTracking.findUnique({
      where: { ipAddress }
    });

    if (!tracking || tracking.isBlocked) {
      return false;
    }

    // Check if should auto-block based on failed attempts
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentFailedAttempts = await db.signupAttempt.count({
      where: {
        ipAddress,
        success: false,
        attemptedAt: { gte: oneHourAgo }
      }
    });

    if (recentFailedAttempts >= IP_LIMITS.AUTO_BLOCK_AFTER_FAILED_ATTEMPTS) {
      const unblockAt = new Date(Date.now() + IP_LIMITS.AUTO_BLOCK_DURATION_HOURS * 60 * 60 * 1000);

      await db.ipSignupTracking.update({
        where: { ipAddress },
        data: {
          isBlocked: true,
          blockedAt: new Date(),
          blockedReason: `Automatically blocked due to ${recentFailedAttempts} failed attempts`,
          autoBlocked: true,
          unblockAt
        }
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking auto-block conditions:", error);
    return false;
  }
}

/**
 * Signup gate for login/signup routes: blocked IPs and per-IP signup limits
 * get a 429; suspicious attempts are logged and may auto-block the IP.
 * Returns false when it has already sent the response.
 */
export async function signupLimitCheck(
  req: NextApiRequest,
  res: NextApiResponse,
  options: {
    skipLimits?: boolean;
    landingPageId?: string;
  } = {}
): Promise<boolean> {
  if (options.skipLimits) {
    return true;
  }

  const ipAddress = getClientIp(req) ?? 'unknown';
  const userAgent = req.headers['user-agent'] || '';

  // Check rate limits
  const validation = await validateSignupLimits(ipAddress, options.landingPageId);
  if (!validation.valid) {
    res.status(429).json({
      error: "Rate limit exceeded",
      message: validation.reason
    });
    return false;
  }

  // Check for suspicious activity
  const suspiciousFlags = await detectSuspiciousActivity(ipAddress, userAgent);
  if (suspiciousFlags.length > 0) {
    // Log suspicious activity but don't block immediately
    await db.signupAttempt.create({
      data: {
        ipAddress,
        userAgent,
        attemptedAt: new Date(),
        success: false,
        failureReason: `Suspicious activity detected: ${suspiciousFlags.join(', ')}`,
        suspicious: true,
        landingPageId: options.landingPageId
      }
    });

    // Auto-block if needed
    const wasBlocked = await autoBlockIPIfNeeded(ipAddress);
    if (wasBlocked) {
      res.status(429).json({
        error: "Account creation temporarily disabled",
        message: "Suspicious activity detected. Please try again later."
      });
      return false;
    }
  }

  return true;
}
