// pages/api/account/check-handle.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { validateUsername } from "@/lib/domain/validation";
import { SITE_NAME } from "@/lib/site-config";


const HOST = SITE_NAME;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const { handle } = req.query;
  
  if (typeof handle !== "string") {
    return res.status(400).json({ error: "handle must be a string", available: false });
  }

  const validation = validateUsername(handle);
  if (!validation.ok) {
    return res.status(400).json({ 
      error: validation.message, 
      code: validation.code,
      available: false 
    });
  }

  try {
    const existing = await db.handle.findFirst({ where: { handle, host: HOST } });
    const available = !existing;
    
    return res.status(200).json({ 
      available, 
      handle,
      message: available ? "Username is available" : "Username is already taken"
    });
  } catch (error) {
    console.error("Error checking handle availability:", error);
    return res.status(500).json({ error: "Internal server error", available: false });
  }
}