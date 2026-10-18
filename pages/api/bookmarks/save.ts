import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';

interface SaveRequest {
  url: string;
  title: string;
  description?: string;
  sourceType: 'community_index' | 'site_content' | 'external_search' | 'manual';
  sourceMetadata?: Record<string, any>;
  collectionId?: string;
  tags?: string[];
  notes?: string;
}

export default apiHandler(
  { methods: ['POST'], auth: 'user' },
  async (req, res, { user }) => {
    try {
      const {
        url,
        title,
        description,
        sourceType,
        sourceMetadata,
        collectionId,
        tags = [],
        notes
      }: SaveRequest = req.body;

      // Validate required fields
      if (!url || !title || !sourceType) {
        return res.status(400).json({ error: 'Missing required fields: url, title, sourceType' });
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
          sourceMetadata,
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
