import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import CompactBadgeDisplay from '../../shared/CompactBadgeDisplay'

interface PromptResponse {
  id: string
  createdAt: string
  post: {
    id: string
    title: string | null
    bodyText: string | null
    bodyHtml: string | null
    visibility: string
    createdAt: string
    author: {
      id: string
      username: string
      displayName: string | null
      avatarUrl: string | null
    }
    threadRings: Array<{
      threadRing: {
        id: string
        name: string
        slug: string
      }
    }>
    _count: {
      comments: number
    }
  }
}

interface ThreadRingPromptResponsesProps {
  threadRingSlug: string
  promptId: string
  promptTitle: string
}

export default function ThreadRingPromptResponses({ 
  threadRingSlug,
  promptId,
  promptTitle
}: ThreadRingPromptResponsesProps) {
  const [responses, setResponses] = useState<PromptResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    fetchResponses(1)
  }, [promptId])

  const fetchResponses = async (pageNum: number) => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/threadrings/${threadRingSlug}/prompts/${promptId}/responses?page=${pageNum}&limit=10`
      )
      
      if (!response.ok) throw new Error('Failed to fetch responses')
      
      const data = await response.json()
      
      if (pageNum === 1) {
        setResponses(data.responses)
      } else {
        setResponses(prev => [...prev, ...data.responses])
      }
      
      setHasMore(data.pagination.page < data.pagination.totalPages)
      setPage(pageNum)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load responses')
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    fetchResponses(page + 1)
  }

  const truncateText = (text: string | null, maxLength: number = 200) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (loading && page === 1) {
    return (
      <div className="p-4 text-center text-gray-600">
        Loading responses...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Error: {error}
      </div>
    )
  }

  if (responses.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No responses yet. Be the first to respond to this prompt!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">
        Responses to &quot;{promptTitle}&quot;
      </h3>
      
      {responses.map((response) => (
        <div 
          key={response.id}
          className="border border-gray-200 rounded-lg p-4 hover:border-gray-400 transition-colors"
        >
          <div className="flex items-start gap-3">
            {/* Author Avatar */}
            {response.post.author.avatarUrl ? (
              <img 
                src={response.post.author.avatarUrl} 
                alt={response.post.author.username}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 text-sm">
                  {response.post.author.username[0].toUpperCase()}
                </span>
              </div>
            )}
            
            {/* Post Content */}
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <Link 
                  href={`/resident/${response.post.author.username}`}
                  className="font-semibold text-gray-900 hover:underline"
                >
                  {response.post.author.displayName || response.post.author.username}
                </Link>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(response.post.createdAt))} ago
                </span>
              </div>
              
              {/* User badges */}
              <div className="mb-2">
                <CompactBadgeDisplay 
                  userId={response.post.author.id} 
                  context="posts" 
                  size="small"
                />
              </div>
              
              {response.post.title && (
                <Link 
                  href={`/post/${response.post.id}`}
                  className="text-lg font-medium text-blue-600 hover:text-blue-800 hover:underline block mb-1"
                >
                  {response.post.title}
                </Link>
              )}
              
              {response.post.bodyText && (
                <p className="text-gray-700 mb-2">
                  {truncateText(response.post.bodyText)}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <Link 
                  href={`/post/${response.post.id}`}
                  className="hover:text-gray-700"
                >
                  Read full response →
                </Link>
                
                <span>
                  💬 {response.post._count.comments} comments
                </span>
                
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
            </div>
          </div>
        </div>
      ))}
      
      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More Responses'}
          </button>
        </div>
      )}
    </div>
  )
}