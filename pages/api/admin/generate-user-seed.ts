import { generateSeedPhrase, createKeypairFromSeedPhrase } from "@/lib/api/did/did-client";
import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";





export default apiHandler(
  { methods: ["POST"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    const { userId } = req.body;
  
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      // Verify the user exists
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate a new seed phrase
      const newSeedPhrase = await generateSeedPhrase();

      // Create the new keypair from the seed phrase
      const newKeypair = await createKeypairFromSeedPhrase(newSeedPhrase);

      // Update the user's DID in the database so they can recover with this seed phrase
      const updatedUser = await db.user.update({
        where: { id: userId },
        data: { did: newKeypair.did },
        include: {
          profile: {
            select: {
              displayName: true,
            },
          },
        },
      });

      // Invalidate any existing sessions for this user since they now have a new identity
      await db.session.deleteMany({
        where: { userId: userId },
      });

      // Return the seed phrase to the admin
      return res.status(200).json({ 
        seedPhrase: newSeedPhrase,
        user: {
          id: updatedUser.id,
          displayName: updatedUser.profile?.displayName || null,
          primaryHandle: updatedUser.primaryHandle
        }
      });
    } catch (error) {
      console.error("Failed to generate seed phrase for user:", error);
      return res.status(500).json({ error: "Failed to generate seed phrase" });
    }
  }
);
