import { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

// Rate limiting configuration
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

export function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'unknown';
  return ip.trim();
}

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

// Middleware function to check rate limits
export async function rateLimitMiddleware(
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

  const ipAddress = getClientIP(req);
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