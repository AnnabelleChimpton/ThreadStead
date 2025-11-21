import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';
import { withCsrfProtection } from '@/lib/api/middleware/withCsrfProtection';
import { withRateLimit } from '@/lib/api/middleware/withRateLimit';
import { z } from 'zod';

const bulletinCategorySchema = z.enum(['LOOKING_FOR', 'SHARING', 'INVITATION', 'HELP_FEEDBACK', 'COMMUNITY_NOTICE']);

const createBulletinSchema = z.object({
  category: bulletinCategorySchema,
  text: z.string().min(1, 'Text is required').max(200, 'Text must be 200 characters or less'),
  linkUrl: z.string().url('Invalid URL').optional().nullable(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // Return all active bulletins for the full board
      const now = new Date();

      const bulletins = await db.bulletin.findMany({
        where: {
          isActive: true,
          expiresAt: {
            gt: now,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              primaryHandle: true,
              profile: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json({ bulletins });
    }

    if (req.method === 'POST') {
      // Create or replace bulletin (requires auth)
      const user = await getSessionUser(req);

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Validate request body
      const validatedData = createBulletinSchema.parse(req.body);

      // Check if COMMUNITY_NOTICE requires admin
      if (validatedData.category === 'COMMUNITY_NOTICE' && user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can post Community Notices' });
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      // Check for existing active bulletin
      const existingBulletin = await db.bulletin.findFirst({
        where: {
          userId: user.id,
          isActive: true,
          expiresAt: {
            gt: now,
          },
        },
      });

      // If exists, deactivate it (replace behavior)
      if (existingBulletin) {
        await db.bulletin.update({
          where: { id: existingBulletin.id },
          data: { isActive: false },
        });
      }

      // Create new bulletin
      const bulletin = await db.bulletin.create({
        data: {
          userId: user.id,
          category: validatedData.category,
          text: validatedData.text,
          linkUrl: validatedData.linkUrl || null,
          expiresAt,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              primaryHandle: true,
              profile: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
      });

      return res.status(201).json({ bulletin });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues,
      });
    }
    console.error('Error in bulletin API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withRateLimit('posts')(withCsrfProtection(handler));
