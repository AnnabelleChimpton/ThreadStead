// components/ProfileBadgeSelector.tsx
import React, { useState, useEffect } from 'react'
import ThreadRing88x31Badge from './ThreadRing88x31Badge'
import { UserBadgePreferences } from '@/pages/api/users/me/badge-preferences'

interface AvailableBadge {
  threadRingId: string
  threadRingSlug: string
  threadRingName: string
  badgeId: string
  badge: {
    title: string
    subtitle?: string
    imageUrl?: string
    templateId?: string
    backgroundColor: string
    textColor: string
  }
}

interface ProfileBadgeSelectorProps {
  onSave?: (preferences: UserBadgePreferences) => void
  className?: string
}

export default function ProfileBadgeSelector({ onSave, className = '' }: ProfileBadgeSelectorProps) {
  const [preferences, setPreferences] = useState<UserBadgePreferences | null>(null)
  const [availableBadges, setAvailableBadges] = useState<AvailableBadge[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load current preferences and available badges
  useEffect(() => {
    loadBadgePreferences()
  }, [])

  const loadBadgePreferences = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users/me/badge-preferences')
      
      if (!response.ok) {
        throw new Error('Failed to load badge preferences')
      }

      const data = await response.json()
      setPreferences(data.preferences)
      setAvailableBadges(data.availableBadges)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load badge preferences')
    } finally {
      setLoading(false)
    }
  }

  const saveBadgePreferences = async () => {
    if (!preferences) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/users/me/badge-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save badge preferences')
      }

      const data = await response.json()
      onSave?.(data.preferences)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save badge preferences')
    } finally {
      setSaving(false)
    }
  }

  const toggleBadgeSelection = (badge: AvailableBadge) => {
    if (!preferences) return

    const isSelected = preferences.selectedBadges.some(b => b.badgeId === badge.badgeId)
    
    if (isSelected) {
      // Remove badge
      setPreferences({
        ...preferences,
        selectedBadges: preferences.selectedBadges.filter(b => b.badgeId !== badge.badgeId)
      })
    } else {
      // Add badge
      const newBadge = {
        threadRingId: badge.threadRingId,
        threadRingSlug: badge.threadRingSlug,
        threadRingName: badge.threadRingName,
        badgeId: badge.badgeId,
        displayOrder: preferences.selectedBadges.length,
        showOnProfile: true,
        showOnPosts: preferences.selectedBadges.length < preferences.maxBadgesOnPosts,
        showOnComments: preferences.selectedBadges.length < preferences.maxBadgesOnComments
      }
      
      setPreferences({
        ...preferences,
        selectedBadges: [...preferences.selectedBadges, newBadge]
      })
    }
  }

  const updateBadgeDisplaySettings = (badgeId: string, field: 'showOnProfile' | 'showOnPosts' | 'showOnComments', value: boolean) => {
    if (!preferences) return

    setPreferences({
      ...preferences,
      selectedBadges: preferences.selectedBadges.map(badge =>
        badge.badgeId === badgeId ? { ...badge, [field]: value } : badge
      )
    })
  }

  const moveBadge = (badgeId: string, direction: 'up' | 'down') => {
    if (!preferences) return

    const badges = [...preferences.selectedBadges].sort((a, b) => a.displayOrder - b.displayOrder)
    const currentIndex = badges.findIndex(b => b.badgeId === badgeId)
    
    if (currentIndex === -1) return
    if (direction === 'up' && currentIndex === 0) return
    if (direction === 'down' && currentIndex === badges.length - 1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    // Swap display orders
    const temp = badges[currentIndex].displayOrder
    badges[currentIndex].displayOrder = badges[newIndex].displayOrder
    badges[newIndex].displayOrder = temp

    setPreferences({
      ...preferences,
      selectedBadges: badges
    })
  }

  if (loading) {
    return (
      <div className={`bg-white border-2 border-gray-300 rounded-lg p-6 ${className}`}>
        <div className="text-center text-gray-600">Loading badge preferences...</div>
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className={`bg-white border-2 border-gray-300 rounded-lg p-6 ${className}`}>
        <div className="text-center text-red-600">Failed to load badge preferences</div>
        {error && <div className="text-sm text-gray-600 mt-2">{error}</div>}
      </div>
    )
  }

  return (
    <div className={`bg-white border-2 border-gray-300 rounded-lg ${className}`}>
      {/* Header */}
      <div className="border-b-2 border-gray-300 p-4 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Badge Display Preferences</h3>
        <p className="text-sm text-gray-600 mt-1">
          Choose which ThreadRing badges to display on your profile and posts.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Global Settings */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">Display Settings</h4>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={preferences.showBadgesOnProfile}
              onChange={(e) => setPreferences({
                ...preferences,
                showBadgesOnProfile: e.target.checked
              })}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Show badges on my profile</span>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Max badges on posts</label>
              <select
                value={preferences.maxBadgesOnPosts}
                onChange={(e) => setPreferences({
                  ...preferences,
                  maxBadgesOnPosts: parseInt(e.target.value)
                })}
                className="mt-1 block w-full rounded border-gray-300 text-sm"
              >
                <option value={0}>None</option>
                <option value={1}>1 badge</option>
                <option value={2}>2 badges</option>
                <option value={3}>3 badges</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Max badges on comments</label>
              <select
                value={preferences.maxBadgesOnComments}
                onChange={(e) => setPreferences({
                  ...preferences,
                  maxBadgesOnComments: parseInt(e.target.value)
                })}
                className="mt-1 block w-full rounded border-gray-300 text-sm"
              >
                <option value={0}>None</option>
                <option value={1}>1 badge</option>
                <option value={2}>2 badges</option>
              </select>
            </div>
          </div>
        </div>

        {/* Available Badges */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-800">Available Badges</h4>
          
          {availableBadges.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>You don&apos;t have any ThreadRing badges yet.</p>
              <p className="text-sm mt-1">Join ThreadRings to collect badges!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableBadges.map((badge) => {
                const isSelected = preferences.selectedBadges.some(b => b.badgeId === badge.badgeId)
                const selectedBadge = preferences.selectedBadges.find(b => b.badgeId === badge.badgeId)
                
                return (
                  <div
                    key={badge.badgeId}
                    className={`border-2 rounded-lg p-4 transition-colors ${
                      isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <ThreadRing88x31Badge
                        title={badge.badge.title}
                        subtitle={badge.badge.subtitle}
                        imageUrl={badge.badge.imageUrl}
                        templateId={badge.badge.templateId}
                        backgroundColor={badge.badge.backgroundColor}
                        textColor={badge.badge.textColor}
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-800 truncate">{badge.threadRingName}</h5>
                        <button
                          onClick={() => toggleBadgeSelection(badge)}
                          className={`mt-1 px-3 py-1 rounded text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {isSelected ? 'Remove' : 'Add'}
                        </button>
                      </div>
                    </div>

                    {isSelected && selectedBadge && (
                      <div className="space-y-2 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Display Order:</span>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => moveBadge(badge.badgeId, 'up')}
                              disabled={selectedBadge.displayOrder === 0}
                              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-gray-100 rounded"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveBadge(badge.badgeId, 'down')}
                              disabled={selectedBadge.displayOrder === preferences.selectedBadges.length - 1}
                              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-gray-100 rounded"
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedBadge.showOnProfile}
                              onChange={(e) => updateBadgeDisplaySettings(badge.badgeId, 'showOnProfile', e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <span>Show on profile</span>
                          </label>
                          
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedBadge.showOnPosts}
                              onChange={(e) => updateBadgeDisplaySettings(badge.badgeId, 'showOnPosts', e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <span>Show on posts</span>
                          </label>
                          
                          <label className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selectedBadge.showOnComments}
                              onChange={(e) => updateBadgeDisplaySettings(badge.badgeId, 'showOnComments', e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <span>Show on comments</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={saveBadgePreferences}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}