// components/ProfileBadgeSelector.tsx
import React, { useState, useEffect } from 'react'
import ThreadRing88x31Badge from '../threadring/ThreadRing88x31Badge'
import { UserBadgePreferences } from '@/pages/api/users/me/badge-preferences'
import { csrfFetch } from '@/lib/api/client/csrf-fetch'

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

      const response = await csrfFetch('/api/users/me/badge-preferences', {
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
    <div className={`bg-white border border-black rounded-none shadow-[3px_3px_0_#000] ${className}`}>
      {/* Header */}
      <div className="border-b border-black p-6 bg-yellow-50">
        <h3 className="text-xl font-bold text-black mb-2">🏆 Your ThreadRing Badges</h3>
        <p className="text-gray-700 mb-3">
          You have <strong>{availableBadges.length}</strong> badge{availableBadges.length !== 1 ? 's' : ''} from ThreadRings you&apos;ve joined.
        </p>
        <p className="text-sm text-gray-600">
          Choose which badges to display and where they should appear.
        </p>
      </div>

      <div className="p-6 space-y-8">
        {/* Global Settings */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded space-y-4">
          <h4 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <span>⚙️</span>
            Display Settings
          </h4>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={preferences.showBadgesOnProfile}
                onChange={(e) => setPreferences({
                  ...preferences,
                  showBadgesOnProfile: e.target.checked
                })}
                className="w-4 h-4 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">Show badges on my profile page</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Max badges on posts</label>
                <select
                  value={preferences.maxBadgesOnPosts}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    maxBadgesOnPosts: parseInt(e.target.value)
                  })}
                  className="w-full border border-black p-2 bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>None</option>
                  <option value={1}>1 badge</option>
                  <option value={2}>2 badges</option>
                  <option value={3}>3 badges</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2">Max badges on comments</label>
                <select
                  value={preferences.maxBadgesOnComments}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    maxBadgesOnComments: parseInt(e.target.value)
                  })}
                  className="w-full border border-black p-2 bg-white rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>None</option>
                  <option value={1}>1 badge</option>
                  <option value={2}>2 badges</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* All Your Badges */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span>🏆</span>
              All Your Badges ({availableBadges.length})
            </h4>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-green-700">
                {preferences.selectedBadges.filter(b => b.showOnProfile).length}
              </span> showing on profile
            </div>
          </div>
          
          {availableBadges.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded">
              <div className="text-6xl mb-4">🏆</div>
              <p className="text-lg font-medium text-gray-700 mb-2">No badges yet!</p>
              <p className="text-gray-500">Join Rings to collect badges and show them off here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableBadges.map((badge) => {
                const isSelected = preferences.selectedBadges.some(b => b.badgeId === badge.badgeId)
                const selectedBadge = preferences.selectedBadges.find(b => b.badgeId === badge.badgeId)
                
                return (
                  <div
                    key={badge.badgeId}
                    className={`border-2 border-black rounded-none p-4 transition-all shadow-[2px_2px_0_#000] ${
                      isSelected ? 'bg-green-50 border-green-600' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
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
                          <h5 className="font-bold text-gray-900 text-lg">{badge.threadRingName}</h5>
                          <p className="text-sm text-gray-600">{badge.badge.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isSelected && (
                          <div className="text-green-700 text-sm font-medium flex items-center gap-1">
                            <span>✓</span>
                            Selected
                          </div>
                        )}
                        <button
                          onClick={() => toggleBadgeSelection(badge)}
                          className={`px-4 py-2 border border-black font-medium transition-all shadow-[1px_1px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none ${
                            isSelected
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          }`}
                        >
                          {isSelected ? 'Hide Badge' : 'Show Badge'}
                        </button>
                      </div>
                    </div>

                    {isSelected && selectedBadge && (
                      <div className="bg-white border border-gray-200 rounded p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">Display Order:</span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => moveBadge(badge.badgeId, 'up')}
                              disabled={selectedBadge.displayOrder === 0}
                              className="px-3 py-1 text-sm border border-black bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-gray-100 font-medium shadow-[1px_1px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[1px_1px_0_#000]"
                            >
                              ↑ Move Up
                            </button>
                            <button
                              onClick={() => moveBadge(badge.badgeId, 'down')}
                              disabled={selectedBadge.displayOrder === preferences.selectedBadges.length - 1}
                              className="px-3 py-1 text-sm border border-black bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-gray-100 font-medium shadow-[1px_1px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[1px_1px_0_#000]"
                            >
                              ↓ Move Down
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <h6 className="font-medium text-gray-800 mb-2">Where should this badge appear?</h6>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <label className="flex items-center space-x-3 p-2 border border-gray-200 rounded hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={selectedBadge.showOnProfile}
                                onChange={(e) => updateBadgeDisplaySettings(badge.badgeId, 'showOnProfile', e.target.checked)}
                                className="w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium">👤 Profile</span>
                            </label>
                            
                            <label className="flex items-center space-x-3 p-2 border border-gray-200 rounded hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={selectedBadge.showOnPosts}
                                onChange={(e) => updateBadgeDisplaySettings(badge.badgeId, 'showOnPosts', e.target.checked)}
                                className="w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium">📝 Posts</span>
                            </label>
                            
                            <label className="flex items-center space-x-3 p-2 border border-gray-200 rounded hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={selectedBadge.showOnComments}
                                onChange={(e) => updateBadgeDisplaySettings(badge.badgeId, 'showOnComments', e.target.checked)}
                                className="w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium">💬 Comments</span>
                            </label>
                          </div>
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
        <div className="flex justify-center pt-6 border-t border-black">
          <button
            onClick={saveBadgePreferences}
            disabled={saving}
            className="px-8 py-3 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[3px_3px_0_#000] font-bold text-lg transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#000] disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_#000]"
          >
            {saving ? '💾 Saving...' : '💾 Save Badge Preferences'}
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