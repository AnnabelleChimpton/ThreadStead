import type { NextApiRequest, NextApiResponse } from "next";
import { findUsersByEmail } from "@/lib/utils/security/email-encryption";
import { createPasswordResetToken, sendPasswordResetEmail } from "@/lib/email-login";
import { rateLimitMiddleware } from "@/lib/middleware/rateLimiting";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // Rate limiting (important for email endpoints)
    const rateLimitPassed = await rateLimitMiddleware(req, res);
    if (!rateLimitPassed) {
        return; // Response already sent
    }

    const { email } = req.body;

    if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        // 1. Find verified users with this email
        const users = await findUsersByEmail(email);
        const verifiedUsers = users.filter(u => !!u.emailVerifiedAt);

        if (verifiedUsers.length === 0) {
            // Security: Do not reveal if email exists. Fake delay?
            // Just return success.
            return res.status(200).json({ message: "If that email is registered, a reset link has been sent." });
        }

        // 2. For each user (usually just one), send a reset email
        // If multiple users share an email (rare/allowed?), send for the first one or all?
        // Magic Link allows specific user selection. Password Reset is usually per-account.
        // If multiple accounts share an email, this is tricky.
        // Standard practice: Send specific emails for each, or ask user to contact support.
        // Given the architecture, I'll send for the FIRST found user for now to simplify, 
        // or iterate. The magic link flow sends a "Choose Account" email.
        // Password reset is destructive. 
        // I'll pick the most recently active or just the first.
        // Or, better: "Reset Password" email should probably link to a page where you choose?
        // No, security.
        // I will iterate and send an email for EACH account found? No, that spams.
        // I'll pick the first one implementation wise.

        const user = verifiedUsers[0];
        const displayName = user.profile?.displayName || user.handles[0]?.handle || "User";

        const token = await createPasswordResetToken(user.id, email);
        await sendPasswordResetEmail(email, displayName, token);

        return res.status(200).json({ message: "If that email is registered, a reset link has been sent." });

    } catch (error) {
        console.error("Password reset request error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
