import type { NextApiRequest, NextApiResponse } from "next";
import { isBetaKeysEnabled } from "../../../lib/config/beta-keys";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const betaEnabled = isBetaKeysEnabled();

  res.json({ enabled: betaEnabled });
}