import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { effectiveStatus } from "@/lib/domain/users/moderation";

export default apiHandler(
  { methods: ["GET"], auth: "admin" },
  async (req, res) => {
    if (req.method === "GET") {
      try {
        const users = await db.user.findMany({
          include: {
            handles: true,
            profile: {
              select: {
                displayName: true,
              },
            },
            _count: {
              select: {
                posts: true,
                comments: {
                  where: {
                    status: "visible"
                  }
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        const formattedUsers = users.map(user => ({
          id: user.id,
          did: user.did,
          role: user.role,
          createdAt: user.createdAt,
          displayName: user.profile?.displayName || null,
          primaryHandle: user.primaryHandle,
          handles: user.handles.map(h => `${h.handle}@${h.host}`),
          postCount: user._count.posts,
          commentCount: user._count.comments,

          emailVerifiedAt: user.emailVerifiedAt,

          hasEmail: !!user.encryptedEmail,

          // A suspension past its end date reads as active
          moderationStatus: effectiveStatus(user),
          suspendedUntil: user.suspendedUntil,
          moderationReason: user.moderationReason,
          moderatedAt: user.moderatedAt,
        }));

        res.json({ users: formattedUsers });
      } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
      }
    }
  }
);
