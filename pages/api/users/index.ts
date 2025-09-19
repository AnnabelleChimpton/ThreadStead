import type { NextApiRequest, NextApiResponse } from 'next'
import { loadUserDIDMappings } from '@/lib/api/did/server-did-client'
import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from "@/lib/config/site/constants";

/**
 * Users API Endpoint
 *
 * Supports two modes:
 * - GET /users?format=did -> DID mappings directory (legacy)
 * - GET /users?sort=active -> Active users for discover page
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const format = req.query.format as string;
    const sort = req.query.sort as string;

    // Legacy DID directory mode
    if (format === 'did') {
      return handleDIDDirectory(req, res);
    }

    // New user listing mode (for discover page)
    return handleUserListing(req, res);

  } catch (error) {
    console.error('Error in users API:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process request'
    })
  }
}

async function handleDIDDirectory(req: NextApiRequest, res: NextApiResponse) {
  // Load all user DID mappings
  const mappings = await loadUserDIDMappings()

  // Return public info only (no private keys or user IDs)
  const publicMappings = mappings.map(mapping => ({
    hash: mapping.userHash,
    did: mapping.did,
    created: mapping.created,
    didDocument: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/users/${mapping.userHash}/did.json`
  }))

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'public, max-age=300') // Cache for 5 minutes

  return res.status(200).json({
    message: 'ThreadStead User DID Directory',
    totalUsers: publicMappings.length,
    users: publicMappings
  })
}

async function handleUserListing(req: NextApiRequest, res: NextApiResponse) {
  const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);
  const offset = parseInt(String(req.query.offset || "0"));
  const sort = String(req.query.sort || "recent"); // recent, active, alphabetical

  // Build order clause based on sort parameter
  let orderBy: any = { createdAt: "desc" }; // default: recent

  if (sort === "active") {
    // Sort by recent post activity + follower count for "active" users
    orderBy = [
      { posts: { _count: "desc" } },
      { followers: { _count: "desc" } },
      { createdAt: "desc" }
    ];
  } else if (sort === "alphabetical") {
    // We'll sort alphabetically in JavaScript after fetching
    orderBy = { createdAt: "desc" };
  }

  const users = await db.user.findMany({
    where: {
      handles: {
        some: {
          host: SITE_NAME
        }
      }
    },
    include: {
      handles: {
        where: { host: SITE_NAME },
        take: 1,
        orderBy: { handle: "asc" }
      },
      profile: {
        select: {
          displayName: true,
          bio: true,
          avatarUrl: true
        }
      },
      _count: {
        select: {
          posts: {
            where: {
              visibility: "public",
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Posts in last 30 days for activity
              }
            }
          },
          followers: true,
          following: true
        }
      }
    },
    orderBy,
    take: limit,
    skip: offset
  });

  // Transform and filter users who have local handles
  const transformedUsers = users
    .filter(user => user.handles.length > 0)
    .map(user => {
      const handle = user.handles[0]?.handle;
      return {
        id: user.id,
        primaryHandle: handle ? `${handle}@${SITE_NAME}` : null,
        username: handle,
        displayName: user.profile?.displayName || null,
        bio: user.profile?.bio || null,
        avatarUrl: user.profile?.avatarUrl || null,
        createdAt: user.createdAt,
        postCount: user._count.posts,
        followerCount: user._count.followers,
        followingCount: user._count.following,
        // Activity score for sorting
        activityScore: user._count.posts * 2 + user._count.followers
      };
    });

  // Sort alphabetically if requested
  if (sort === "alphabetical") {
    transformedUsers.sort((a, b) => {
      const nameA = (a.displayName || a.username || "").toLowerCase();
      const nameB = (b.displayName || b.username || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  } else if (sort === "active") {
    // Re-sort by activity score (posts + followers)
    transformedUsers.sort((a, b) => b.activityScore - a.activityScore);
  }

  return res.json({
    users: transformedUsers,
    total: transformedUsers.length
  });
}