import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

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
  createdBy?: {
    id: string
    handles: Array<{
      handle: string
    }>
    profile: {
      displayName: string | null
    } | null
  }
}

interface ThreadRingActivePromptProps {
  threadRingSlug: string
  isMember?: boolean
}

export default function ThreadRingActivePrompt({ 
  threadRingSlug,
  isMember = false
}: ThreadRingActivePromptProps) {
  const [activePrompt, setActivePrompt] = useState<ThreadRingPrompt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchActivePrompt()
  }, [threadRingSlug])

  const fetchActivePrompt = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/threadrings/${threadRingSlug}/prompts`)
      if (!response.ok) {
        if (response.status === 404) {
          setActivePrompt(null)
          return
        }
        throw new Error('Failed to fetch prompts')
      }
      
      const prompts = await response.json()
      // Find the active prompt or the most recent pinned prompt
      const active = prompts.find((p: ThreadRingPrompt) => p.isActive) || 
                     prompts.find((p: ThreadRingPrompt) => p.isPinned) ||
                     null
      setActivePrompt(active)
    } catch (err) {
      console.error('Error fetching active prompt:', err)
      setError(err instanceof Error ? err.message : 'Failed to load prompt')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null // Silent loading
  if (error) return null // Silent error (prompts are optional)
  if (!activePrompt) return null // No active prompt

  const isExpired = activePrompt.endsAt && new Date(activePrompt.endsAt) < new Date()

  return (
    <div className={`mb-6 p-4 rounded-lg border-2 ${
      activePrompt.isActive && !isExpired 
        ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-400' 
        : 'bg-gray-50 border-gray-300'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💭</span>
            <h3 className="text-lg font-bold text-gray-900">
              {activePrompt.isActive ? 'Current Challenge' : 'Featured Prompt'}
            </h3>
            {activePrompt.isActive && !isExpired && (
              <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full animate-pulse">
                Active
              </span>
            )}
            {isExpired && (
              <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded-full">
                Ended
              </span>
            )}
          </div>
          
          <h4 className="text-xl font-semibold mb-2 text-gray-800">
            {activePrompt.title}
          </h4>
          
          <p className="text-gray-700 mb-3 whitespace-pre-wrap">
            {activePrompt.description}
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-gray-500">
              Posted by {activePrompt.createdBy?.profile?.displayName || activePrompt.createdBy?.handles[0]?.handle || 'Unknown User'}
            </span>
            
            {activePrompt.endsAt && !isExpired && (
              <span className="text-orange-600 font-medium">
                ⏰ Ends {formatDistanceToNow(new Date(activePrompt.endsAt), { addSuffix: true })}
              </span>
            )}
            
            <Link 
              href={`/threadrings/${threadRingSlug}/prompts/${activePrompt.id}/responses`}
              className="text-purple-600 font-medium hover:text-purple-800 hover:underline"
            >
              📝 {activePrompt.responseCount} {activePrompt.responseCount === 1 ? 'response' : 'responses'}
            </Link>
          </div>
        </div>
      </div>
      
      {(isMember || activePrompt.responseCount > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-3">
          {isMember && !isExpired && (
            <Link 
              href={`/post/new?promptId=${activePrompt.id}&threadRing=${threadRingSlug}&promptTitle=${encodeURIComponent(activePrompt.title)}`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span className="mr-2">✍️</span>
              Respond to Challenge
            </Link>
          )}
          
          {activePrompt.responseCount > 0 && (
            <Link 
              href={`/threadrings/${threadRingSlug}/prompts/${activePrompt.id}/responses`}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <span className="mr-2">👥</span>
              View All {activePrompt.responseCount} Responses
            </Link>
          )}
        </div>
      )}
    </div>
  )
}