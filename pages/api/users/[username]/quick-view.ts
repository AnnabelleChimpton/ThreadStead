// pages/api/users/[username]/quick-view.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import { SITE_NAME } from "@/lib/config/site/constants";
import type { UserQuickViewResponse, RelationshipStatus } from "@/types/user-quick-view";

export default async function handler(req: NextApiRequest, res: NextApiResponse<UserQuickViewResponse>) {
  try {
    const viewer = await getSessionUser(req);
    const username = String(req.query.username || "");

    // Find the target user by handle
    const handle = await db.handle.findFirst({
      where: { handle: username, host: SITE_NAME },
      include: {
        user: {
          include: {
            profile: true,
            handles: {
              where: { host: SITE_NAME },
              take: 1,
            },
          },
        },
      },
    });

    if (!handle || !handle.user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const targetUser = handle.user;
    const profile = targetUser.profile;

    // Determine relationship status
    let relationship: RelationshipStatus = "none";
    if (viewer) {
      const isOwner = viewer.id === targetUser.id;
      if (isOwner) {
        relationship = "owner";
      } else {
        const [viewerFollows, targetFollows] = await Promise.all([
          db.follow.findUnique({
            where: {
              followerId_followeeId: {
                followerId: viewer.id,
                followeeId: targetUser.id,
              },
            },
          }),
          db.follow.findUnique({
            where: {
              followerId_followeeId: {
                followerId: targetUser.id,
                followeeId: viewer.id,
              },
            },
          }),
        ]);

        const vf = viewerFollows?.status === "accepted";
        const tf = targetFollows?.status === "accepted";

        if (vf && tf) {
          relationship = "friends";
        } else if (vf) {
          relationship = "following";
        } else if (tf) {
          relationship = "followed_by";
        }
      }
    }

    // Fetch stats in parallel
    const [followerCount, followingCount, postCount, mutualFriendsCount] = await Promise.all([
      // Follower count
      db.follow.count({
        where: {
          followeeId: targetUser.id,
          status: "accepted",
        },
      }),

      // Following count
      db.follow.count({
        where: {
          followerId: targetUser.id,
          status: "accepted",
        },
      }),

      // Post count
      db.post.count({
        where: {
          authorId: targetUser.id,
        },
      }),

      // Mutual friends count (only if viewer is logged in and not owner)
      (async () => {
        if (!viewer || relationship === "owner") return 0;

        // Get viewer's friends
        const viewerFollows = await db.follow.findMany({
          where: { followerId: viewer.id, status: "accepted" },
          select: { followeeId: true },
        });
        const viewerFollowees = new Set(viewerFollows.map(f => f.followeeId));
        const viewerReciprocals = await db.follow.findMany({
          where: {
            followerId: { in: Array.from(viewerFollowees) },
            followeeId: viewer.id,
            status: "accepted",
          },
          select: { followerId: true },
        });
        const viewerFriends = new Set(viewerReciprocals.map(r => r.followerId));

        // Get target's friends
        const targetFollows = await db.follow.findMany({
          where: { followerId: targetUser.id, status: "accepted" },
          select: { followeeId: true },
        });
        const targetFollowees = new Set(targetFollows.map(f => f.followeeId));
        const targetReciprocals = await db.follow.findMany({
          where: {
            followerId: { in: Array.from(targetFollowees) },
            followeeId: targetUser.id,
            status: "accepted",
          },
          select: { followerId: true },
        });
        const targetFriends = new Set(targetReciprocals.map(r => r.followerId));

        // Count intersection
        return Array.from(viewerFriends).filter(id => targetFriends.has(id)).length;
      })(),
    ]);

    // Check if user has a custom pixel home
    const homeConfig = await db.userHomeConfig.findUnique({
      where: { userId: targetUser.id },
      select: {
        houseTemplate: true,
        preferPixelHome: true,
      },
    });

    const hasCustomPixelHome = !!(homeConfig?.houseTemplate || homeConfig?.preferPixelHome);

    // Extract username from primary handle
    const extractedUsername = targetUser.primaryHandle?.split("@")[0] || username;
    const displayName = profile?.displayName || extractedUsername;

    // Format response
    return res.status(200).json({
      success: true,
      data: {
        userId: targetUser.id,
        username: extractedUsername,
        displayName,
        primaryHandle: targetUser.primaryHandle || `${extractedUsername}@${SITE_NAME}`,
        avatarUrl: profile?.avatarUrl || null,
        bio: profile?.bio || null,
        relationship,
        stats: {
          followers: followerCount,
          following: followingCount,
          posts: postCount,
          mutualFriends: mutualFriendsCount,
        },
        badges: [], // Badges are fetched separately via ImprovedBadgeDisplay component
        hasCustomPixelHome,
      },
    });
  } catch (error) {
    console.error("Error in quick-view API:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
