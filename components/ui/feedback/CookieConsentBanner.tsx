'use client'

import React, { useState, useEffect } from 'react'
import { ConsentType } from '@prisma/client'

interface ConsentState {
  [ConsentType.ESSENTIAL]: boolean
  [ConsentType.ANALYTICS]: boolean
  [ConsentType.MARKETING]: boolean
  [ConsentType.PREFERENCES]: boolean
}

interface ConsentRecord {
  type: ConsentType
  granted: boolean
  timestamp: string
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
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(false)
  const [consents, setConsents] = useState<ConsentState>({
    [ConsentType.ESSENTIAL]: true,
    [ConsentType.ANALYTICS]: false,
    [ConsentType.MARKETING]: false,
    [ConsentType.PREFERENCES]: false,
  })

  useEffect(() => {
    // Check if user has already made consent choices
    const hasConsented = localStorage.getItem('threadstead-consent-given')

    if (!hasConsented && userId) {
      // Load existing consents from API if user is logged in
      loadUserConsents()
    } else if (!hasConsented) {
      // Show banner for anonymous users
      setIsVisible(true)
    }
  }, [userId])

  const loadUserConsents = async () => {
    if (!userId) return

    try {
      const response = await fetch(`/api/consent/manage?userId=${userId}`)
      const data = await response.json()

      if (data.success && data.consents) {
        const consentState: ConsentState = data.consents.reduce((acc: ConsentState, consent: ConsentRecord) => {
          acc[consent.type] = consent.granted
          return acc
        }, {} as ConsentState)

        setConsents(consentState)

        // If user has previously made choices, don't show banner
        const hasAnyNonDefaultConsent = data.consents.some(
          (c: ConsentRecord) => c.type !== ConsentType.ESSENTIAL && c.granted
        )
        setIsVisible(!hasAnyNonDefaultConsent)
      } else {
        setIsVisible(true)
      }
    } catch (error) {
      console.error('Failed to load consent preferences:', error)
      setIsVisible(true)
    }
  }

  const handleConsentToggle = (type: ConsentType, granted: boolean) => {
    if (type === ConsentType.ESSENTIAL) return // Essential cannot be disabled

    setConsents(prev => ({
      ...prev,
      [type]: granted
    }))
  }

  const saveConsents = async (acceptAll: boolean = false) => {
    setLoading(true)

    const finalConsents = acceptAll ? {
      [ConsentType.ESSENTIAL]: true,
      [ConsentType.ANALYTICS]: true,
      [ConsentType.MARKETING]: true,
      [ConsentType.PREFERENCES]: true,
    } : consents

    try {
      if (userId) {
        // Save to database for logged-in users
        const response = await fetch(`/api/consent/manage?userId=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consents: Object.entries(finalConsents).map(([type, granted]) => ({
              type: type as ConsentType,
              granted
            }))
          })
        })

        if (!response.ok) {
          throw new Error('Failed to save consent preferences')
        }
      }

      // Save to localStorage for future visits
      localStorage.setItem('threadstead-consent-given', 'true')
      localStorage.setItem('threadstead-consent-preferences', JSON.stringify(finalConsents))

      // Apply consent preferences (e.g., enable/disable analytics)
      applyConsentPreferences(finalConsents)

      // Notify parent component
      onConsentChange?.(finalConsents)

      setIsVisible(false)
    } catch (error) {
      console.error('Failed to save consent preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyConsentPreferences = (preferences: ConsentState) => {
    // Apply analytics consent
    if (preferences[ConsentType.ANALYTICS]) {
      // Enable analytics tracking (if implemented)
      console.log('Analytics enabled')
    } else {
      // Disable analytics tracking
      console.log('Analytics disabled')
    }

    // Apply marketing consent
    if (preferences[ConsentType.MARKETING]) {
      // Enable marketing features
      console.log('Marketing enabled')
    } else {
      // Disable marketing features
      console.log('Marketing disabled')
    }

    // Apply preferences consent
    if (preferences[ConsentType.PREFERENCES]) {
      // Enable preference tracking
      console.log('Preferences enabled')
    } else {
      // Disable preference tracking
      console.log('Preferences disabled')
    }
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-black shadow-lg">
      <div className="max-w-6xl mx-auto p-4">
        {!showDetails ? (
          // Simple banner view
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">🍪 Cookie Notice</h3>
              <p className="text-sm text-gray-700">
                We use cookies to enhance your experience. Essential cookies are required for the site to function.
                By continuing, you consent to our use of essential cookies.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 border-2 border-black bg-white hover:bg-gray-100 transition-colors text-sm font-medium"
                disabled={loading}
              >
                Manage Preferences
              </button>
              <button
                onClick={() => saveConsents(true)}
                className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors text-sm font-medium"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Accept All'}
              </button>
              <button
                onClick={() => saveConsents(false)}
                className="px-4 py-2 border-2 border-black bg-white hover:bg-gray-100 transition-colors text-sm font-medium"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Essential Only'}
              </button>
            </div>
          </div>
        ) : (
          // Detailed preferences view
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Cookie Preferences</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Essential Cookies */}
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">Essential Cookies</h4>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">Always On</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Required for authentication, security, and basic site functionality.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="w-4 h-4"
                  />
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <h4 className="font-medium">Analytics Cookies</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Help us understand how users interact with our site to improve performance.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={consents[ConsentType.ANALYTICS]}
                    onChange={(e) => handleConsentToggle(ConsentType.ANALYTICS, e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <h4 className="font-medium">Marketing Cookies</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Used to show relevant content and measure marketing effectiveness.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={consents[ConsentType.MARKETING]}
                    onChange={(e) => handleConsentToggle(ConsentType.MARKETING, e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>
              </div>

              {/* Preferences Cookies */}
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <h4 className="font-medium">Preference Cookies</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Remember your choices and personalize your experience.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={consents[ConsentType.PREFERENCES]}
                    onChange={(e) => handleConsentToggle(ConsentType.PREFERENCES, e.target.checked)}
                    className="w-4 h-4"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={() => saveConsents(false)}
                className="px-6 py-2 border-2 border-black bg-white hover:bg-gray-100 transition-colors font-medium"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Preferences'}
              </button>
              <button
                onClick={() => saveConsents(true)}
                className="px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors font-medium"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Accept All'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}