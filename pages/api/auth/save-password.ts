import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { hashPassword } from "@/lib/auth/password";

export default apiHandler(
  // no CSRF today: did-client signup flow calls it with plain fetch right after /api/auth/verify
  { methods: ["POST"], auth: "user", csrf: false },
  async (req, res, { user }) => {
    const { password, encryptedSeedPhrase } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    try {
      // Hash the password
      const passwordHash = await hashPassword(password);

      // Update user with password auth data
      await db.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          encryptedSeedPhrase,
          authMethod: 'PASSWORD'
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to save password:", error);
      res.status(500).json({ error: "Failed to save password" });
    }
  }
);