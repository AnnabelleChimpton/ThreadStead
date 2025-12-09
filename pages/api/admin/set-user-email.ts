import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { requireAdmin } from "@/lib/auth/server";
import { encryptEmail } from "@/lib/utils/security/email-encryption";
import { createEmailVerificationToken, sendVerificationEmail } from "@/lib/email-login";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const adminUser = await requireAdmin(req);
        if (!adminUser) {
            return res.status(403).json({ error: "Admin access required" });
        }

        const { userId, email, verified, sendVerification } = req.body;

        if (!userId || !email) {
            return res.status(400).json({ error: "User ID and Email are required" });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Check if user exists
        const userForUpdate = await db.user.findUnique({
            where: { id: userId },
            include: {
                profile: { select: { displayName: true } },
                handles: { select: { handle: true } }
            }
        });

        if (!userForUpdate) {
            return res.status(404).json({ error: "User not found" });
        }

        const encryptedEmail = encryptEmail(email);

        // Update user
        await db.user.update({
            where: { id: userId },
            data: {
                encryptedEmail,
                emailVerifiedAt: verified ? new Date() : null
            }
        });

        // Handle verification email if requested and not auto-verified
        let verificationToken = null;
        if (sendVerification && !verified) {
            verificationToken = await createEmailVerificationToken(userId, email);
            const displayName = userForUpdate.profile?.displayName || userForUpdate.handles[0]?.handle || "User";

            await sendVerificationEmail(email, displayName, verificationToken);
        }

        res.json({
            success: true,
            message: `Email updated successfully.${verificationToken ? " Verification email sent." : ""}`
        });

    } catch (error) {
        console.error("Failed to set user email:", error);
        res.status(500).json({ error: "Failed to set user email" });
    }
}
