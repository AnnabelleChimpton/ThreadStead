import { apiHandler } from "@/lib/api/handler";
import { verifyEmailVerificationToken } from "@/lib/email-login";

export default apiHandler(
  // no CSRF today: opened from an emailed link, possibly signed out; plain fetch
  { methods: ["POST"], auth: "none", csrf: false },
  async (req, res) => {
    try {
      const { token } = req.body as { token?: string };
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: "Verification token is required" });
      }
      
      // Verify the token and mark email as verified
      const result = await verifyEmailVerificationToken(token);
      
      res.json({ 
        success: true, 
        message: `Email ${result.email} has been verified successfully!`,
        email: result.email
      });
      
    } catch (error) {
      console.error("Email verification error:", error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid') || 
            error.message.includes('already been used') || 
            error.message.includes('expired')) {
          return res.status(400).json({ error: error.message });
        }
      }
      
      res.status(500).json({ 
        error: "Failed to verify email. Please try again." 
      });
    }
  }
);
