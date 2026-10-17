import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
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

export default apiHandler(
  { methods: ["POST"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
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
);
