import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { checkCurrentPassword } from "@/lib/auth/current-password";
import { z } from "zod";
import { encryptedSeedPhraseSchema, givenPasswordSchema } from "@/lib/auth/password-requests";

const updateSeedSchema = z.object({ encryptedSeedPhrase: encryptedSeedPhraseSchema, currentPassword: givenPasswordSchema.optional() });

export default apiHandler(
  { methods: ["POST"], auth: "user", schema: updateSeedSchema },
  async (req, res, { user, body }) => {
    const { encryptedSeedPhrase, currentPassword } = body;

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