import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

function readCookie(req: NextApiRequest, name: string) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(new RegExp(`${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { encryptedSeedPhrase } = req.body;

  if (!encryptedSeedPhrase) {
    return res.status(400).json({ error: "Encrypted seed phrase is required" });
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

  // Verify session
  const session = await db.session.findFirst({
    where: { userId, secret, expiresAt: { gt: new Date() } },
  });

  if (!session) {
    return res.status(401).json({ error: "Session expired or invalid" });
  }

  try {
    // Update user's encrypted seed phrase
    await db.user.update({
      where: { id: userId },
      data: {
        encryptedSeedPhrase
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to update encrypted seed phrase:", error);
    res.status(500).json({ error: "Failed to update encrypted seed phrase" });
  }
}