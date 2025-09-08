import { useState, useEffect, useCallback } from 'react'
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
  const [isExpanded, setIsExpanded] = useState(false)

  const fetchActivePrompt = useCallback(async () => {
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
      
      // Handle both old format and new PostRef format
      if (Array.isArray(prompts)) {
        // Find the active prompt or the most recent pinned prompt
        const active = prompts.find((p: ThreadRingPrompt) => p.isActive) || 
                       prompts.find((p: ThreadRingPrompt) => p.isPinned) ||
                       null
        setActivePrompt(active)
      } else {
        // Handle single prompt response
        setActivePrompt(prompts)
      }
    } catch (err) {
      console.error('Error fetching active prompt:', err)
      setError(err instanceof Error ? err.message : 'Failed to load prompt')
    } finally {
      setLoading(false)
    }
  }, [threadRingSlug])

  useEffect(() => {
    fetchActivePrompt()
  }, [threadRingSlug, fetchActivePrompt])

  if (loading) return null // Silent loading
  if (error) return null // Silent error (prompts are optional)
  if (!activePrompt) return null // No active prompt

  const isExpired = activePrompt.endsAt && new Date(activePrompt.endsAt) < new Date()

  return (
    <div className={`tr-active-prompt tr-widget mb-6 rounded-lg border-2 ${
      activePrompt.isActive && !isExpired 
        ? 'tr-prompt-active bg-gradient-to-r from-blue-50 to-purple-50 border-blue-400' 
        : 'tr-prompt-inactive bg-gray-50 border-gray-300'
    }`}>
      {/* Collapsible Header */}
      <div 
        className="tr-prompt-header flex items-center justify-between p-4 cursor-pointer hover:bg-black hover:bg-opacity-5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="tr-prompt-icon text-2xl">💭</span>
          <div>
            <h3 className="tr-prompt-type text-lg font-bold text-gray-900">
              {activePrompt.isActive ? 'Current Challenge' : 'Featured Prompt'}
            </h3>
            <h4 className="tr-prompt-title text-base font-medium text-gray-700">
              {activePrompt.title}
            </h4>
          </div>
          {activePrompt.isActive && !isExpired && (
            <span className="tr-prompt-status tr-prompt-active-badge px-2 py-1 bg-blue-600 text-white text-xs rounded-full animate-pulse">
              Active
            </span>
          )}
          {isExpired && (
            <span className="tr-prompt-status tr-prompt-ended-badge px-2 py-1 bg-gray-500 text-white text-xs rounded-full">
              Ended
            </span>
          )}
        </div>
        
        {/* Expand/Collapse Icon */}
        <div className="flex items-center gap-2">
          <span className="text-purple-600 text-sm font-medium">
            📝 {activePrompt.responseCount} {activePrompt.responseCount === 1 ? 'response' : 'responses'}
          </span>
          <span className={`text-gray-400 text-lg transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}>
            ▼
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="tr-prompt-content px-4 pb-4">
          <p className="tr-prompt-description text-gray-700 mb-4 whitespace-pre-wrap">
            {activePrompt.description}
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm mb-4">
            <span className="text-gray-500">
              ThreadRing Challenge • Started {formatDistanceToNow(new Date(activePrompt.startsAt))} ago
            </span>
            
            {activePrompt.endsAt && !isExpired && (
              <span className="text-orange-600 font-medium">
                ⏰ Ends {formatDistanceToNow(new Date(activePrompt.endsAt), { addSuffix: true })}
              </span>
            )}
            
            <Link 
              href={`/threadrings/${threadRingSlug}/prompts/${activePrompt.id}/responses`}
              className="tr-prompt-link-purple font-medium hover:text-purple-800 hover:underline"
            >
              📝 {activePrompt.responseCount} {activePrompt.responseCount === 1 ? 'response' : 'responses'}
            </Link>
          </div>
          
          {(isMember || activePrompt.responseCount > 0) && (
            <div className="flex flex-wrap gap-3">
              {isMember && !isExpired && (
                <Link 
                  href={`/post/new?promptId=${activePrompt.id}&threadRing=${threadRingSlug}&promptTitle=${encodeURIComponent(activePrompt.title)}`}
                  className="tr-prompt-button-white inline-flex items-center px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors no-underline hover:no-underline"
                >
                  <span className="mr-2">✍️</span>
                  Respond to Challenge
                </Link>
              )}
              
              {activePrompt.responseCount > 0 && (
                <Link 
                  href={`/threadrings/${threadRingSlug}/prompts/${activePrompt.id}/responses`}
                  className="tr-prompt-button-white inline-flex items-center px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors no-underline hover:no-underline"
                >
                  <span className="mr-2">👥</span>
                  View All {activePrompt.responseCount} Responses
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}