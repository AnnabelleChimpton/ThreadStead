import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req);
  if (!user) return res.status(200).json({ loggedIn: false });
  res.json({
    loggedIn: true,
    user: { 
      id: user.id, 
      did: user.did, 
      role: user.role,
      primaryHandle: user.primaryHandle ?? null 
    },
  });
}
