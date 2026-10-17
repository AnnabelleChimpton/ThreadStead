import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export default apiHandler(
  // no CSRF today: did-client changePassword() calls it with plain fetch
  { methods: ["POST"], auth: "user", csrf: false },
  async (req, res, { user }) => {
    const { currentPassword, newPassword, encryptedSeedPhrase } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (user.authMethod !== 'PASSWORD' || !user.passwordHash) {
      return res.status(400).json({ error: "User is not using password authentication" });
    }

    try {
      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update user
      // Only update the encrypted seed phrase when a non-empty value is provided;
      // writing empty/null would corrupt account recovery data
      await db.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          ...(typeof encryptedSeedPhrase === "string" && encryptedSeedPhrase.length > 0
            ? { encryptedSeedPhrase } // Updated encrypted seed phrase with new password
            : {})
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to change password:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  }
);