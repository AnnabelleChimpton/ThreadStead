// pages/api/auth/verify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { rateLimitCheck, signupLimitCheck } from "@/lib/server/http/rate-limit";

import * as ed from "@noble/ed25519";
import { fromBase64Url } from "@/lib/utils/encoding/base64url";
import { isBetaKeysEnabled } from "@/lib/config/beta-keys";
import { createSession, readCookie } from "@/lib/auth/server";
import { getClientIp } from "@/lib/server/http/client-ip";
import { recordSignup, SignupLimitError } from "@/lib/domain/users/signup-limits";
import { isRestricted, restrictionMessage } from "@/lib/domain/users/moderation";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // Every sign-in and signup lands here; cap attempts per IP
  if (!(await rateLimitCheck(req, res, "auth"))) return;

  const { did, publicKey, signature, betaKey, authMethod } = (req.body || {}) as {
    did?: string; publicKey?: string; signature?: string; betaKey?: string; authMethod?: string;
  };
  if (!did || !publicKey || !signature) return res.status(400).json({ error: "bad body" });

  const raw = readCookie(req, "retro_nonce");
  if (!raw) return res.status(400).json({ error: "no nonce" });
  const [nonce, expStr] = raw.split(".");
  if (!nonce || !expStr || Date.now() > Number(expStr)) {
    return res.status(400).json({ error: "nonce expired" });
  }

  // ✅ use our base64url decoder
  const ok = await ed.verifyAsync(
    fromBase64Url(signature),
    new TextEncoder().encode(nonce),
    fromBase64Url(publicKey)
  );
  if (!ok) return res.status(401).json({ error: "bad signature" });

  // Get the optional legacyDid for migrating legacy users
  const { legacyDid } = req.body as { legacyDid?: string };

  // Check if user exists under the new DID
  let user = await db.user.findUnique({ where: { did } });

  // If not found by main DID, check if they are using their original backup DID (Seed Phrase)
  // This allows users to "Recover from Seed" even if their main identity has been upgraded to a RingHub DID
  if (!user) {
    user = await db.user.findUnique({ where: { originalDid: did } });
  }

  // If this is a legacy user migration
  if (legacyDid && !user) {
    // Look up the legacy user
    const legacyUser = await db.user.findUnique({ where: { did: legacyDid } });
    if (!legacyUser) {
      return res.status(400).json({ error: "Legacy user not found" });
    }

    // Update the user's DID, preserving the old one as originalDid for recovery
    user = await db.user.update({
      where: { id: legacyUser.id },
      data: {
        did,
        originalDid: legacyUser.did // Save the seed-based DID link!
      }
    });
  }
  // If creating a new user, check beta key requirements
  else if (!user) {
    // Per-IP signup caps; sign-ins above don't count against them
    if (!(await signupLimitCheck(req, res))) return;

    // Import beta invite code utilities
    const { checkBetaAccess, generateUserBetaInviteCodes } = await import("@/lib/utils/invites/beta-codes");

    // Check beta access (handles both admin keys and user invite codes)
    const betaCheck = await checkBetaAccess(betaKey);
    if (!betaCheck.valid) {
      return res.status(400).json({ error: betaCheck.error });
    }

    // Use transaction to prevent race conditions
    try {
      user = await db.$transaction(async (tx) => {
        // Create user first
        const newUser = await tx.user.create({
          data: {
            did,
            authMethod: authMethod === 'password' ? 'PASSWORD' : 'SEED_PHRASE'
          }
        });

        // If beta key was required, consume it within the transaction
        if (betaKey && betaCheck.valid) {
          if (betaCheck.type === 'admin') {
            // Traditional admin beta key
            await tx.betaKey.update({
              where: { key: betaKey },
              data: {
                usedBy: newUser.id,
                usedAt: new Date()
              }
            });
          } else if (betaCheck.type === 'invite') {
            // User-generated beta invite code
            await tx.betaInviteCode.update({
              where: { code: betaKey },
              data: {
                usedBy: newUser.id,
                usedAt: new Date()
              }
            });
          }
        }

        // Counts against this IP's signup caps; over one, the User rolls back
        await recordSignup(tx, {
          ipAddress: getClientIp(req) ?? "unknown",
          userAgent: req.headers["user-agent"] ?? null,
          userId: newUser.id,
          betaKey,
        });

        return newUser;
      });

      // Generate 5 beta invite codes for the new user (outside transaction)
      // Only generate codes if beta system is enabled
      if (isBetaKeysEnabled()) {
        try {
          await generateUserBetaInviteCodes(user.id);
        } catch (codeError) {
          // Log error but don't fail user creation
          console.error('Failed to generate beta invite codes for new user:', codeError);
        }
      }

      // Create default pixel home configuration for new user
      try {
        // Add some variety to default homes
        const templates = ['cottage_v1', 'townhouse_v1', 'loft_v1', 'cabin_v1'];
        const palettes = ['thread_sage', 'charcoal_nights', 'pixel_petals', 'crt_glow', 'classic_linen'];

        // Use user ID to deterministically pick a template and palette
        const userIdHash = user.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const randomTemplate = templates[userIdHash % templates.length];
        const randomPalette = palettes[(userIdHash * 2) % palettes.length];

        await db.userHomeConfig.create({
          data: {
            userId: user.id,
            houseTemplate: randomTemplate,
            palette: randomPalette,
            bookSkin: 'linen_v1',
            seasonalOptIn: false,
            preferPixelHome: false
          }
        });
      } catch (homeError) {
        // Log error but don't fail user creation
        console.error('Failed to create default home config for new user:', homeError);
      }

    } catch (error: unknown) {
      if (error instanceof SignupLimitError) return res.status(429).json({ error: error.message });
      const errorMessage = (error as Error).message;
      return res.status(400).json({ error: errorMessage });
    }
  }

  // A suspended or banned account gets the reason it can't sign in, no session
  if (isRestricted(user)) {
    return res.status(403).json({ error: restrictionMessage(user), code: "account_restricted" });
  }

  // Session + CSRF cookies
  await createSession(res, user.id);
  res.json({ ok: true, userId: user.id });
}
