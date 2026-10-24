import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { createEmailVerificationToken, sendVerificationEmail } from "@/lib/email-login";
import { PROFILE_WITHOUT_PAGE } from "@/lib/domain/profile/profile-fields";
// Import dynamically in handler to match other files, or top level if safe.
// email-encryption seems to be server-only.

export default apiHandler(
    { methods: ["POST"], auth: "admin" },
    async (req, res) => {
        try {
            const { userId } = req.body;

            if (!userId || typeof userId !== 'string') {
                return res.status(400).json({ error: "User ID is required" });
            }

            const user = await db.user.findUnique({
                where: { id: userId },
                include: {
                    profile: PROFILE_WITHOUT_PAGE
                }
            });

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }


            if (user.emailVerifiedAt) {
                return res.status(400).json({ error: "User email is already verified" });
            }


            if (!user.encryptedEmail) {
                return res.status(400).json({ error: "User does not have an email address set" });
            }

            // Decrypt email
            const { decryptEmail } = await import('@/lib/utils/security/email-encryption');

            const email = decryptEmail(user.encryptedEmail);

            if (!email) {
                return res.status(500).json({ error: "Failed to decrypt user email" });
            }

            // Create verification token
            const token = await createEmailVerificationToken(user.id, email);

            // Send email
            const displayName = user.profile?.displayName || user.primaryHandle || "ThreadStead Member";
            await sendVerificationEmail(email, displayName, token);

            res.json({ success: true, message: "Verification email sent successfully" });

        } catch (error) {
            console.error("Error sending verification email:", error);
            res.status(500).json({ error: "Failed to send verification email" });
        }
    }
);
