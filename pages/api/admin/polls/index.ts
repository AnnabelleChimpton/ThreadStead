import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';
import { withCsrfProtection } from '@/lib/api/middleware/withCsrfProtection';
import { withRateLimit } from '@/lib/api/middleware/withRateLimit';
import { z } from 'zod';

const createPollSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500, 'Question too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  options: z.array(z.string().min(1, 'Option cannot be empty').max(200, 'Option too long'))
    .min(2, 'At least 2 options required')
    .max(10, 'Maximum 10 options allowed'),
  endsAt: z.string().optional().nullable()
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getSessionUser(req);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.method === 'GET') {
      // List all polls for admin view
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

      const [polls, total] = await Promise.all([
        db.poll.findMany({
          include: {
            creator: {
              select: {
                id: true,
                primaryHandle: true,
                role: true
              }
            },
            _count: {
              select: {
                votes: true,
                options: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        db.poll.count()
      ]);

      return res.status(200).json({
        polls,
        total,
        hasMore: offset + polls.length < total
      });
    }

    if (req.method === 'POST') {
      // Create new poll
      const validatedData = createPollSchema.parse(req.body);
      const { question, description, options, endsAt } = validatedData;

      // Validate and parse endsAt if provided
      let parsedEndsAt: Date | null = null;
      if (endsAt) {
        parsedEndsAt = new Date(endsAt);
        if (isNaN(parsedEndsAt.getTime())) {
          return res.status(400).json({ error: 'Invalid date format for endsAt' });
        }
        if (parsedEndsAt <= new Date()) {
          return res.status(400).json({ error: 'End date must be in the future' });
        }
      }

      // Trim and deduplicate options
      const trimmedOptions = [...new Set(options.map(opt => opt.trim()))].filter(opt => opt.length > 0);

      if (trimmedOptions.length < 2) {
        return res.status(400).json({ error: 'At least 2 unique options required' });
      }

      // Deactivate all existing polls before creating new one
      await db.poll.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });

      // Create poll with options
      const poll = await db.poll.create({
        data: {
          question: question.trim(),
          description: description?.trim() || null,
          endsAt: parsedEndsAt,
          isActive: true,
          createdBy: user.id,
          options: {
            create: trimmedOptions.map((text, index) => ({
              text,
              order: index
            }))
          }
        },
        include: {
          options: {
            orderBy: { order: 'asc' }
          },
          creator: {
            select: {
              id: true,
              primaryHandle: true,
              role: true
            }
          }
        }
      });

      return res.status(201).json({
        message: 'Poll created successfully',
        poll
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin polls API error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default withRateLimit('admin')(withCsrfProtection(handler));
