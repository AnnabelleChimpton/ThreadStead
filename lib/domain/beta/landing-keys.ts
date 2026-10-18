/**
 * Beta keys handed out by campaign landing pages (pages/beta/[slug].tsx).
 *
 * A visitor on an open campaign clicks "Claim Beta Key", gets one BetaKey
 * and goes to /signup with it. The track route used to mint a fresh key on
 * every call, so a loop could print unlimited valid keys. Now:
 *
 *  - only an open campaign (active, not paused or ended, completed signups
 *    under its limit) hands out keys;
 *  - the signup abuse limits apply (blocked IPs, signups per hour/day,
 *    failed attempts per hour, one signup per IP per campaign);
 *  - one IP gets one key per campaign: asking again returns the same unused
 *    key, and once that key has made an account the IP gets no more;
 *  - calls to the route are capped per IP in memory, so retries can't pound
 *    the database.
 *
 * Keys stay ordinary BetaKeys, so existing ones keep working at signup.
 */
import crypto from "crypto";
import { db } from "@/lib/config/database/connection";
import { createMemoryRateLimiter, validateSignupLimits } from "@/lib/server/http/rate-limit";

export const TRACK_WINDOWS = [
  { name: "minute" as const, max: 5, windowMs: 60 * 1000 },
  { name: "hour" as const, max: 20, windowMs: 60 * 60 * 1000 },
];

const trackLimiter = createMemoryRateLimiter(TRACK_WINDOWS);

/** Counts one track call for this IP; false when it's over the limit. */
export function allowTrackCall(ipAddress: string): boolean {
  return trackLimiter.check(ipAddress).allowed;
}

type CampaignState = {
  isActive: boolean;
  isPaused: boolean;
  endedAt: Date | null;
  signupLimit: number;
};

/** Why a campaign isn't taking signups, or null when it is. */
export function campaignClosedReason(page: CampaignState, completedSignups: number): string | null {
  if (page.endedAt) return "This campaign has ended and is no longer accepting signups.";
  if (!page.isActive) return "This campaign is currently inactive.";
  if (page.isPaused) return "This campaign is temporarily paused. Please check back later.";
  if (completedSignups >= page.signupLimit) return "This campaign has reached its maximum number of signups.";
  return null;
}

function generateBetaKey(): string {
  // Readable: BETA-XXXX-XXXX-XXXX
  const parts = Array.from({ length: 3 }, () => crypto.randomBytes(2).toString("hex").toUpperCase());
  return `BETA-${parts.join("-")}`;
}

export type ClaimResult =
  | { ok: true; signupId: string; betaKey: string; reused: boolean }
  | { ok: false; status: 400 | 404 | 429 | 500; error: string };

/**
 * The visitor's key for this campaign: their unused one if they already
 * have it, else a new one. Runs under a per-(campaign, IP) advisory lock so
 * parallel clicks can't each mint a key.
 */
export async function claimCampaignKey(
  slug: string,
  ipAddress: string,
  userAgent: string
): Promise<ClaimResult> {
  const page = await db.betaLandingPage.findUnique({
    where: { slug },
    select: { id: true, isActive: true, isPaused: true, endedAt: true, signupLimit: true },
  });
  if (!page) return { ok: false, status: 404, error: "Landing page not found" };

  const completed = await db.betaLandingSignup.count({
    where: { landingPageId: page.id, status: "completed" },
  });
  const closed = campaignClosedReason(page, completed);
  if (closed) return { ok: false, status: 400, error: closed };

  const limits = await validateSignupLimits(ipAddress, page.id);
  if (!limits.valid) return { ok: false, status: 429, error: limits.reason ?? "Too many signups from here" };

  return db.$transaction(async (tx): Promise<ClaimResult> => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`beta-landing:${page.id}:${ipAddress}`}))`;

    const earlier = await tx.betaLandingSignup.findMany({
      where: { landingPageId: page.id, ipAddress, betaCode: { not: null } },
      orderBy: { signupStartedAt: "desc" },
      select: { id: true, betaCode: true },
    });
    if (earlier.length) {
      const keys = await tx.betaKey.findMany({
        where: { key: { in: earlier.map((s) => s.betaCode!) } },
        select: { key: true, usedBy: true },
      });
      // Covers signups whose /complete call never arrived
      if (keys.some((k) => k.usedBy)) {
        return { ok: false, status: 429, error: "You can only sign up once per campaign" };
      }
      const unused = new Set(keys.map((k) => k.key));
      const reusable = earlier.find((s) => unused.has(s.betaCode!));
      if (reusable) return { ok: true, signupId: reusable.id, betaKey: reusable.betaCode!, reused: true };
    }

    let betaKey: string | null = null;
    for (let attempt = 0; attempt < 10 && !betaKey; attempt++) {
      const candidate = generateBetaKey();
      if (!(await tx.betaKey.findUnique({ where: { key: candidate } }))) betaKey = candidate;
    }
    if (!betaKey) return { ok: false, status: 500, error: "Failed to generate unique beta key" };

    await tx.betaKey.create({ data: { key: betaKey } });
    const signup = await tx.betaLandingSignup.create({
      data: { landingPageId: page.id, ipAddress, userAgent, status: "started", betaCode: betaKey },
    });
    await tx.signupAttempt.create({
      data: { ipAddress, userAgent, landingPageId: page.id, betaCode: betaKey, success: false },
    });
    const now = new Date();
    await tx.ipSignupTracking.upsert({
      where: { ipAddress },
      update: { signupAttempts: { increment: 1 }, lastAttemptAt: now },
      create: { ipAddress, signupAttempts: 1, successfulSignups: 0, firstAttemptAt: now, lastAttemptAt: now },
    });

    return { ok: true, signupId: signup.id, betaKey, reused: false };
  });
}
