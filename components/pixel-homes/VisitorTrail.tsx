import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface Visitor {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
  visitedAt: string
}

interface VisitorTrailProps {
  username: string
  className?: string
}

export default function VisitorTrail({ username, className = '' }: VisitorTrailProps) {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)

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
    const recordVisit = async () => {
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

    recordVisit()
  }, [username])

  if (loading || visitors.length === 0) {
    return null
  }

  return (
    <div className={`visitor-trail absolute ${className}`}>
      {/* Recent Visitors Container - positioned near the house */}
      <div className="flex flex-col items-end space-y-2">
        {/* Visitors Label */}
        <div className="text-xs text-thread-sage bg-thread-paper bg-opacity-95 px-3 py-1.5 rounded-lg shadow-md border border-thread-sage border-opacity-20">
          👥 Recent visitors
        </div>

        {/* Visitor Avatars */}
        <div className="flex items-center space-x-2">
          {visitors.map((visitor, index) => (
            <Link
              key={visitor.id}
              href={`/resident/${visitor.username}`}
              className="group relative transform transition-all duration-300 hover:scale-125 hover:-translate-y-1"
              style={{
                // Stagger the avatars with slight z-index and position variations
                zIndex: visitors.length - index,
                transform: `translateY(${index * -3}px) translateX(${index * -6}px)`,
                animation: `visitor-fade-in 0.6s ease-out ${index * 0.15}s both`
              }}
              title={`${visitor.displayName || visitor.username} visited ${getTimeAgo(visitor.visitedAt)}`}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border-3 border-white shadow-lg bg-thread-cream group-hover:border-thread-sage group-hover:shadow-xl transition-all duration-300">
                {visitor.avatarUrl ? (
                  <img
                    src={visitor.avatarUrl}
                    alt={`${visitor.displayName || visitor.username}'s avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-thread-pine font-bold text-xs bg-gradient-to-br from-thread-cream to-thread-sage">
                    {(visitor.displayName || visitor.username).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:translate-y-1">
                <div className="bg-gradient-to-br from-thread-charcoal to-thread-pine text-thread-paper text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-xl border border-thread-sage border-opacity-30">
                  <div className="font-medium">{visitor.displayName || `@${visitor.username}`}</div>
                  <div className="text-thread-sage text-[10px] mt-0.5">
                    visited {getTimeAgo(visitor.visitedAt)}
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-thread-charcoal"></div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Visit counter */}
        {visitors.length > 0 && (
          <div className="text-xs text-thread-sage bg-thread-paper bg-opacity-80 px-2 py-1 rounded-md shadow-sm border border-thread-sage border-opacity-10">
            {visitors.length} recent {visitors.length === 1 ? 'visitor' : 'visitors'}
          </div>
        )}
      </div>

      {/* CSS for fade-in animation */}
      <style jsx>{`
        @keyframes visitor-fade-in {
          from {
            opacity: 0;
            transform: translateY(15px) scale(0.7) rotate(-5deg);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0deg);
          }
        }

        .visitor-trail {
          /* Subtle floating animation */
          animation: visitor-float 4s ease-in-out infinite;
        }

        @keyframes visitor-float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
        }
      `}</style>
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