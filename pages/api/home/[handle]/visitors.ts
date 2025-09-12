import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { handle } = req.query;
  
  if (typeof handle !== 'string') {
    return res.status(400).json({ error: "Invalid handle" });
  }

  try {
    // Remove @ prefix if present
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

    // Find user by handle
    const userHandle = await db.handle.findFirst({
      where: { handle: cleanHandle.toLowerCase() },
      include: { user: true }
    });

    if (!userHandle) {
      return res.status(404).json({ error: "User not found" });
    }

    const homeOwnerId = userHandle.user.id;

    if (req.method === "POST") {
      // Record a visitor
      const visitor = await getSessionUser(req);
      
      if (!visitor) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Don't track the home owner visiting their own home
      if (visitor.id === homeOwnerId) {
        return res.json({ success: true, message: "Home owner visit not tracked" });
      }

      // Check if there's already a recent visit (within last hour) to avoid spam
      const recentVisit = await db.pixelHomeVisitor.findFirst({
        where: {
          homeOwnerId,
          visitorId: visitor.id,
          visitedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
          }
        }
      });

      if (recentVisit) {
        // Update the existing visit timestamp
        await db.pixelHomeVisitor.update({
          where: { id: recentVisit.id },
          data: { visitedAt: new Date() }
        });
      } else {
        // Create new visit record
        await db.pixelHomeVisitor.create({
          data: {
            homeOwnerId,
            visitorId: visitor.id,
            visitedAt: new Date()
          }
        });
      }

      // Clean up old visits (older than 7 days) to keep the table manageable
      await db.pixelHomeVisitor.deleteMany({
        where: {
          homeOwnerId,
          visitedAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
          }
        }
      });

      return res.json({ 
        success: true, 
        message: "Visit recorded successfully" 
      });
    }

    if (req.method === "GET") {
      // Get recent visitors (last 5, within 24 hours)
      const recentVisitors = await db.pixelHomeVisitor.findMany({
        where: {
          homeOwnerId,
          visitedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
          }
        },
        include: {
          visitor: {
            include: {
              handles: true,
              profile: { select: { displayName: true, avatarUrl: true } }
            }
          }
        },
        orderBy: { visitedAt: 'desc' },
        take: 5
      });

      const visitors = recentVisitors.map(visit => ({
        id: visit.visitor.id,
        username: (visit.visitor.handles.find(h => h.host === 'threadstead.com') || visit.visitor.handles[0])?.handle || 'anonymous',
        displayName: visit.visitor.profile?.displayName || null,
        avatarUrl: visit.visitor.profile?.avatarUrl || null,
        visitedAt: visit.visitedAt.toISOString()
      }));

      return res.json({
        success: true,
        visitors,
        count: visitors.length
      });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (error) {
    console.error("Visitor tracking error:", error);
    res.status(500).json({ 
      error: "Failed to process visitor data. Please try again later." 
    });
  }
}