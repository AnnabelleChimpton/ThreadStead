'use client'

import React, { useState, useEffect } from 'react'

// Define enum types to match Prisma schema
enum ConsentType {
  ESSENTIAL = 'ESSENTIAL',
  ANALYTICS = 'ANALYTICS',
  MARKETING = 'MARKETING',
  PREFERENCES = 'PREFERENCES'
}

enum ConsentAction {
  GRANTED = 'GRANTED',
  WITHDRAWN = 'WITHDRAWN',
  UPDATED = 'UPDATED',
  EXPIRED = 'EXPIRED'
}

interface ConsentRecord {
  type: ConsentType
  granted: boolean
  timestamp: string
}

interface ConsentManagerProps {
  userId: string
}

export default function ConsentManager({ userId }: ConsentManagerProps) {
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadConsents()
  }, [userId])

  const loadConsents = async () => {
    try {
      const response = await fetch(`/api/consent/manage?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setConsents(data.consents || [])
      } else {
        setMessage({ type: 'error', text: 'Failed to load consent preferences' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load consent preferences' })
    } finally {
      setLoading(false)
    }
  }

  const handleConsentChange = (type: ConsentType, granted: boolean) => {
    if (type === ConsentType.ESSENTIAL) return // Essential cannot be changed

    setConsents(prev =>
      prev.map(consent =>
        consent.type === type
          ? { ...consent, granted }
          : consent
      )
    )
  }

  const saveConsents = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/consent/manage?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consents: consents.map(c => ({
            type: c.type,
            granted: c.granted
          }))
        })
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Consent preferences updated successfully' })
        setConsents(data.consents || consents)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update preferences' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update preferences' })
    } finally {
      setSaving(false)
    }
  }

  const withdrawAllConsents = async () => {
    if (!confirm('Are you sure you want to withdraw all non-essential consents? This may limit site functionality.')) {
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/consent/withdraw?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: data.message })
        await loadConsents() // Reload to get updated state
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to withdraw consents' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to withdraw consents' })
    } finally {
      setSaving(false)
    }
  }

  const getConsentDescription = (type: ConsentType) => {
    switch (type) {
      case ConsentType.ESSENTIAL:
        return 'Required for authentication, security, and basic site functionality. Cannot be disabled.'
      case ConsentType.ANALYTICS:
        return 'Help us understand how users interact with our site to improve performance and user experience.'
      case ConsentType.MARKETING:
        return 'Used to show relevant content, measure marketing effectiveness, and personalize advertisements.'
      case ConsentType.PREFERENCES:
        return 'Remember your choices and settings to personalize your experience across visits.'
      default:
        return 'No description available.'
    }
  }

  const getConsentIcon = (type: ConsentType) => {
    switch (type) {
      case ConsentType.ESSENTIAL:
        return '🔒'
      case ConsentType.ANALYTICS:
        return '📊'
      case ConsentType.MARKETING:
        return '🎯'
      case ConsentType.PREFERENCES:
        return '⚙️'
      default:
        return '🍪'
    }
  }

  if (loading) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h3 className="text-xl font-bold mb-4">Cookie & Consent Preferences</h3>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-black p-6">
      <h3 className="text-xl font-bold mb-4">Cookie & Consent Preferences</h3>

      <p className="text-gray-700 mb-6">
        Manage your data processing consents. You can change these at any time.
        Essential cookies are required for the site to function properly.
      </p>

      {message && (
        <div className={`p-4 mb-6 border-2 ${
          message.type === 'success'
            ? 'border-green-500 bg-green-50 text-green-800'
            : 'border-red-500 bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {consents.filter(consent => consent.type !== ConsentType.MARKETING).map((consent) => (
          <div key={consent.type} className="border border-gray-200 p-4 rounded">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getConsentIcon(consent.type)}</span>
                <h4 className="font-semibold capitalize flex items-center gap-2">
                  {consent.type.toLowerCase().replace('_', ' ')} Cookies
                  {consent.type === ConsentType.ESSENTIAL && (
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">Required</span>
                  )}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent.granted}
                    onChange={(e) => handleConsentChange(consent.type, e.target.checked)}
                    disabled={consent.type === ConsentType.ESSENTIAL || saving}
                    className="w-4 h-4 mr-2"
                  />
                  <span className="text-sm font-medium">
                    {consent.granted ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-2">
              {getConsentDescription(consent.type)}
            </p>

            <p className="text-xs text-gray-500">
              Last updated: {new Date(consent.timestamp).toLocaleDateString()} at{' '}
              {new Date(consent.timestamp).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <button
          onClick={saveConsents}
          disabled={saving}
          className="px-6 py-3 bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 transition-colors font-medium"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>

        <button
          onClick={withdrawAllConsents}
          disabled={saving}
          className="px-6 py-3 border-2 border-red-500 text-red-500 hover:bg-red-50 disabled:border-gray-400 disabled:text-gray-400 transition-colors font-medium"
        >
          {saving ? 'Processing...' : 'Withdraw All Non-Essential Consents'}
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded">
        <h4 className="font-medium mb-2">Need help?</h4>
        <p className="text-sm text-gray-600">
          For questions about our data processing practices, please contact our privacy team.
          You can also review our full Privacy Policy for detailed information about how we handle your data.
        </p>
      </div>
    </div>
  )
}