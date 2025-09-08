import type { NextApiRequest, NextApiResponse } from "next";
import { findUsersByEmail } from "@/lib/utils/security/email-encryption";
import { createEmailLoginToken, sendLoginEmail, cleanupExpiredTokens } from "@/lib/email-login";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, username } = req.body as { email?: string; username?: string };
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: "Username is required" });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    
    // Clean up expired tokens occasionally
    if (Math.random() < 0.1) { // 10% chance
      await cleanupExpiredTokens().catch(console.error);
    }
    
    // Find users with this email (decrypt-based lookup) AND username combination
    const usersWithEmail = await findUsersByEmail(email);
    
    // Filter for users with the specific username and verified email
    const users = usersWithEmail.filter(user => {
      const hasUsername = user.handles.some((handle: any) => handle.handle === username);
      const hasVerifiedEmail = !!user.emailVerifiedAt;
      return hasUsername && hasVerifiedEmail;
    });
    
    const mappedUsers = users.map(user => ({
      id: user.id,
      did: user.did,
      displayName: user.profile?.displayName,
      handle: user.handles[0]?.handle,
      host: user.handles[0]?.host,
      avatarThumbnailUrl: user.profile?.avatarThumbnailUrl,
      emailVerifiedAt: user.emailVerifiedAt
    }));
    
    // Create login token even if no users found (for security)
    const token = await createEmailLoginToken(email);
    
    // Send email (always send, don't reveal if specific user exists)
    await sendLoginEmail(email, mappedUsers, token);
    
    // Always return success to prevent user enumeration attacks
    res.json({ 
      success: true, 
      message: `If the user @${username} has a verified email at this address, we've sent them a login link.`
    });
    
  } catch (error) {
    console.error("Email login error:", error);
    res.status(500).json({ 
      error: "Failed to send login email. Please try again later." 
    });
  }
}