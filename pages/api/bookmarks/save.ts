import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';
import { withCsrfProtection } from '@/lib/api/middleware/withCsrfProtection';

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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getSessionUser(req as any);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

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

    // Auto-submit to community index if from external search
    if (sourceType === 'external_search') {
      await autoSubmitToCommunityIndex(bookmark, user);
    }

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

async function autoSubmitToCommunityIndex(bookmark: any, user: any) {
  try {
    // Check if URL already exists in index
    const existingSite = await db.indexedSite.findUnique({
      where: { url: bookmark.url }
    });

    if (existingSite) {
      // Link bookmark to existing site
      await db.bookmarkCommunitySubmission.create({
        data: {
          bookmarkId: bookmark.id,
          indexedSiteId: existingSite.id,
          submissionReason: 'user_bookmark',
          submissionScore: calculateUserScore(user),
          status: 'validated' // Already in index
        }
      });
      return;
    }

    // Create new submission for validation
    await db.bookmarkCommunitySubmission.create({
      data: {
        bookmarkId: bookmark.id,
        submissionReason: 'user_bookmark',
        submissionScore: calculateUserScore(user),
        status: 'pending'
      }
    });

    // Create indexed site entry (unvalidated)
    await db.indexedSite.create({
      data: {
        url: bookmark.url,
        title: bookmark.title,
        description: bookmark.description,
        submittedBy: user.id,
        discoveryMethod: 'user_bookmark',
        discoveryContext: `Bookmarked from ${bookmark.sourceMetadata?.engine || 'search'}`,
        siteType: inferSiteType(bookmark.sourceMetadata),
        communityValidated: false,
        seedingScore: calculateBookmarkScore(bookmark),
        seedingReasons: ['user_bookmarked', 'external_search']
      }
    });

  } catch (error) {
    console.error('Auto-submission failed:', error);
    // Don't fail the bookmark creation if auto-submission fails
  }
}

function calculateUserScore(user: any): number {
  // TODO: Implement user reputation scoring
  // For now, return a base score
  return 50;
}

function calculateBookmarkScore(bookmark: any): number {
  let score = 30; // Base score for user bookmarks

  const metadata = bookmark.sourceMetadata || {};

  // Boost for indie web indicators
  if (metadata.is_indie_web) score += 20;
  if (metadata.privacy_score > 0.7) score += 15;
  if (metadata.engine === 'searchmysite') score += 10;

  return Math.min(score, 100);
}

function inferSiteType(metadata: any): string {
  // Simple heuristics to infer site type
  if (!metadata) return 'unknown';

  if (metadata.content_type) {
    switch (metadata.content_type) {
      case 'blog': return 'personal_blog';
      case 'personal': return 'portfolio';
      case 'wiki': return 'reference';
      default: return 'other';
    }
  }

  return 'other';
}

export default withCsrfProtection(handler);