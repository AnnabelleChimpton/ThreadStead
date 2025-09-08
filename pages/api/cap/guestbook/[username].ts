import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

import { getSessionUser } from "@/lib/auth/server";
import { mintCapability } from "@/lib/domain/users/capabilities";
import { SITE_NAME } from "@/lib/config/site/constants";



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const viewer = await getSessionUser(req);
  if (!viewer) return res.status(401).json({ error: "not logged in" });

  const username = String(req.query.username || "");
  const ownerHandle = await db.handle.findFirst({
    where: { handle: username, host: SITE_NAME },
    include: { user: true },
  });
  if (!ownerHandle) return res.status(404).json({ error: "profile not found" });

  // resource string for this profile's guestbook
  const resource = `user:${ownerHandle.user.id}/guestbook`;

  const token = await mintCapability(viewer.id, ["write:guestbook"], resource, 10 * 60); // 10 min
  res.json({ token, resource, expSec: 600 });
}
