import { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/auth-server";
import { generateSeedPhrase, createKeypairFromSeedPhrase } from "@/lib/did-client";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.body;
  console.log("Generate seed request for userId:", userId);
  
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
    console.log("Generated seed phrase:", newSeedPhrase.split(' ').slice(0, 3).join(' ') + "...");

    // Create the new keypair from the seed phrase
    const newKeypair = await createKeypairFromSeedPhrase(newSeedPhrase);
    console.log("Created new DID:", newKeypair.did);

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
    
    console.log("Updated user DID in database:", newKeypair.did);

    // Invalidate any existing sessions for this user since they now have a new identity
    await db.session.deleteMany({
      where: { userId: userId },
    });
    
    console.log("Invalidated existing sessions for user");

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