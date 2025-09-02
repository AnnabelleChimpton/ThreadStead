import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username } = req.query;

  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    console.log(`Looking for user with username: ${username}`);
    console.log(`SITE_HANDLE_DOMAIN: ${process.env.SITE_HANDLE_DOMAIN || "localhost:3000"}`);
    
    // Find user by username (handle) - check both primaryHandle and handles table
    let user = await db.user.findFirst({
      where: {
        OR: [
          // Check handles table
          {
            handles: {
              some: {
                handle: username.toLowerCase(),
                host: process.env.SITE_HANDLE_DOMAIN || "localhost:3000"
              }
            }
          },
          // Check primaryHandle (format: username@domain)
          {
            primaryHandle: `${username.toLowerCase()}@${process.env.SITE_HANDLE_DOMAIN || "localhost:3000"}`
          }
        ],
        encryptedSeedPhrase: { not: null }
      },
      select: {
        encryptedSeedPhrase: true,
        authMethod: true
      }
    });

    // If not found, try with any host (for development flexibility)
    if (!user) {
      user = await db.user.findFirst({
        where: {
          handles: {
            some: {
              handle: username.toLowerCase()
            }
          },
          encryptedSeedPhrase: { not: null }
        },
        select: {
          encryptedSeedPhrase: true,
          authMethod: true
        }
      });
    }

    if (!user) {
      console.log(`User not found for username: ${username}`);
      return res.status(404).json({ error: "User not found or password authentication not enabled" });
    }

    console.log(`Found user with authMethod: ${user.authMethod}, has encryptedSeedPhrase: ${!!user.encryptedSeedPhrase}`);
    res.json({ encryptedSeedPhrase: user.encryptedSeedPhrase });
  } catch (error) {
    console.error("Failed to get encrypted seed:", error);
    res.status(500).json({ error: "Failed to retrieve user data" });
  }
}