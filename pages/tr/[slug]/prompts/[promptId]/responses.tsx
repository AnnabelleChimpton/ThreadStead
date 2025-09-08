import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import Layout from '@/components/ui/layout/Layout'
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic'
import { db } from '@/lib/config/database/connection'
import { featureFlags } from '@/lib/utils/features/feature-flags'
import { getRingHubClient } from '@/lib/api/ringhub/ringhub-client'

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
  error?: string | null
}

export default function PromptResponsesPage({
  siteConfig,
  threadRing,
  prompt: initialPrompt,
  initialResponses,
  canAccess,
  error
}: PromptResponsesPageProps) {
  const router = useRouter()
  const { slug, promptId } = router.query
  const [prompt, setPrompt] = useState<ThreadRingPrompt | null>(initialPrompt)
  const [responses, setResponses] = useState<PromptResponse[]>(initialResponses || [])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialResponses?.length === 20)
  const [dataLoading, setDataLoading] = useState(!initialPrompt && canAccess)

  // Load prompt and responses client-side for Ring Hub
  useEffect(() => {
    if (!canAccess || !threadRing || !slug || !promptId || initialPrompt) return

    const loadPromptData = async () => {
      setDataLoading(true)
      try {
        // Load prompt details
        const promptResponse = await fetch(`/api/threadrings/${slug}/prompts`)
        if (promptResponse.ok) {
          const prompts = await promptResponse.json()
          const foundPrompt = Array.isArray(prompts) 
            ? prompts.find(p => p.id === promptId)
            : (prompts.id === promptId ? prompts : null)
          
          if (foundPrompt) {
            setPrompt(foundPrompt)
          }
        }

        // Load responses
        const responsesResponse = await fetch(`/api/threadrings/${slug}/prompts/${promptId}/responses`)
        if (responsesResponse.ok) {
          const data = await responsesResponse.json()
          setResponses(data.responses || [])
          setHasMore(data.pagination?.totalCount > (data.responses?.length || 0))
        }
      } catch (error) {
        console.error('Error loading prompt data:', error)
      } finally {
        setDataLoading(false)
      }
    }

    loadPromptData()
  }, [canAccess, threadRing, slug, promptId, initialPrompt])

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

  if (!threadRing) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center text-gray-600">
            ThreadRing not found.
          </div>
        </div>
      </Layout>
    )
  }

  if (dataLoading) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center text-gray-600">
            Loading prompt data...
          </div>
        </div>
      </Layout>
    )
  }

  if (!prompt) {
    return (
      <Layout siteConfig={siteConfig}>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center text-gray-600">
            Prompt not found.
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
            <Link href={`/tr/${threadRing.slug}`} className="hover:underline">
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
                <span>ThreadRing Challenge • Started {formatDistanceToNow(new Date(prompt.startsAt))} ago</span>
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
                      
                      {response.post.threadRings && response.post.threadRings.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span>📍</span>
                          {response.post.threadRings
                            .filter((tr) => tr && tr.threadRing && tr.threadRing.id)
                            .map((tr, idx) => (
                              <span key={tr.threadRing.id}>
                                {idx > 0 && ', '}
                                <Link 
                                  href={`/tr/${tr.threadRing.slug}`}
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

    // Use Ring Hub-based prompt system
    if (featureFlags.ringhub()) {
      const client = getRingHubClient();
      if (client) {
        try {
          // Get Ring from Ring Hub
          const ringDescriptor = await client.getRing(slug);
          if (!ringDescriptor) {
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

          // Create basic ThreadRing object from Ring Hub data
          const threadRing = {
            id: ringDescriptor.slug, // Use slug as ID for Ring Hub rings
            name: ringDescriptor.name,
            slug: ringDescriptor.slug,
            description: ringDescriptor.description || '',
            visibility: 'public' as const // Ring Hub rings are typically public
          }

          // Try to fetch the prompt and responses via API (which uses promptService)
          // We can't use promptService directly in SSR due to authentication requirements
          console.log('ThreadRing found via Ring Hub:', threadRing)
          
          return {
            props: {
              siteConfig,
              threadRing,
              prompt: null, // Will be loaded client-side
              initialResponses: [],
              canAccess: true,
              error: null
            }
          }
        } catch (ringHubError) {
          console.log('Ring Hub error:', ringHubError instanceof Error ? ringHubError.message : ringHubError);
          return {
            props: {
              siteConfig,
              threadRing: null,
              prompt: null,
              initialResponses: [],
              canAccess: false,
              error: 'Failed to load ThreadRing data'
            }
          }
        }
      }
    }

    // Fallback to local database (deprecated path)
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

    // Use API to get prompt and responses (works with new PostRef system)
    let prompt: ThreadRingPrompt | null = null;
    let responses: PromptResponse[] = [];

    try {
      // Get prompt details from API
      const promptResponse = await fetch(`http://localhost:3000/api/threadrings/${slug}/prompts/${promptId}`, {
        headers: {
          'User-Agent': 'ThreadStead-SSR/1.0'
        }
      });
      
      if (promptResponse.ok) {
        prompt = await promptResponse.json();
      }

      console.log('Prompt found via API:', !!prompt);

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

      // Get responses from API
      const responsesResponse = await fetch(`http://localhost:3000/api/threadrings/${slug}/prompts/${promptId}/responses?page=1&limit=20`, {
        headers: {
          'User-Agent': 'ThreadStead-SSR/1.0'
        }
      });

      if (responsesResponse.ok) {
        const responsesData = await responsesResponse.json();
        responses = responsesData.responses || [];
      }
    } catch (err) {
      console.error('Error fetching prompt/responses via API:', err);
      // Continue with empty data - the page will show appropriate error messages
    }

    return {
      props: {
        siteConfig,
        threadRing,
        prompt,
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