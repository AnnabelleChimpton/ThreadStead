import React, { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
// import { ConsentType } from '@prisma/client' // Use local definition to avoid import issues

// Define enum types to match Prisma schema
enum ConsentType {
  ESSENTIAL = 'ESSENTIAL',
  ANALYTICS = 'ANALYTICS',
  MARKETING = 'MARKETING',
  PREFERENCES = 'PREFERENCES'
}

interface ConsentState {
  [ConsentType.ESSENTIAL]: boolean
}

interface CookieConsentBannerProps {
  userId?: string
  onConsentChange?: (consents: ConsentState) => void
}

export default function CookieConsentBanner({
  userId,
  onConsentChange
}: CookieConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if user has already acknowledged
    const hasConsented = localStorage.getItem('threadstead-consent-given')

    if (!hasConsented) {
      setIsVisible(true)
    }
  }, [userId])

  const handleUnderstand = async () => {
    setLoading(true)

    const finalConsents = {
      [ConsentType.ESSENTIAL]: true,
    }

    try {
      if (userId) {
        // Save to database for logged-in users
        const response = await fetch(`/api/consent/manage?userId=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consents: [{
              type: ConsentType.ESSENTIAL,
              granted: true
            }]
          })
        })

        if (!response.ok) {
          // Non-blocking error, just log it
          console.warn('Failed to save consent preference to server')
        }
      }

      // Save to localStorage for future visits
      localStorage.setItem('threadstead-consent-given', 'true')

      // Notify parent component
      onConsentChange?.(finalConsents)

      setIsVisible(false)
    } catch (error) {
      console.error('Failed to save consent preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isVisible) return null

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed bottom-0 left-0 right-0 z-50 bg-nb-paper border-t-2 border-nb-ink-mid"
    >
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
        <p className="flex-1 m-0 text-xs sm:text-sm text-nb-ink">
          We only use cookies to keep you logged in. No tracking, analytics or marketing.
        </p>
        <Button
          variant="secondary"
          onClick={handleUnderstand}
          className="shrink-0 text-xs"
          disabled={loading}
        >
          {loading ? 'Saving…' : 'Got it'}
        </Button>
      </div>
    </div>
  )
}