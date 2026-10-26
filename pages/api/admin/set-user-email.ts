import { db } from "@/lib/config/database/connection";
import { looksLikeEmail } from "@/lib/utils/validation/email";
import { apiHandler } from "@/lib/api/handler";
import { encryptEmail } from "@/lib/utils/security/email-encryption";
import { createEmailVerificationToken, sendVerificationEmail } from "@/lib/email-login";

export default apiHandler(
    { methods: ["POST"], auth: "admin" },
    async (req, res) => {
        try {
            const { userId, email, verified, sendVerification } = req.body;

            if (!userId || !email) {
                return res.status(400).json({ error: "User ID and Email are required" });
            }

            // Length first, then a pattern that can't backtrack (lib/utils/validation/email.ts)
            if (!looksLikeEmail(email)) {
                return res.status(400).json({ error: "That doesn't look like an email address." });
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
);
