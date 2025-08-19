import type { NextApiRequest, NextApiResponse } from "next";
import { verifyEmailVerificationToken } from "@/lib/email-login";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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