import React, { useEffect, useState } from 'react'
import UserQuickView from '@/components/ui/feedback/UserQuickView'

interface Visitor {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
  visitedAt: string
}

interface VisitorTrailProps {
  username: string
  /** Record this page view as a visit. Only for a signed-in visitor who isn't
   *  the owner; signed out, the POST can only 401. */
  recordVisit?: boolean
  className?: string
}

export default function VisitorTrail({ username, recordVisit = false, className = '' }: VisitorTrailProps) {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVisitorUsername, setSelectedVisitorUsername] = useState<string | null>(null)

  useEffect(() => {
    const fetchVisitors = async () => {
      try {
        const response = await fetch(`/api/home/${username}/visitors`)
        if (response.ok) {
          const data = await response.json()
          setVisitors(data.visitors || [])
        }
      } catch (error) {
        console.error('Failed to fetch visitors:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVisitors()
  }, [username])

  // Record the current user's visit when component mounts
  useEffect(() => {
    if (!recordVisit) return
    const postVisit = async () => {
      try {
        await fetch(`/api/home/${username}/visitors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      } catch (error) {
        // Silently fail - visit tracking is not critical
        console.debug('Visit tracking failed:', error)
      }
    }

    postVisit()
  }, [username, recordVisit])

  if (loading || visitors.length === 0) {
    return null
  }

  return (
    // One plain line in normal flow, under the scene (never over it)
    <div className={`visitor-trail flex flex-wrap items-center gap-2 text-sm text-nb-ink-mid ${className}`}>
      <span>Stopped by recently:</span>
      <ul className="flex items-center gap-1.5">
        {visitors.map((visitor) => {
          const name = visitor.displayName || `@${visitor.username}`
          return (
            <li key={visitor.id}>
              <button
                type="button"
                onClick={() => setSelectedVisitorUsername(visitor.username)}
                className="ts-bare block w-8 h-8 rounded-full overflow-hidden border border-thread-sage bg-thread-cream p-0 cursor-pointer"
                title={`${name}, ${getTimeAgo(visitor.visitedAt)}`}
                aria-label={`${name}, ${getTimeAgo(visitor.visitedAt)}`}
              >
                {visitor.avatarUrl ? (
                  <img src={visitor.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span aria-hidden="true" className="w-full h-full flex items-center justify-center text-thread-pine font-bold text-xs">
                    {name.replace(/^@/, '').charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {/* User Quick View Modal */}
      {selectedVisitorUsername && (
        <UserQuickView
          username={selectedVisitorUsername}
          isOpen={!!selectedVisitorUsername}
          onClose={() => setSelectedVisitorUsername(null)}
        />
      )}
    </div>
  )
}

function getTimeAgo(isoString: string): string {
  const now = new Date()
  const visitTime = new Date(isoString)
  const diffMs = now.getTime() - visitTime.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMins < 1) {
    return 'just now'
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else {
    return visitTime.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    })
  }
}