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
  /** Record this page view as a visit (everyone but the owner). Signed-in
   *  visitors who show in trails join the trail; everyone else only adds
   *  to the quiet count, which keeps nothing about them. */
  recordVisit?: boolean
  className?: string
}

export default function VisitorTrail({ username, recordVisit = false, className = '' }: VisitorTrailProps) {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [otherVisits, setOtherVisits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedVisitorUsername, setSelectedVisitorUsername] = useState<string | null>(null)

  // Record this visit first, so the trail and count that follow include it
  useEffect(() => {
    let alive = true
    const load = async () => {
      if (recordVisit) {
        try {
          await fetch(`/api/home/${encodeURIComponent(username)}/visitors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
        } catch (error) {
          // Not critical: the trail still loads
          console.debug('Visit tracking failed:', error)
        }
      }
      try {
        const response = await fetch(`/api/home/${encodeURIComponent(username)}/visitors`)
        if (response.ok && alive) {
          const data = await response.json()
          setVisitors(data.visitors || [])
          setOtherVisits(typeof data.otherVisits === 'number' ? data.otherVisits : 0)
        }
      } catch (error) {
        console.error('Failed to fetch visitors:', error)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [username, recordVisit])

  if (loading || (visitors.length === 0 && otherVisits === 0)) {
    return null
  }

  const visitWord = (n: number) => `${n} ${n === 1 ? 'visit' : 'visits'}`

  return (
    // One plain line in normal flow, under the scene (never over it)
    <div className={`visitor-trail flex flex-wrap items-center gap-2 text-sm text-nb-ink-mid ${className}`}>
      {visitors.length === 0 ? (
        <span>{visitWord(otherVisits)} this week.</span>
      ) : (
        <span>Stopped by recently:</span>
      )}
      {visitors.length > 0 && (
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
      )}
      {visitors.length > 0 && otherVisits > 0 && (
        <span>and {otherVisits} other {otherVisits === 1 ? 'visit' : 'visits'} this week.</span>
      )}

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