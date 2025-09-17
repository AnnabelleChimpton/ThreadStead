/**
 * Site reviews API for community index
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { db } from '@/lib/config/database/connection';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check authentication
    const user = await getSessionUser(req as any);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.method === 'GET') {
      // Get reviews for a specific site
      const siteId = req.query.siteId as string;

      if (!siteId) {
        return res.status(400).json({ error: 'Site ID is required' });
      }

      const reviews = await db.siteReview.findMany({
        where: { siteId },
        include: {
          user: {
            select: {
              id: true,
              primaryHandle: true
            }
          }
        },
        orderBy: [
          { helpful: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return res.json({
        success: true,
        reviews
      });
    }

    if (req.method === 'POST') {
      // Create or update a review
      const { siteId, title, content, rating } = req.body;

      if (!siteId || !content) {
        return res.status(400).json({ error: 'Site ID and content are required' });
      }

      // Validate rating if provided
      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      // Check if site exists
      const site = await db.indexedSite.findUnique({
        where: { id: siteId }
      });

      if (!site) {
        return res.status(404).json({ error: 'Site not found' });
      }

      // Check if user already has a review for this site
      const existingReview = await db.siteReview.findUnique({
        where: {
          siteId_userId: {
            siteId,
            userId: user.id
          }
        }
      });

      if (existingReview) {
        // Update existing review
        const updatedReview = await db.siteReview.update({
          where: { id: existingReview.id },
          data: {
            title: title || null,
            content,
            rating: rating || null
          },
          include: {
            user: {
              select: {
                id: true,
                primaryHandle: true
              }
            }
          }
        });

        return res.json({
          success: true,
          message: 'Review updated successfully',
          review: updatedReview
        });
      } else {
        // Create new review
        const newReview = await db.siteReview.create({
          data: {
            siteId,
            userId: user.id,
            title: title || null,
            content,
            rating: rating || null
          },
          include: {
            user: {
              select: {
                id: true,
                primaryHandle: true
              }
            }
          }
        });

        return res.json({
          success: true,
          message: 'Review created successfully',
          review: newReview
        });
      }
    }

    if (req.method === 'DELETE') {
      // Delete a review
      const reviewId = req.query.reviewId as string;

      if (!reviewId) {
        return res.status(400).json({ error: 'Review ID is required' });
      }

      // Check if review exists and belongs to user
      const review = await db.siteReview.findUnique({
        where: { id: reviewId }
      });

      if (!review) {
        return res.status(404).json({ error: 'Review not found' });
      }

      if (review.userId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: 'You can only delete your own reviews' });
      }

      await db.siteReview.delete({
        where: { id: reviewId }
      });

      return res.json({
        success: true,
        message: 'Review deleted successfully'
      });
    }

    if (req.method === 'PUT') {
      // Mark review as helpful
      const action = req.query.action as string;
      const reviewId = req.body.reviewId as string;

      if (action === 'helpful' && reviewId) {
        const review = await db.siteReview.findUnique({
          where: { id: reviewId }
        });

        if (!review) {
          return res.status(404).json({ error: 'Review not found' });
        }

        // Increment helpful count
        await db.siteReview.update({
          where: { id: reviewId },
          data: {
            helpful: { increment: 1 }
          }
        });

        return res.json({
          success: true,
          message: 'Review marked as helpful'
        });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Reviews API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}