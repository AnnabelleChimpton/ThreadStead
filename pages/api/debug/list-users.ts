import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { decryptEmail } from "@/lib/email-encryption";
import { getSessionUser } from "@/lib/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if user is logged in (for security)
    const currentUser = await getSessionUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: "Must be logged in to debug" });
    }

    // Get all users with handles
    const users = await db.user.findMany({
      select: {
        id: true,
        did: true,
        encryptedEmail: true,
        emailVerifiedAt: true,
        handles: {
          select: {
            handle: true,
            host: true
          }
        },
        profile: {
          select: {
            displayName: true
          }
        }
      },
      take: 20 // Limit to 20 users for safety
    });

    // Process users for debug output
    const debugUsers = users.map(user => {
      let decryptedEmail = null;
      let decryptError = null;
      
      if (user.encryptedEmail) {
        try {
          decryptedEmail = decryptEmail(user.encryptedEmail);
        } catch {
          decryptError = 'Cannot decrypt (key mismatch or corruption)';
        }
      }

      return {
        id: user.id,
        did: user.did.substring(0, 30) + '...',
        displayName: user.profile?.displayName || 'No display name',
        handles: user.handles,
        hasEmail: !!user.encryptedEmail,
        emailStatus: user.encryptedEmail ? (decryptedEmail ? `✓ ${decryptedEmail}` : `✗ ${decryptError}`) : 'No email',
        emailVerified: !!user.emailVerifiedAt,
        verifiedAt: user.emailVerifiedAt
      };
    });

    // Filter to show users with handles
    const usersWithHandles = debugUsers.filter(u => u.handles.length > 0);
    const usersWithEmails = debugUsers.filter(u => u.hasEmail);

    res.json({
      totalUsers: users.length,
      usersWithHandles: usersWithHandles.length,
      usersWithEmails: usersWithEmails.length,
      users: debugUsers,
      currentUserId: currentUser.id,
      environmentCheck: {
        hasEncryptionKey: !!process.env.EMAIL_ENCRYPTION_KEY,
        keyLength: process.env.EMAIL_ENCRYPTION_KEY?.length || 0,
        expectedKeyLength: 64
      }
    });

  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ 
      error: "Debug failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}