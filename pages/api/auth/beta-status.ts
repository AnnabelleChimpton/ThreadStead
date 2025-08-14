import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const betaEnabled = process.env.BETA_KEYS_ENABLED === "true";
  
  res.json({ enabled: betaEnabled });
}