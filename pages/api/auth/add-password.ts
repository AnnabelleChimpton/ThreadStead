import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { hashPassword } from "@/lib/auth/password";
import { endOtherSessions, getSessionUser } from "@/lib/auth/server";
import { sameOriginProtection } from "@/lib/server/http/same-origin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // cookie-authed and not on apiHandler: refuse cross-origin posts here
  if (!sameOriginProtection(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password, seedPhrase } = req.body;

  if (!password || !seedPhrase) {
    return res.status(400).json({ error: "Password and seed phrase are required" });
  }

  // Get current user session
  const user = await getSessionUser(req, {
    select: {
      id: true,
      authMethod: true,
      encryptedSeedPhrase: true,
      did: true,
      originalDid: true
    }
  });

  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Overwriting an existing password is a reset (signs out everywhere else)
  const isResetMode = user.authMethod === 'PASSWORD' || !!user.encryptedSeedPhrase;

  // CRITICAL SECURITY CHECK, on every call:
  // the seed phrase must derive this account's DID. It's encrypted under the
  // new password and becomes what password sign-in decrypts, so any other
  // seed would sign the owner into a different identity, or none.
  // This also lets "Recover from Seed" overwrite a forgotten password.
  try {
    // Dynamic import to avoid build issues if these deps have issues in specific envs
    const bip39 = await import("bip39");
    const ed = await import("@noble/ed25519");
    const { toBase64Url } = await import("@/lib/utils/encoding/base64url");

    if (typeof seedPhrase !== "string" || !bip39.validateMnemonic(seedPhrase)) {
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
      return res.status(403).json({
        error: isResetMode
          ? "Seed phrase does not match this account. Password reset denied."
          : "Seed phrase does not match this account.",
      });
    }
  } catch (err) {
    console.error("Verification failed:", err);
    return res.status(500).json({ error: "Failed to verify identity" });
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
      where: { id: user.id },
      data: {
        passwordHash,
        encryptedSeedPhrase,
        // Keep authMethod as SEED_PHRASE - they can choose which to use
      }
    });

    // Overwriting a password is a reset: sign out everywhere else
    if (isResetMode) await endOtherSessions(req, user.id);

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to add password:", error);
    res.status(500).json({ error: "Failed to add password authentication" });
  }
}