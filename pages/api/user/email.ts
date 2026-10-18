import { db } from "@/lib/config/database/connection";
import { encryptEmail, decryptEmail } from "@/lib/utils/security/email-encryption";
import { createEmailVerificationToken, sendVerificationEmail } from "@/lib/email-login";
import { apiHandler } from "@/lib/api/handler";
import { emailSendLimitCheck } from "@/lib/server/http/rate-limit";

export default apiHandler(
  {
    methods: ["GET", "POST", "DELETE"],
    auth: "user",
    // no CSRF today: signup.tsx and settings/index.tsx call it with plain fetch
    csrf: false,
  },
  async (req, res, { user }) => {
    try {
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

        // Each POST emails a confirmation link to whatever address was typed
        if (!(await emailSendLimitCheck(req, res, email, user.id))) return;
        
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
      
    } catch (error) {
      console.error("Email management error:", error);
      res.status(500).json({ 
        error: "Failed to manage email. Please try again later." 
      });
    }
  }
);
