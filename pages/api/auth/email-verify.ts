import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { checkEmailLoginToken, verifyEmailLoginToken } from "@/lib/email-login";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, selectedUserId } = req.body as { 
      token?: string; 
      selectedUserId?: string; 
    };
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: "Token is required" });
    }
    
    let users;
    let selectedUser;
    
    if (!selectedUserId) {
      // Initial request - check token without marking as used
      users = await checkEmailLoginToken(token);
      
      if (users.length === 0) {
        return res.status(400).json({ 
          error: "No accounts found for this email address" 
        });
      }
      
      if (users.length === 1) {
        // Single user - auto-select and mark token as used
        selectedUser = users[0];
        await verifyEmailLoginToken(token); // Mark as used
      } else {
        // Multiple users - require selection (don't mark as used yet)
        return res.status(200).json({
          requiresSelection: true,
          users: users.map(user => ({
            id: user.id,
            displayName: user.displayName,
            handle: user.handle,
            host: user.host,
            avatarThumbnailUrl: user.avatarThumbnailUrl,
            emailVerifiedAt: user.emailVerifiedAt
          }))
        });
      }
    } else {
      // User selection made - verify token and mark as used
      users = await verifyEmailLoginToken(token);
      
      if (users.length === 0) {
        return res.status(400).json({ 
          error: "No accounts found for this email address" 
        });
      }
      
      selectedUser = users.find(user => user.id === selectedUserId);
      if (!selectedUser) {
        return res.status(400).json({ 
          error: "Invalid user selection" 
        });
      }
    }
    
    // Mark email as verified if not already
    if (!selectedUser.emailVerifiedAt) {
      await db.user.update({
        where: { id: selectedUser.id },
        data: { emailVerifiedAt: new Date() }
      });
    }
    
    // Create session (similar to verify.ts)
    const secret = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days
    
    await db.session.create({ 
      data: { 
        userId: selectedUser.id, 
        secret, 
        expiresAt 
      } 
    });

    res.setHeader(
      "Set-Cookie",
      `retro_session=${selectedUser.id}.${secret}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`
    );
    
    res.json({ 
      success: true, 
      userId: selectedUser.id,
      user: {
        displayName: selectedUser.displayName,
        handle: selectedUser.handle,
        host: selectedUser.host
      }
    });
    
  } catch (error) {
    console.error("Email verification error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid token') || 
          error.message.includes('already been used') || 
          error.message.includes('expired')) {
        return res.status(400).json({ error: error.message });
      }
    }
    
    res.status(500).json({ 
      error: "Failed to verify email login. Please try again." 
    });
  }
}