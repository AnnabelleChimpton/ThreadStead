import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import Layout from '@/components/Layout'
import { getSiteConfig, SiteConfig } from '@/lib/get-site-config'
import { getSessionUser } from '@/lib/auth-server'
import { db } from '@/lib/db'
import { featureFlags } from '@/lib/feature-flags'
import { getRingHubClient } from '@/lib/ringhub-client'

interface PromptResponse {
  id: string
  createdAt: string
  post: {
    id: string
    title: string | null
    bodyText: string | null
    bodyHtml: string | null
    bodyMarkdown: string | null
    visibility: string
    createdAt: string
    author: {
      id: string
      handles: Array<{ handle: string }>
      profile: {
        displayName: string | null
        avatarUrl: string | null
      } | null
    }
    threadRings: Array<{
      threadRing: {
        id: string
        name: string
        slug: string
      }
      addedAt: string | null
    }>
    _count: {
      comments: number
    }
  }
}

interface ThreadRingPrompt {
  id: string
  title: string
  description: string
  startsAt: string
  endsAt: string | null
  isActive: boolean
  isPinned: boolean
  responseCount: number
  createdById: string
  createdBy: {
    id: string
    handles: Array<{ handle: string }>
    profile: {
      displayName: string | null
      avatarUrl: string | null
    } | null
  }
}

interface ThreadRing {
  id: string
  name: string
  slug: string
  description: string | null
}

interface PromptResponsesPageProps {
  siteConfig: SiteConfig
  threadRing: ThreadRing | null
  prompt: ThreadRingPrompt | null
  initialResponses: PromptResponse[]
  canAccess: boolean
  error?: string
}

export default function PromptResponsesPage({
  siteConfig,
  threadRing,
  prompt,
  initialResponses,
  canAccess,
  error
}: PromptResponsesPageProps) {
  const router = useRouter()
  const [responses, setResponses] = useState<PromptResponse[]>(initialResponses || [])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialResponses?.length === 20)

  const loadMoreResponses = async () => {
    if (!threadRing || !prompt || loading) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/threadrings/${threadRing.slug}/prompts/${prompt.id}/responses?page=${Math.floor(responses.length / 20) + 1}&limit=20`
      )
      
      if (response.ok) {
        const data = await response.json()
        setResponses(prev => [...prev, ...data.responses])
        setHasMore(data.responses.length === 20)
      }
    } catch (err) {
      console.error('Failed to load more responses:', err)
    } finally {
      setLoading(false)
    }
  }

  const getUserDisplayName = (author: PromptResponse['post']['author']) => {
    return author.profile?.displayName || author.handles[0]?.handle || 'Unknown User'
  }

  const truncateText = (text: string | null, maxLength: number = 300) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (error || !canAccess) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center text-red-600">
            {error || 'You do not have permission to view this prompt.'}
          </div>
          <div className="text-center mt-4">
            <Link href="/threadrings" className="text-blue-600 hover:underline">
              ← Back to ThreadRings
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  if (!threadRing || !prompt) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center text-gray-600">
            Prompt or ThreadRing not found.
          </div>
        </div>
      </Layout>
    )
  }

  const isExpired = prompt.endsAt && new Date(prompt.endsAt) < new Date()

  return (
    <Layout siteConfig={siteConfig}>
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Navigation */}
        <div className="mb-6">
          <nav className="text-sm text-gray-600">
            <Link href="/threadrings" className="hover:underline">ThreadRings</Link>
            {' > '}
            <Link href={`/threadrings/${threadRing.slug}`} className="hover:underline">
              {threadRing.name}
            </Link>
            {' > '}
            <span className="text-gray-400">Prompt Responses</span>
          </nav>
        </div>

        {/* Prompt Header */}
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-400 rounded-lg">
          <div className="flex items-start gap-4">
            <span className="text-3xl">💭</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{prompt.title}</h1>
                {prompt.isActive && !isExpired && (
                  <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
                    Active
                  </span>
                )}
                {prompt.isPinned && (
                  <span className="px-3 py-1 bg-yellow-500 text-white text-sm rounded-full">
                    📌 Pinned
                  </span>
                )}
                {isExpired && (
                  <span className="px-3 py-1 bg-gray-500 text-white text-sm rounded-full">
                    Ended
                  </span>
                )}
              </div>
              
              <p className="text-gray-700 mb-4 text-lg leading-relaxed whitespace-pre-wrap">
                {prompt.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span>
                  Posted by {getUserDisplayName({ 
                    id: prompt.createdBy.id,
                    handles: prompt.createdBy.handles, 
                    profile: prompt.createdBy.profile 
                  })}
                </span>
                <span>{formatDistanceToNow(new Date(prompt.startsAt))} ago</span>
                <span className="font-medium text-purple-600">
                  {prompt.responseCount} {prompt.responseCount === 1 ? 'response' : 'responses'}
                </span>
                {prompt.endsAt && !isExpired && (
                  <span className="text-orange-600 font-medium">
                    ⏰ Ends {formatDistanceToNow(new Date(prompt.endsAt), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Responses */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">
            All Responses ({prompt.responseCount})
          </h2>

          {responses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <span className="text-4xl mb-4 block">📝</span>
              <p className="text-lg">No responses yet.</p>
              <p className="text-sm mt-2">Be the first to respond to this challenge!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((response) => (
                <article 
                  key={response.id}
                  className="border border-gray-200 rounded-lg p-6 bg-white hover:shadow-md transition-shadow"
                >
                  {/* Author Header */}
                  <div className="flex items-start gap-4 mb-4">
                    {response.post.author.profile?.avatarUrl ? (
                      <img 
                        src={response.post.author.profile.avatarUrl} 
                        alt={getUserDisplayName(response.post.author)}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 font-semibold">
                          {getUserDisplayName(response.post.author)[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <Link 
                          href={`/resident/${response.post.author.handles[0]?.handle}`}
                          className="font-semibold text-gray-900 hover:underline"
                        >
                          {getUserDisplayName(response.post.author)}
                        </Link>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(response.post.createdAt))} ago
                        </span>
                      </div>
                      
                      {response.post.title && (
                        <Link 
                          href={`/resident/${response.post.author.handles[0]?.handle}/post/${response.post.id}`}
                          className="text-xl font-semibold text-blue-600 hover:text-blue-800 hover:underline block mb-2"
                        >
                          {response.post.title}
                        </Link>
                      )}
                    </div>
                  </div>
                  
                  {/* Post Content */}
                  {response.post.bodyHtml ? (
                    <div 
                      className="prose max-w-none mb-4"
                      dangerouslySetInnerHTML={{ 
                        __html: truncateText(response.post.bodyHtml, 500) 
                      }} 
                    />
                  ) : response.post.bodyText && (
                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                      {truncateText(response.post.bodyText)}
                    </p>
                  )}
                  
                  {/* Post Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>💬 {response.post._count.comments} comments</span>
                      
                      {response.post.threadRings.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span>📍</span>
                          {response.post.threadRings.map((tr, idx) => (
                            <span key={tr.threadRing.id}>
                              {idx > 0 && ', '}
                              <Link 
                                href={`/threadrings/${tr.threadRing.slug}`}
                                className="hover:underline"
                              >
                                {tr.threadRing.name}
                              </Link>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Link 
                      href={`/resident/${response.post.author.handles[0]?.handle}/post/${response.post.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Read full post →
                    </Link>
                  </div>
                </article>
              ))}
              
              {/* Load More */}
              {hasMore && (
                <div className="text-center pt-6">
                  <button
                    onClick={loadMoreResponses}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Loading...' : 'Load More Responses'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps<PromptResponsesPageProps> = async (context) => {
  const { slug, promptId } = context.params as { slug: string; promptId: string }
  const siteConfig = await getSiteConfig()

  try {
    console.log('Loading responses page for:', slug, promptId)

    // Note: Prompts/Responses are currently local-only features
    // Even with Ring Hub enabled, we use local ThreadRing data for prompts
    // TODO: Integrate prompts/responses with Ring Hub in future
    
    // Verify ThreadRing exists (check Ring Hub first if enabled, then local)
    let threadRingExists = false;
    if (featureFlags.ringhub()) {
      const client = getRingHubClient();
      if (client) {
        try {
          const ringDescriptor = await client.getRing(slug);
          threadRingExists = !!ringDescriptor;
        } catch (ringHubError) {
          console.log('Ring Hub check failed, falling back to local:', ringHubError instanceof Error ? ringHubError.message : ringHubError);
        }
      }
    }

    // Find the ThreadRing in local database (for prompts data)
    const threadRing = await db.threadRing.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        visibility: true
      }
    })

    // If Ring Hub is enabled but ThreadRing doesn't exist there, show error
    if (featureFlags.ringhub() && !threadRingExists) {
      return {
        props: {
          siteConfig,
          threadRing: null,
          prompt: null,
          initialResponses: [],
          canAccess: false,
          error: 'ThreadRing not found in Ring Hub'
        }
      }
    }

    console.log('ThreadRing found:', !!threadRing)

    if (!threadRing) {
      return {
        props: {
          siteConfig,
          threadRing: null,
          prompt: null,
          initialResponses: [],
          canAccess: false,
          error: 'ThreadRing not found'
        }
      }
    }

    // Simple prompt query without complex includes
    const prompt = await db.threadRingPrompt.findFirst({
      where: {
        id: promptId,
        threadRingId: threadRing.id
      }
    })

    console.log('Prompt found:', !!prompt)

    if (!prompt) {
      return {
        props: {
          siteConfig,
          threadRing,
          prompt: null,
          initialResponses: [],
          canAccess: true,
          error: 'Prompt not found'
        }
      }
    }

    // Get the user who created the prompt
    let promptCreator = null
    try {
      promptCreator = await db.user.findUnique({
        where: { id: prompt.createdById },
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
      })
    } catch (err) {
      console.error('Error fetching prompt creator:', err)
    }

    // Get the responses with full data in a single query
    let responses: PromptResponse[] = []
    try {
      const rawResponses = await db.postThreadRingPrompt.findMany({
        where: { promptId },
        include: {
          post: {
            include: {
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
              },
              _count: {
                select: { comments: true }
              },
              threadRings: {
                include: {
                  threadRing: {
                    select: {
                      id: true,
                      name: true,
                      slug: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })

      console.log('Raw responses found:', rawResponses.length)

      // Filter and format responses
      responses = rawResponses
        .filter(response => response.post.visibility === 'public')
        .map(response => ({
          id: response.id,
          createdAt: response.createdAt.toISOString(),
          post: {
            id: response.post.id,
            title: response.post.title,
            bodyText: response.post.bodyText,
            bodyHtml: response.post.bodyHtml,
            bodyMarkdown: response.post.bodyMarkdown,
            visibility: response.post.visibility,
            createdAt: response.post.createdAt.toISOString(),
            author: response.post.author,
            threadRings: response.post.threadRings.map(tr => ({
              threadRing: tr.threadRing,
              addedAt: tr.addedAt ? tr.addedAt.toISOString() : null
            })),
            _count: response.post._count
          }
        }))

      console.log('Filtered responses:', responses.length)
    } catch (err) {
      console.error('Error fetching responses:', err)
    }

    return {
      props: {
        siteConfig,
        threadRing,
        prompt: {
          id: prompt.id,
          title: prompt.title,
          description: prompt.description,
          startsAt: prompt.startsAt.toISOString(),
          endsAt: prompt.endsAt?.toISOString() || null,
          isActive: prompt.isActive,
          isPinned: prompt.isPinned,
          responseCount: prompt.responseCount,
          createdById: prompt.createdById,
          createdBy: promptCreator || {
            id: prompt.createdById,
            handles: [{ handle: 'Unknown User' }],
            profile: { displayName: null, avatarUrl: null }
          }
        },
        initialResponses: responses,
        canAccess: true
      }
    }

  } catch (error) {
    console.error('Error loading prompt responses page:', error)
    return {
      props: {
        siteConfig,
        threadRing: null,
        prompt: null,
        initialResponses: [],
        canAccess: false,
        error: `Failed to load prompt responses: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }
}