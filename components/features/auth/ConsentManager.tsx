'use client'

import React, { useState, useEffect } from 'react'
import { PixelIcon } from '@/components/ui/PixelIcon'
import { useConfirm } from '@/contexts/ConfirmContext'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'

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
  const confirm = useConfirm()
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
        setMessage({ type: 'success', text: 'Consent preferences saved.' })
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
    if (!(await confirm({ title: 'Withdraw all non-essential consents?', message: 'This may limit site functionality.', confirmText: 'Withdraw' }))) {
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
        return 'Required for authentication to keep you logged in. We do not use any other cookies.'
      default:
        return ''
    }
  }

  const getConsentIcon = (type: ConsentType) => {
    switch (type) {
      case ConsentType.ESSENTIAL:
        return <PixelIcon name="lock" size={20} />
      default:
        return <PixelIcon name="archive" size={20} />
    }
  }

  if (loading) {
    return (
      <div className="bg-white border-2 border-nb-ink-mid p-6">
        <h3 className="text-xl font-bold mb-4">Cookie & Consent Preferences</h3>
        <LoadingSpinner className="py-4" />
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-nb-ink-mid p-6">
      <h3 className="text-xl font-bold mb-4">Cookie & Consent Preferences</h3>

      <p className="text-nb-ink mb-6">
        We only use cookies for authentication. No other cookies are used.
      </p>

      {message && (
        <div className={`p-4 mb-6 border-2 ${message.type === 'success'
            ? 'border-green-500 border-2 border-dotted border-nb-ink-mid/60 rounded-md text-nb-ink'
            : 'border-red-500 bg-red-50 text-red-800'
          }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div className="border border-nb-ink-mid/40 p-4 rounded">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span>{getConsentIcon(ConsentType.ESSENTIAL)}</span>
              <h4 className="font-semibold capitalize flex items-center gap-2">
                Authentication Cookies
                <span className="thread-button-secondary btn btn--secondary text-xs">Required</span>
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center cursor-not-allowed opacity-50">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="w-4 h-4 mr-2"
                />
                <span className="text-sm font-medium">
                  Enabled
                </span>
              </label>
            </div>
          </div>

          <p className="text-sm text-nb-ink-mid mb-2">
            {getConsentDescription(ConsentType.ESSENTIAL)}
          </p>
        </div>
      </div>
    </div>
  )
}