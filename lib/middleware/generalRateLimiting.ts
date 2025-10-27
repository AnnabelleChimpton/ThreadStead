import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

/**
 * Database-backed Rate Limiting Middleware
 *
 * Uses PostgreSQL to track rate limits across distributed servers.
 * Supports user-based and IP-based rate limiting with configurable windows.
 */

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

const RATE_LIMIT_CONFIGS: Record<RateLimitCategory, RateLimitConfig> = {
  posts: { limit: 10 * DEV_MULTIPLIER, windowMs: 60 * 1000 }, // 10 per minute (100 in dev)
  comments: { limit: 20 * DEV_MULTIPLIER, windowMs: 60 * 1000 }, // 20 per minute (200 in dev)
  uploads: { limit: 5 * DEV_MULTIPLIER, windowMs: 60 * 60 * 1000 }, // 5 per hour (50 in dev)
  profile_updates: { limit: 10 * DEV_MULTIPLIER, windowMs: 60 * 60 * 1000 }, // 10 per hour (100 in dev) - LEGACY
  template_editing: { limit: 100 * DEV_MULTIPLIER, windowMs: 60 * 60 * 1000 }, // 100 per hour (1000 in dev)
  profile_metadata: { limit: 30 * DEV_MULTIPLIER, windowMs: 60 * 60 * 1000 }, // 30 per hour (300 in dev)
  profile_toggles: { limit: 50 * DEV_MULTIPLIER, windowMs: 60 * 60 * 1000 }, // 50 per hour (500 in dev)
  threadring_operations: { limit: 20 * DEV_MULTIPLIER, windowMs: 60 * 60 * 1000 }, // 20 per hour (200 in dev)
  guestbook: { limit: 5 * DEV_MULTIPLIER, windowMs: 60 * 60 * 1000 }, // 5 per hour (50 in dev)
  admin: { limit: 100 * DEV_MULTIPLIER, windowMs: 60 * 1000 }, // 100 per minute (1000 in dev)
  default: { limit: 60 * DEV_MULTIPLIER, windowMs: 60 * 1000 }, // 60 per minute (600 in dev)
};

/**
 * Extract identifier from request (user ID or IP address)
 */
function getIdentifier(req: NextApiRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address for unauthenticated requests
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0])
    : req.socket.remoteAddress || "unknown";

  return `ip:${ip}`;
}

/**
 * Check and increment rate limit
 * Returns { allowed: boolean, remaining: number, resetTime: Date }
 */
export async function checkRateLimit(
  identifier: string,
  category: RateLimitCategory
): Promise<{ allowed: boolean; remaining: number; resetTime: Date; total: number }> {
  const config = RATE_LIMIT_CONFIGS[category];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  try {
    // Use a transaction to atomically check and increment
    const result = await db.$transaction(async (tx) => {
      // Find or create rate limit entry
      const existing = await tx.rateLimit.findUnique({
        where: {
          identifier_category: {
            identifier,
            category,
          },
        },
      });

      // If entry exists and window is still valid
      if (existing && existing.windowStart > windowStart) {
        // Check if limit exceeded
        if (existing.requestCount >= config.limit) {
          return {
            allowed: false,
            remaining: 0,
            resetTime: new Date(existing.windowStart.getTime() + config.windowMs),
            total: config.limit,
          };
        }

        // Increment count
        const updated = await tx.rateLimit.update({
          where: {
            identifier_category: {
              identifier,
              category,
            },
          },
          data: {
            requestCount: {
              increment: 1,
            },
          },
        });

        return {
          allowed: true,
          remaining: config.limit - updated.requestCount,
          resetTime: new Date(updated.windowStart.getTime() + config.windowMs),
          total: config.limit,
        };
      }

      // Entry doesn't exist or window expired - create new window
      const newEntry = await tx.rateLimit.upsert({
        where: {
          identifier_category: {
            identifier,
            category,
          },
        },
        create: {
          identifier,
          category,
          requestCount: 1,
          windowStart: now,
          expiresAt: new Date(now.getTime() + config.windowMs + 24 * 60 * 60 * 1000), // +24h for cleanup
        },
        update: {
          requestCount: 1,
          windowStart: now,
          expiresAt: new Date(now.getTime() + config.windowMs + 24 * 60 * 60 * 1000),
        },
      });

      return {
        allowed: true,
        remaining: config.limit - 1,
        resetTime: new Date(newEntry.windowStart.getTime() + config.windowMs),
        total: config.limit,
      };
    });

    return result;
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
