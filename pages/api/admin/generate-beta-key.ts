import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

import { requireAdmin } from "@/lib/auth-server";
import crypto from "crypto";



function generateBetaKey(): string {
  // Generate a readable beta key: BETA-XXXX-XXXX-XXXX
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const part = crypto.randomBytes(2).toString('hex').toUpperCase();
    parts.push(part);
  }
  return `BETA-${parts.join('-')}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const key = generateBetaKey();
    const betaKey = await db.betaKey.create({
      data: { key },
    });

    res.json({ key: betaKey.key });
  } catch (error) {
    console.error("Error generating beta key:", error);
    res.status(500).json({ error: "Failed to generate beta key" });
  }
}