import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { encryptEmail, decryptEmail } from "@/lib/email-encryption";
import { createEmailVerificationToken, sendVerificationEmail } from "@/lib/email-login";
import { getSessionUser } from "@/lib/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (req.method === "GET") {
      // Get user's current email (decrypted)
      let email = null;
      if (user.encryptedEmail) {
        try {
          email = decryptEmail(user.encryptedEmail);
        } catch (error) {
          console.error(`Failed to decrypt email for user ${user.id}:`, error);
        }
      }
      
      return res.json({
        email,
        emailVerifiedAt: user.emailVerifiedAt
      });
    }
    
    if (req.method === "POST") {
      // Set or update user's email
      const { email } = req.body as { email?: string };
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      
      // Get user's display name or handle for verification email
      const userWithProfile = await db.user.findUnique({
        where: { id: user.id },
        include: {
          profile: { select: { displayName: true } },
          handles: { 
            take: 1,
            select: { handle: true }
          }
        }
      });

      const userName = userWithProfile?.profile?.displayName || 
                      userWithProfile?.handles[0]?.handle || 
                      'User';
      
      // Encrypt and store the email immediately (but mark as unverified)
      const encryptedEmail = encryptEmail(email);
      
      // Update user with new email but clear verification status
      await db.user.update({
        where: { id: user.id },
        data: {
          encryptedEmail,
          emailVerifiedAt: null // Reset verification status
        }
      });
      
      // Create verification token
      const verificationToken = await createEmailVerificationToken(user.id, email);
      
      // Send verification email
      await sendVerificationEmail(email, userName, verificationToken);
      
      return res.json({ 
        success: true,
        message: "Verification email sent! Please check your email and click the verification link to enable email login.",
        requiresVerification: true
      });
    }
    
    if (req.method === "DELETE") {
      // Remove user's email
      await db.user.update({
        where: { id: user.id },
        data: { 
          encryptedEmail: null,
          emailVerifiedAt: null
        }
      });
      
      return res.json({ 
        success: true,
        message: "Email removed successfully" 
      });
    }
    
    return res.status(405).json({ error: "Method not allowed" });
    
  } catch (error) {
    console.error("Email management error:", error);
    res.status(500).json({ 
      error: "Failed to manage email. Please try again later." 
    });
  }
}