// pages/api/auth/verify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

import * as ed from "@noble/ed25519";
import { fromBase64Url } from "@/lib/base64";



function readCookie(req: NextApiRequest, name: string) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(new RegExp(`${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { did, publicKey, signature, betaKey } = (req.body || {}) as {
    did?: string; publicKey?: string; signature?: string; betaKey?: string;
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
    const betaEnabled = process.env.BETA_KEYS_ENABLED === "true";
    
    if (betaEnabled) {
      if (!betaKey) {
        return res.status(400).json({ error: "Beta key required for account creation" });
      }
      
      // Use transaction to prevent race conditions with beta key usage
      try {
        user = await db.$transaction(async (tx) => {
          // Validate and consume the beta key atomically
          const validBetaKey = await tx.betaKey.findUnique({ 
            where: { key: betaKey } 
          });
          
          if (!validBetaKey) {
            throw new Error("Invalid beta key");
          }
          
          if (validBetaKey.usedBy) {
            throw new Error("Beta key has already been used");
          }
          
          // Create user first
          const newUser = await tx.user.create({ data: { did } });
          
          // Mark beta key as used
          await tx.betaKey.update({
            where: { key: betaKey },
            data: { 
              usedBy: newUser.id,
              usedAt: new Date()
            }
          });
          
          return newUser;
        });
      } catch (error: unknown) {
        const errorMessage = (error as Error).message;
        if (errorMessage === "Invalid beta key" || errorMessage === "Beta key has already been used") {
          return res.status(400).json({ error: errorMessage });
        }
        // Re-throw unexpected errors
        throw error;
      }
    } else {
      // No beta key required, create user normally
      user = await db.user.create({ data: { did } });
    }
  }

  const secret = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await db.session.create({ data: { userId: user.id, secret, expiresAt } });

  res.setHeader(
    "Set-Cookie",
    `retro_session=${user.id}.${secret}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`
  );
  res.json({ ok: true, userId: user.id });
}
