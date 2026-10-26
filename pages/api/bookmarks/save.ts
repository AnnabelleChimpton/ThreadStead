import { z } from 'zod';
import { BookmarkSourceType, Prisma } from '@prisma/client';
import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { isHttpUrl } from '@/lib/utils/validation/url';

/**
 * What useBookmarks sends. The body was used as typed, not checked: any
 * collectionId went in (someone else's collection too), any URL scheme,
 * and fields of any size.
 */
const saveSchema = z.object({
  url: z.string().trim().refine(isHttpUrl, 'That link needs to start with http:// or https://.'),
  title: z.string().trim().min(1).max(300),
  description: z.string().max(2000).optional(),
  sourceType: z.enum(BookmarkSourceType),
  sourceMetadata: z.record(z.string(), z.unknown())
    .refine((meta) => JSON.stringify(meta).length <= 5000, 'Source metadata is too big.')
    .optional(),
  collectionId: z.string().max(200).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  notes: z.string().max(2000).optional(),
});

export default apiHandler(
  { methods: ['POST'], auth: 'user', schema: saveSchema },
  async (req, res, { user, body }) => {
    try {
      const { url, title, description, sourceType, sourceMetadata, collectionId, tags = [], notes } = body;

      // Only into one of your own collections
      if (collectionId) {
        const mine = await db.userCollection.findFirst({ where: { id: collectionId, userId: user.id }, select: { id: true } });
        if (!mine) return res.status(404).json({ error: "That collection isn't one of yours." });
      }

      // Check if already bookmarked
      const existing = await db.userBookmark.findFirst({
        where: {
          userId: user.id,
          url: url
        }
      });

      if (existing) {
        return res.status(409).json({
          error: 'Already bookmarked',
          bookmarkId: existing.id
        });
      }

      // Get or create default collection if none specified
      let targetCollectionId = collectionId;
      if (!collectionId) {
        let defaultCollection = await db.userCollection.findFirst({
          where: {
            userId: user.id,
            isDefault: true
          }
        });

        if (!defaultCollection) {
          defaultCollection = await db.userCollection.create({
            data: {
              userId: user.id,
              name: 'Saved Sites',
              description: 'Your saved sites from search results',
              isDefault: true,
              visibility: 'private'
            }
          });
        }

        targetCollectionId = defaultCollection.id;
      }

      // Create bookmark
      const bookmark = await db.userBookmark.create({
        data: {
          userId: user.id,
          collectionId: targetCollectionId,
          url,
          title,
          description,
          sourceType,
          sourceMetadata: sourceMetadata as Prisma.InputJsonValue | undefined,
          tags,
          notes
        },
        include: {
          collection: true
        }
      });

      // Bookmarks stay private: saving one no longer adds the site to the
      // Indie Index. Vouching does that (SEARCH_PLAN.md §3.5).

      return res.json({
        success: true,
        bookmark: {
          id: bookmark.id,
          url: bookmark.url,
          title: bookmark.title,
          description: bookmark.description,
          collectionName: bookmark.collection?.name,
          createdAt: bookmark.createdAt
        }
      });

    } catch (error) {
      console.error('Save bookmark error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
