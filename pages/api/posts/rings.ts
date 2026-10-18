/**
 * POST /api/posts/rings — send an existing post to more rings.
 *
 * Backs "Try again" on the composer's ring outcome panel and "Add to a ring"
 * on a post. Same path as create.ts (sendPostToRings): submit to Ring Hub,
 * then mirror the accepted rings locally. Sending to a ring the post is
 * already in comes back 'posted' and changes nothing.
 *
 * Body: { postId, rings: string[] (slugs), promptId? }
 * Response: { rings: RingPostResult[] }, one per requested ring.
 */
import { z } from 'zod'
import { apiHandler, ApiError } from '@/lib/api/handler'
import { db } from '@/lib/config/database/connection'
import { sendPostToRings } from '@/lib/domain/posts/send-to-rings'

const bodySchema = z.object({
  postId: z.string().min(1),
  rings: z.array(z.string().min(1).max(100)).min(1).max(50),
  // A prompt response that missed its ring keeps its prompt on retry.
  promptId: z.string().min(1).optional(),
})

export default apiHandler(
  { methods: ['POST'], auth: 'user', rateLimit: 'posts', schema: bodySchema },
  async (_req, res, { user, body }) => {
    const post = await db.post.findUnique({
      where: { id: body.postId },
      include: { author: { select: { primaryHandle: true } } },
    })
    if (!post) throw new ApiError(404, 'Post not found')
    if (post.authorId !== user.id) throw new ApiError(403, 'Only the author can add this post to a ring')

    const rings = await sendPostToRings({
      post,
      authorHandle: post.author.primaryHandle,
      userId: user.id,
      ringSlugs: body.rings,
      promptId: body.promptId,
    })
    res.status(200).json({ rings })
  }
)
