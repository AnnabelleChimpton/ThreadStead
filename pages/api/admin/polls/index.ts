import { db } from '@/lib/config/database/connection';
import { apiHandler } from '@/lib/api/handler';
import { z } from 'zod';
import { parseOffsetPagination } from '@/lib/server/http/pagination';

const createPollSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500, 'Question too long'),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  options: z.array(z.string().min(1, 'Option cannot be empty').max(200, 'Option too long'))
    .min(2, 'At least 2 options required')
    .max(10, 'Maximum 10 options allowed'),
  endsAt: z.string().optional().nullable()
});

export default apiHandler(
  { methods: ['GET', 'POST'], auth: 'admin', rateLimit: 'admin', schema: createPollSchema },
  async (req, res, { user, body }) => {
    if (req.method === 'GET') {
      // List all polls for admin view
      const { limit, offset } = parseOffsetPagination(req.query, { defaultLimit: 20, maxLimit: 50 });

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

    // POST: create a new poll (body already validated by createPollSchema)
    const { question, description, options, endsAt } = body;

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
);
