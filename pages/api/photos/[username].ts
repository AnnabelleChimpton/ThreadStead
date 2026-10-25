import type { Prisma } from "@prisma/client";
import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";

import { SITE_NAME } from "@/lib/config/site/constants";
import { parsePagePagination } from "@/lib/server/http/pagination";
import { residentAccess, sendPrivateProfile } from "@/lib/domain/users/profile-access";
import { PICTURE_MEDIA_TYPES } from "@/lib/media/media-types";
import { PAGE_ASSET_CONTEXT } from "@/lib/media/upload-context";
import { PAGE_PICTURE_BYTES, pagePictureBytes } from "@/lib/media/page-pictures";

/**
 * GET /api/photos/<username>: that person's public gallery pictures, for
 * anyone who can see their profile.
 *
 * GET /api/photos/<username>?scope=mine: the signed-in owner's own pictures,
 * gallery and post/comment images together, whatever their visibility (the
 * editor's image picker). Only that person gets it: signed out is a 401,
 * anyone else a 403. Without scope=mine nothing changes.
 *
 * GET /api/photos/<username>?scope=page: the owner's pictures for their page
 * only (the media page lists them so they can be found and deleted), with
 * how many of the page pictures' bytes they use. Owner only, as scope=mine.
 */
export default apiHandler(
  { methods: ["GET"], auth: "optional" },
  async (req, res, { user: viewer }) => {
    const username = String(req.query.username || "");
    const { page, limit } = parsePagePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  
    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    try {
      // Find the user by handle
      const handle = await db.handle.findFirst({
        where: { 
          handle: username, 
          host: SITE_NAME 
        },
        include: {
          user: true
        }
      });

      if (!handle) {
        return res.status(404).json({ error: "User not found" });
      }

      const forPage = req.query.scope === "page";
      const mine = req.query.scope === "mine" || forPage;
      if (mine) {
        if (!viewer) return res.status(401).json({ error: "Please log in." });
        if (viewer.id !== handle.user.id) {
          return res.status(403).json({ error: "Only you can see this list." });
        }
        // Holds private images: never store it in a shared cache
        res.setHeader("Cache-Control", "private, no-store");
      } else {
        // Public photos still follow the profile's visibility and blocks
        const access = await residentAccess(viewer, handle.user.id);
        if (!access.visible) {
          return sendPrivateProfile(res, access.visibility);
        }
      }

      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      const where: Prisma.MediaWhereInput = forPage
        ? { userId: handle.user.id, uploadContext: PAGE_ASSET_CONTEXT }
        : mine
        ? {
            userId: handle.user.id,
            mediaType: { in: PICTURE_MEDIA_TYPES },
            // Gallery uploads, pictures added to posts and comments, and
            // pictures uploaded for the page itself (badges stay out)
            OR: [{ isGalleryItem: true }, { uploadContext: "post_embed" }, { uploadContext: PAGE_ASSET_CONTEXT }],
          }
        : {
            userId: handle.user.id,
            mediaType: { in: PICTURE_MEDIA_TYPES }, // Pictures (images and GIFs), not MIDI files
            visibility: "public", // Only show public media for now
            isGalleryItem: true, // Only show intentional gallery uploads
          };

      const [media, totalCount] = await Promise.all([
        db.media.findMany({
          where,
          orderBy: {
            createdAt: "desc"
          },
          skip: offset,
          take: limit,
          select: {
            uploadContext: true,
            id: true,
            title: true,
            caption: true,
            thumbnailUrl: true,
            mediumUrl: true,
            fullUrl: true,
            featured: true,
            featuredOrder: true,
            createdAt: true,
            visibility: true,
            width: true,
            height: true,
            fileSize: true,
            originalName: forPage,
          }
        }),
        db.media.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return res.status(200).json({
        media,
        ...(forPage && { usage: { bytes: await pagePictureBytes(db, handle.user.id), limit: PAGE_PICTURE_BYTES } }),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      });

    } catch (error) {
      console.error("Error fetching media:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);
