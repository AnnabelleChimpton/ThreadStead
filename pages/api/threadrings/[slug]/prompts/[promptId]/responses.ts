import type { NextApiRequest, NextApiResponse } from 'next'
import { createPromptService } from '@/lib/utils/data/prompt-service'
import { withThreadRingSupport } from '@/lib/api/ringhub/ringhub-middleware'

export default withThreadRingSupport(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  system: 'ringhub' | 'local'
) {
  const { slug, promptId } = req.query

  if (typeof slug !== 'string' || typeof promptId !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' })
  }

  if (req.method === 'GET') {
    // Ring Hub system - use PostRef-based prompts
    if (system === 'ringhub') {
      try {
        console.log(`🎯 Fetching responses for prompt ${promptId} in ring ${slug}`);
        const promptService = createPromptService(slug)
        
        // Get prompt details and responses
        const promptDetails = await promptService.getPromptDetails(promptId)
        
        if (!promptDetails) {
          console.log(`❌ Prompt ${promptId} not found in ring ${slug}`);
          return res.status(404).json({ error: 'Prompt not found' })
        }

        console.log(`✅ Found prompt ${promptId}, checking for responses...`);

        // Pagination parameters
        const page = parseInt(req.query.page as string) || 1
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
        const skip = (page - 1) * limit

        // Get responses from Ring Hub
        const responses = await promptService.getPromptResponses(promptId)
        console.log(`📝 Found ${responses.length} responses for prompt ${promptId}:`, responses.map(r => ({
          id: r.id,
          uri: r.uri,
          metadataType: r.metadata?.type,
          responseData: (r.metadata as any)?.response
        })));
        
        // Apply pagination
        const paginatedResponses = responses.slice(skip, skip + limit)
        
        // Transform responses to match old API format for frontend compatibility
        const transformedResponses = await Promise.all(
          paginatedResponses.map(async (response) => {
            // Try to get real post data from the URI
            let postData: any = {
              id: response.uri.split('/').pop(),
              title: (response.metadata as any)?.title || 'Response Post',
              bodyText: (response.metadata as any)?.textPreview || null,
              bodyHtml: null,
              bodyMarkdown: null,
              visibility: 'public',
              createdAt: response.submittedAt,
              authorId: response.submittedBy,
            };

            // Try to fetch actual post data if we can extract the post ID
            const postId = response.uri.split('/').pop();
            if (postId && postId.length > 10) { // Basic validation
              try {
                const { db } = await import('@/lib/config/database/connection');
                const actualPost = await db.post.findUnique({
                  where: { id: postId },
                  select: {
                    id: true,
                    title: true,
                    bodyText: true,
                    bodyHtml: true,
                    bodyMarkdown: true,
                    visibility: true,
                    createdAt: true,
                    authorId: true,
                    author: {
                      select: {
                        id: true,
                        handles: {
                          take: 1,
                          select: { handle: true }
                        },
                        profile: {
                          select: {
                            displayName: true,
                            avatarUrl: true
                          }
                        }
                      }
                    }
                  }
                });

                if (actualPost) {
                  postData = {
                    ...postData,
                    title: actualPost.title,
                    bodyText: actualPost.bodyText,
                    bodyHtml: actualPost.bodyHtml,
                    bodyMarkdown: actualPost.bodyMarkdown,
                    visibility: actualPost.visibility as any,
                    createdAt: actualPost.createdAt.toISOString(),
                    authorId: actualPost.authorId,
                  };

                  console.log(`✅ Resolved post data for response ${response.id}: ${actualPost.title}`);
                }
              } catch (dbError) {
                console.log(`⚠️ Could not resolve post data for ${postId}:`, dbError);
              }
            }

            // Extract user identification from metadata for dev mode
            const responseUserId = (response.metadata as any)?.threadsteadUserId || 
                                  (response.metadata as any)?.response?.threadsteadUserId;
            const authorHandle = (response.metadata as any)?.authorHandle;

            return {
              id: response.id,
              postId: postData.id,
              createdAt: response.submittedAt,
              post: {
                ...postData,
                author: {
                  id: responseUserId || response.submittedBy,
                  handles: [{ handle: authorHandle || 'Ring Hub User' }],
                  profile: { 
                    displayName: authorHandle ? authorHandle.split('@')[0] : null,
                    avatarUrl: null
                  }
                },
                threadRings: [{
                  threadRing: {
                    id: slug,
                    name: slug,
                    slug: slug
                  }
                }],
                _count: {
                  comments: 0 // Not available from Ring Hub PostRef
                }
              }
            };
          })
        )

        return res.status(200).json({
          responses: transformedResponses,
          pagination: {
            page,
            limit,
            totalCount: responses.length,
            totalPages: Math.ceil(responses.length / limit)
          }
        })
      } catch (error) {
        console.error('Error fetching prompt responses:', error)
        return res.status(500).json({ error: 'Failed to fetch prompt responses' })
      }
    }

    // Local system fallback (deprecated)
    return res.status(404).json({ error: 'Local prompt system no longer supported' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
})