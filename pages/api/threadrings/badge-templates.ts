import type { NextApiRequest, NextApiResponse } from "next";
import { BADGE_TEMPLATES } from "@/lib/domain/threadrings/badges";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  return res.json({
    success: true,
    templates: BADGE_TEMPLATES
  });
}