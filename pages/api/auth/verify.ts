// pages/api/auth/verify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { rateLimitMiddleware } from "@/lib/middleware/rateLimiting";
import crypto from "crypto";

import * as ed from "@noble/ed25519";
import { fromBase64Url } from "@/lib/utils/encoding/base64url";
import { generateCsrfToken, createCsrfCookie, getCookieSecureFlag } from "@/lib/middleware/csrf";



function readCookie(req: NextApiRequest, name: string) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(new RegExp(`${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // Apply rate limiting for new account creation attempts
  const rateLimitPassed = await rateLimitMiddleware(req, res);
  if (!rateLimitPassed) {
    return; // Response already sent by middleware
  }

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

  // If this is a legacy user migration
  if (legacyDid && !user) {
    // Look up the legacy user
    const legacyUser = await db.user.findUnique({ where: { did: legacyDid } });
    if (!legacyUser) {
      return res.status(400).json({ error: "Legacy user not found" });
    }

    // Update the user's DID
    user = await db.user.update({
      where: { id: legacyUser.id },
      data: { did }
    });
  }
  // If creating a new user, check beta key requirements
  else if (!user) {
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
        
        return newUser;
      });
      
      // Generate 5 beta invite codes for the new user (outside transaction)
      try {
        await generateUserBetaInviteCodes(user.id);
      } catch (codeError) {
        // Log error but don't fail user creation
        console.error('Failed to generate beta invite codes for new user:', codeError);
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
      const errorMessage = (error as Error).message;
      return res.status(400).json({ error: errorMessage });
    }
  }

  const secret = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await db.session.create({ data: { userId: user.id, secret, expiresAt } });

  // Generate CSRF token
  const csrfToken = generateCsrfToken();

  // Set both session and CSRF cookies
  res.setHeader(
    "Set-Cookie",
    [
      `retro_session=${user.id}.${secret}; HttpOnly; ${getCookieSecureFlag()}Path=/; Max-Age=604800; SameSite=Strict`,
      createCsrfCookie(csrfToken, 604800)
    ]
  );
  res.json({ ok: true, userId: user.id });
}
