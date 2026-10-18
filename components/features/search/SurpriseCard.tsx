import { useState } from 'react'
import Link from 'next/link'
import { PixelIcon } from '@/components/ui/PixelIcon'
import { buttonClasses } from '@/components/ui/ButtonLink'
import type { SurprisePick } from '@/lib/search/discover'
import { HouseThumbnail, homeSubtitle } from './ResultCards'

/**
 * Surprise Me: shows a random home, ring or indie site as a card first, so
 * nobody gets thrown off the site without seeing where they're going.
 */
export default function SurpriseCard({ className = '' }: { className?: string }) {
  const [pick, setPick] = useState<SurprisePick | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')

  const roll = async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/search/surprise')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      setPick(body.pick ?? null)
      setStatus(body.pick ? 'idle' : 'empty')
    } catch (e) {
      console.error('Surprise failed:', e)
      setStatus('error')
    }
  }

  const kindLabel = pick?.kind === 'home' ? 'A home' : pick?.kind === 'ring' ? 'A ring' : 'An indie site'

  return (
    <div className={className}>
      {!pick && (
        <button type="button" onClick={roll} disabled={status === 'loading'} className={`${buttonClasses('secondary')} inline-flex items-center gap-1.5`}>
          <PixelIcon name="dice" size={16} />
          <span>{status === 'loading' ? 'Picking…' : 'Surprise me'}</span>
        </button>
      )}

      <div aria-live="polite">
        {status === 'empty' && <p className="text-sm text-nb-ink-mid mt-2">Nothing to pick from yet.</p>}
        {status === 'error' && <p className="text-sm text-nb-ink-mid mt-2">That didn’t work. Try again in a minute.</p>}

        {pick && (
          <div className="thread-module p-4">
            <span className="thread-label block mb-2">{kindLabel}</span>
            <div className="flex items-start gap-3">
              {pick.home && <HouseThumbnail house={pick.home.house} className="w-20 h-16" />}
              {pick.ring?.badgeImageUrl && (
                <img src={pick.ring.badgeImageUrl} alt="" width={88} height={31} className="shrink-0 mt-1" style={{ imageRendering: 'pixelated' }} />
              )}
              <div className="min-w-0">
                <span className="block font-bold text-nb-ink text-lg break-words">{pick.title}</span>
                <span className="block text-sm text-nb-ink-mid">
                  {pick.home
                    ? homeSubtitle(pick.title, pick.home)
                    : pick.ring
                      ? `${pick.ring.memberCount} ${pick.ring.memberCount === 1 ? 'member' : 'members'}`
                      : pick.domain}
                </span>
                {pick.description && <span className="block text-sm text-nb-ink mt-1 line-clamp-3 break-words">{pick.description}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {pick.external ? (
                <a href={pick.url} target="_blank" rel="noopener noreferrer" className={`${buttonClasses('primary', 'sm')} inline-flex items-center gap-1.5`}>
                  <span>Visit {pick.domain}</span>
                  <PixelIcon name="external-link" size={14} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <Link href={pick.url} className={buttonClasses('primary', 'sm')}>
                  {pick.kind === 'home' ? 'Visit this home' : 'Open this ring'}
                </Link>
              )}
              <button type="button" onClick={roll} disabled={status === 'loading'} className={`${buttonClasses('secondary', 'sm')} inline-flex items-center gap-1.5`}>
                <PixelIcon name="dice" size={14} />
                <span>{status === 'loading' ? 'Picking…' : 'Another one'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
