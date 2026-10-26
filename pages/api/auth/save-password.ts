import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { hashPassword } from "@/lib/auth/password";
import { checkCurrentPassword, signedInRecently } from "@/lib/auth/current-password";
import { z } from "zod";
import { encryptedSeedPhraseSchema, givenPasswordSchema, newPasswordSchema } from "@/lib/auth/password-requests";

const savePasswordSchema = z.object({
  password: newPasswordSchema,
  // Signup sends what it just stored in the browser; null leaves the saved one alone
  encryptedSeedPhrase: encryptedSeedPhraseSchema.nullable().optional(),
  currentPassword: givenPasswordSchema.optional(),
});

export default apiHandler(
  { methods: ["POST"], auth: "user", schema: savePasswordSchema },
  async (req, res, { user, body }) => {
    const { password, encryptedSeedPhrase, currentPassword } = body;

    if (user.passwordHash || user.encryptedSeedPhrase) {
      // Replacing a password: prove you know the current one
      if (!(await checkCurrentPassword(req, res, user, currentPassword))) return;
    } else if (!(await signedInRecently(req))) {
      // A first password is part of signup, right after sign-in. Older
      // sessions add one from settings with the seed phrase instead.
      return res.status(403).json({ error: "Sign in again to set a password" });
    }

    try {
      // Hash the password
      const passwordHash = await hashPassword(password);

      // Update user with password auth data
      await db.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          // null wiped the saved one, which password sign-in decrypts
          ...(encryptedSeedPhrase ? { encryptedSeedPhrase } : {}),
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
