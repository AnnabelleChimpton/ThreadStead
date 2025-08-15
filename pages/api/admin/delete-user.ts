import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-server";

const db = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  if (userId === adminUser.id) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }

  try {
    const userToDelete = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!userToDelete) {
      return res.status(404).json({ error: "User not found" });
    }

    if (userToDelete.role === "admin") {
      return res.status(400).json({ error: "Cannot delete another admin account" });
    }

    await db.user.delete({
      where: { id: userId },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
}