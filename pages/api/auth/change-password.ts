import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { hashPassword } from "@/lib/auth/password";
import { checkCurrentPassword } from "@/lib/auth/current-password";
import { endOtherSessions } from "@/lib/auth/server";

export default apiHandler(
  // no CSRF today: did-client changePassword() calls it with plain fetch
  { methods: ["POST"], auth: "user", csrf: false },
  async (req, res, { user }) => {
    const { currentPassword, newPassword, encryptedSeedPhrase } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    // passwordHash, not authMethod: accounts that added a password through
    // add-password keep authMethod SEED_PHRASE
    if (!user.passwordHash) {
      return res.status(400).json({ error: "User is not using password authentication" });
    }

    if (!(await checkCurrentPassword(req, res, user, currentPassword))) return;

    try {
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

      // Sign out everywhere else; this browser stays signed in
      await endOtherSessions(req, user.id);

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to change password:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  }
);