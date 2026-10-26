import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { hashPassword } from "@/lib/auth/password";
import { checkCurrentPassword } from "@/lib/auth/current-password";
import { endOtherSessions } from "@/lib/auth/server";
import { z } from "zod";
import { encryptedSeedPhraseSchema, givenPasswordSchema, newPasswordSchema } from "@/lib/auth/password-requests";

const changePasswordSchema = z.object({
  currentPassword: givenPasswordSchema.min(1),
  newPassword: newPasswordSchema,
  encryptedSeedPhrase: encryptedSeedPhraseSchema.optional(),
});

export default apiHandler(
  { methods: ["POST"], auth: "user", schema: changePasswordSchema },
  async (req, res, { user, body }) => {
    const { currentPassword, newPassword, encryptedSeedPhrase } = body;

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
          ...(encryptedSeedPhrase ? { encryptedSeedPhrase } : {}) // Updated encrypted seed phrase with new password
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