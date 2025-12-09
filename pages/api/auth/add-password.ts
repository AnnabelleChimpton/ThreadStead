import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { hashPassword } from "@/lib/auth/password";
import { getSeedPhrase } from "@/lib/api/did/did-client";

function readCookie(req: NextApiRequest, name: string) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(new RegExp(`${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password, seedPhrase } = req.body;

  if (!password || !seedPhrase) {
    return res.status(400).json({ error: "Password and seed phrase are required" });
  }

  // Get current user session
  const sessionCookie = readCookie(req, "retro_session");
  if (!sessionCookie) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const [userId, secret] = sessionCookie.split(".");
  if (!userId || !secret) {
    return res.status(401).json({ error: "Invalid session" });
  }

  // Verify session and get user
  const session = await db.session.findFirst({
    where: { userId, secret, expiresAt: { gt: new Date() } },
    include: {
      user: {
        select: {
          id: true,
          authMethod: true,
          encryptedSeedPhrase: true,
          did: true,
          originalDid: true
        }
      }
    }
  });

  if (!session) {
    return res.status(401).json({ error: "Session expired or invalid" });
  }

  const user = session.user;

  // Check if we are in "Overwrite/Reset" mode
  const isResetMode = user.authMethod === 'PASSWORD' || !!user.encryptedSeedPhrase;

  if (isResetMode) {
    // CRITICAL SECURITY CHECK:
    // If resetting password, we MUST verify the provided seed phrase matches the user's identity.
    // This allows "Recover from Seed" to overwrite a forgotten password.
    try {
      // Dynamic import to avoid build issues if these deps have issues in specific envs
      const bip39 = await import("bip39");
      const ed = await import("@noble/ed25519");
      const { toBase64Url } = await import("@/lib/utils/encoding/base64url");

      if (!bip39.validateMnemonic(seedPhrase)) {
        return res.status(400).json({ error: "Invalid seed phrase" });
      }

      // 1. Derive Keypair (Logic mirrored from did-client.ts)
      const seed = await bip39.mnemonicToSeed(seedPhrase);
      const secret = seed.slice(0, 32);
      const publicKey = await ed.getPublicKeyAsync(secret);
      const pkb64u = toBase64Url(publicKey);
      const derivedDid = `did:key:ed25519:${pkb64u}`;

      // 2. Compare against stored identity
      // Match against current DID OR the original DID (if migrated to RingHub)
      const matchesId = derivedDid === user.did || derivedDid === user.originalDid;

      if (!matchesId) {
        return res.status(403).json({ error: "Seed phrase does not match this account. Password reset denied." });
      }

      // Verification Passed: Allow execution to proceed (overwriting password)

    } catch (err) {
      console.error("Verification failed:", err);
      return res.status(500).json({ error: "Failed to verify identity for reset" });
    }
  }

  try {
    // Import encryption functions
    const { encryptSeedPhraseWithPassword } = await import('@/lib/auth/password');

    // Encrypt the seed phrase with the new password
    const encryptedSeedPhrase = encryptSeedPhraseWithPassword(seedPhrase, password);

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Update user to have both auth methods available
    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        encryptedSeedPhrase,
        // Keep authMethod as SEED_PHRASE - they can choose which to use
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to add password:", error);
    res.status(500).json({ error: "Failed to add password authentication" });
  }
}