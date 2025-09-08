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
          authMethod: true,
          encryptedSeedPhrase: true
        }
      }
    }
  });

  if (!session) {
    return res.status(401).json({ error: "Session expired or invalid" });
  }

  const user = session.user;

  // Only allow adding password to seed phrase users who don't already have one
  if (user.authMethod !== 'SEED_PHRASE') {
    return res.status(400).json({ error: "This user already uses password authentication" });
  }

  if (user.encryptedSeedPhrase) {
    return res.status(400).json({ error: "This user already has password authentication enabled" });
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