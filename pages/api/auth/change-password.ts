import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

function readCookie(req: NextApiRequest, name: string) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(new RegExp(`${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { currentPassword, newPassword, encryptedSeedPhrase } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required" });
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
          passwordHash: true,
          authMethod: true
        }
      }
    }
  });

  if (!session) {
    return res.status(401).json({ error: "Session expired or invalid" });
  }

  const user = session.user;
  
  if (user.authMethod !== 'PASSWORD' || !user.passwordHash) {
    return res.status(400).json({ error: "User is not using password authentication" });
  }

  try {
    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update user
    await db.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        encryptedSeedPhrase // Updated encrypted seed phrase with new password
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Failed to change password:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
}