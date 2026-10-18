import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { checkCurrentPassword } from "@/lib/auth/current-password";

export default apiHandler(
  // no CSRF today: settings page calls it with plain fetch
  { methods: ["POST"], auth: "user", csrf: false },
  async (req, res, { user }) => {
    const { encryptedSeedPhrase, currentPassword } = req.body;

    if (!encryptedSeedPhrase) {
      return res.status(400).json({ error: "Encrypted seed phrase is required" });
    }

    // Password sign-in decrypts this blob, so overwriting it is a password change
    if (!(await checkCurrentPassword(req, res, user, currentPassword))) return;

    try {
      // Update user's encrypted seed phrase
      await db.user.update({
        where: { id: user.id },
        data: {
          encryptedSeedPhrase
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update encrypted seed phrase:", error);
      res.status(500).json({ error: "Failed to update encrypted seed phrase" });
    }
  }
);