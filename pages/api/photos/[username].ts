import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";

import { SITE_NAME } from "@/lib/config/site/constants";
import { parsePagePagination } from "@/lib/server/http/pagination";
import { residentAccess, sendPrivateProfile } from "@/lib/domain/users/profile-access";
import { PICTURE_MEDIA_TYPES } from "@/lib/media/media-types";



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

      // Public photos still follow the profile's visibility and blocks
      const access = await residentAccess(viewer, handle.user.id);
      if (!access.visible) {
        return sendPrivateProfile(res, access.visibility);
      }

      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      // Get gallery media for this user (images only, gallery items only)
      const [media, totalCount] = await Promise.all([
        db.media.findMany({
          where: {
            userId: handle.user.id,
            mediaType: { in: PICTURE_MEDIA_TYPES }, // Pictures (images and GIFs), not MIDI files
            visibility: "public", // Only show public media for now
            isGalleryItem: true // Only show intentional gallery uploads
          },
          orderBy: {
            createdAt: "desc"
          },
          skip: offset,
          take: limit,
          select: {
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
            fileSize: true
          }
        }),
        db.media.count({
          where: {
            userId: handle.user.id,
            mediaType: { in: PICTURE_MEDIA_TYPES },
            visibility: "public",
            isGalleryItem: true // Only count gallery items
          }
        })
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return res.status(200).json({
        media,
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
