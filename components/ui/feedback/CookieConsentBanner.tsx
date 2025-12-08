import React, { useState, useEffect } from 'react'
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-black shadow-lg">
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">🍪 Cookie Notice</h3>
            <p className="text-sm text-gray-700">
              We only use cookies for authentication to keep you logged in and secure.
              We do not use any tracking, analytics, or marketing cookies.
            </p>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={handleUnderstand}
              className="px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors text-sm font-medium rounded-md"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'I Understand'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}