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

  const { postId } = req.body;
  if (!postId) {
    return res.status(400).json({ error: "Post ID is required" });
  }

  try {
    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            primaryHandle: true,
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    await db.post.delete({
      where: { id: postId },
    });

    res.json({ 
      success: true,
      deletedPost: {
        id: post.id,
        author: post.author.profile?.displayName || post.author.primaryHandle || "Unknown",
      },
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
}