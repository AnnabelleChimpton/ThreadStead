// pages/api/account/check-handle.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { SITE_NAME } from "@/lib/site-config";

const db = new PrismaClient();
const HOST = SITE_NAME;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const { handle } = req.query;
  
  if (typeof handle !== "string" || !/^[a-z0-9\-_.]{3,20}$/.test(handle)) {
    return res.status(400).json({ error: "invalid handle format", available: false });
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