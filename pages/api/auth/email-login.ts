import { apiHandler } from "@/lib/api/handler";
import { looksLikeEmail } from "@/lib/utils/validation/email";
import { findUsersByEmail } from "@/lib/utils/security/email-encryption";
import { createEmailLoginToken, sendLoginEmail, cleanupExpiredTokens } from "@/lib/email-login";
import { emailSendLimitCheck } from "@/lib/server/http/rate-limit";
import { sameSitePath } from "@/lib/utils/security/same-site-path";
import { getSiteBaseUrl } from "@/lib/config/site-url";

export default apiHandler(
  // CSRF off: signed-out visitors (login page) have no CSRF cookie; the same-origin check still applies
  { methods: ["POST"], auth: "none", csrf: false },
  async (req, res) => {
    try {
      const { email, username, next } = req.body as { email?: string; username?: string; next?: string };
    
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email is required" });
      }

      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: "Username is required" });
      }
    
      // Length first, then a pattern that can't backtrack (lib/utils/validation/email.ts)
      if (!looksLikeEmail(email)) {
        return res.status(400).json({ error: "That doesn't look like an email address." });
      }

      // Every call emails `email`, so cap it per IP and per address. This
      // runs before any account lookup, so a 429 can't reveal accounts.
      if (!(await emailSendLimitCheck(req, res, email))) return;
    
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
      // Where the link brings them back to, only ever a path on this site
      const landing = typeof next === 'string' ? sameSitePath(next, new URL(getSiteBaseUrl()).origin) : null;
      await sendLoginEmail(email, mappedUsers, token, landing);
    
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
);