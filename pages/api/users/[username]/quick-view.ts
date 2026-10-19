// pages/api/users/[username]/quick-view.ts
import type { NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { SITE_NAME } from "@/lib/config/site/constants";
import type { UserQuickViewResponse, RelationshipStatus } from "@/types/user-quick-view";
import { hasPixelHome, residentAccess } from "@/lib/domain/users/profile-access";
import { allowedVisibilities } from "@/lib/domain/posts/visibility";

export default apiHandler(
  { methods: ["GET"], auth: "optional" },
  async (req, rawRes, { user: viewer }) => {
    const res = rawRes as NextApiResponse<UserQuickViewResponse>;
    try {
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

      // Extract username from primary handle
      const extractedUsername = targetUser.primaryHandle?.split("@")[0] || username;
      const displayName = profile?.displayName || extractedUsername;

      // Determine relationship status
      let relationship: RelationshipStatus = "none";
      let viewerFollowsTarget = false;
      let targetFollowsViewer = false;
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
          viewerFollowsTarget = vf;
          targetFollowsViewer = tf;

          if (vf && tf) {
            relationship = "friends";
          } else if (vf) {
            relationship = "following";
          } else if (tf) {
            relationship = "followed_by";
          }
        }
      }

      const identity = {
        userId: targetUser.id,
        username: extractedUsername,
        displayName,
        primaryHandle: targetUser.primaryHandle || `${extractedUsername}@${SITE_NAME}`,
        avatarUrl: profile?.avatarUrl || null,
        relationship,
      };

      // A profile the viewer can't see shows who it is (as its private page
      // does, so they can still follow), but not its bio, counts or home.
      const access = await residentAccess(viewer, targetUser.id, profile?.visibility ?? null);
      if (!access.visible) {
        return res.status(200).json({
          success: true,
          data: {
            ...identity,
            bio: null,
            stats: null,
            badges: [],
            hasPixelHome: false,
            visibility: access.visibility,
          },
        });
      }

      // Fetch stats in parallel
      const [followerCount, followingCount, postCount, mutualFriendsCount, pixelHome] = await Promise.all([
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

        // Post count: only posts this viewer may see
        db.post.count({
          where: {
            authorId: targetUser.id,
            visibility: {
              in: allowedVisibilities({
                isAuthor: relationship === "owner",
                isFollower: viewerFollowsTarget,
                isFriend: viewerFollowsTarget && targetFollowsViewer,
              }),
            },
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

        // Past the access check, so the viewer may see the house too
        hasPixelHome(targetUser.id),
      ]);

      // Format response
      return res.status(200).json({
        success: true,
        data: {
          ...identity,
          bio: profile?.bio || null,
          stats: {
            followers: followerCount,
            following: followingCount,
            posts: postCount,
            mutualFriends: mutualFriendsCount,
          },
          badges: [], // Badges are fetched separately via ImprovedBadgeDisplay component
          hasPixelHome: pixelHome,
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
);
