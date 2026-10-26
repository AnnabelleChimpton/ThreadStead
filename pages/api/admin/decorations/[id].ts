import type { Prisma } from "@prisma/client";
import { db } from "@/lib/config/database/connection";
import { ZodError } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { updateDecorationSchema, windowProblem } from "@/lib/domain/decorations/admin-requests";

export default apiHandler(
  { methods: ["GET", "PUT", "DELETE"], auth: "admin", rateLimit: "admin" },
  async (req, res) => {
    try {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: "Invalid decoration ID" });
      }

      // Check if decoration exists
      const existingDecoration = await db.decorationItem.findUnique({
        where: { id },
        include: {
          creator: { select: { id: true, primaryHandle: true } },
          _count: { select: { userClaims: true } }
        }
      });

      if (!existingDecoration) {
        return res.status(404).json({ error: "Decoration not found" });
      }

      if (req.method === 'GET') {
        // Get decoration details
        return res.status(200).json({ decoration: existingDecoration });
      }

      if (req.method === 'PUT') {
        // Update decoration: what's left out stays as it is
        const body = updateDecorationSchema.parse(req.body);

        // A limited-time item keeps its window unless new dates come with it
        const releaseType = body.releaseType ?? existingDecoration.releaseType;
        const start = body.releaseStartAt !== undefined ? (body.releaseStartAt ? new Date(body.releaseStartAt) : null) : existingDecoration.releaseStartAt;
        const end = body.releaseEndAt !== undefined ? (body.releaseEndAt ? new Date(body.releaseEndAt) : null) : existingDecoration.releaseEndAt;
        if (releaseType === 'LIMITED_TIME') {
          const problem = windowProblem(start, end);
          if (problem) return res.status(400).json({ error: problem });
        }

        const updateData: Prisma.DecorationItemUpdateInput = {};
        if (body.name !== undefined) updateData.name = body.name;
        if (body.type !== undefined) updateData.type = body.type;
        if (body.category !== undefined) updateData.category = body.category;
        if (body.zone !== undefined) updateData.zone = body.zone;
        if (body.section !== undefined) updateData.section = body.section || null;
        // The edit form doesn't load the art (too large) and sends "": that
        // wiped every item's SVGs on each edit. Empty means unchanged.
        if (body.iconSvg) updateData.iconSvg = body.iconSvg;
        if (body.renderSvg) updateData.renderSvg = body.renderSvg;
        if (body.imagePath !== undefined) updateData.imagePath = body.imagePath;
        // A cleared size box sends null: unchanged
        if (body.gridWidth != null) updateData.gridWidth = body.gridWidth;
        if (body.gridHeight != null) updateData.gridHeight = body.gridHeight;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.isActive !== undefined) updateData.isActive = body.isActive;
        if (body.releaseType !== undefined) updateData.releaseType = body.releaseType;
        if (body.releaseStartAt !== undefined) updateData.releaseStartAt = start;
        if (body.releaseEndAt !== undefined) updateData.releaseEndAt = end;
        if (body.maxClaims !== undefined) updateData.maxClaims = body.maxClaims;
        if (body.collection !== undefined) updateData.collection = body.collection?.trim() || null;

        const updatedDecoration = await db.decorationItem.update({
          where: { id },
          data: updateData,
          include: {
            creator: { select: { id: true, primaryHandle: true } },
            _count: { select: { userClaims: true } }
          }
        });

        return res.status(200).json({ decoration: updatedDecoration });
      }

      if (req.method === 'DELETE') {
        // Delete decoration
        // Check if any users have claimed this decoration
        const claimCount = await db.userDecorationClaim.count({
          where: { decorationId: id }
        });

        if (claimCount > 0) {
          return res.status(400).json({
            error: `Cannot delete decoration: ${claimCount} users have claimed this item. Consider deactivating instead.`
          });
        }

        await db.decorationItem.delete({
          where: { id }
        });

        return res.status(200).json({ message: "Decoration deleted successfully" });
      }
    } catch (error) {
      // A body that doesn't fit is apiHandler's to answer (a 400 that says what to fix)
      if (error instanceof ZodError) throw error;
      console.error('Admin decoration management API error:', error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);