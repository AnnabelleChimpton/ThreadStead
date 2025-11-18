import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/router'
import EnhancedHouseCanvas from './EnhancedHouseCanvas'
import { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG'
import { trackNavigation } from '../../lib/analytics/pixel-homes'
import UserMention from '@/components/ui/navigation/UserMention'
import useIsMobile from '../../hooks/useIsMobile'

interface HomeDecoration {
  id: string
  decorationType: 'plant' | 'path' | 'feature' | 'seasonal'
  decorationId: string
  variant?: string
  size?: 'small' | 'medium' | 'large'
  x: number
  y: number
  layer: number
  renderSvg?: string | null
}

interface HouseDetailsPopupProps {
  isOpen: boolean
  onClose: () => void
  member: {
    userId: string
    username: string
    displayName?: string | null
    avatarUrl?: string | null
    homeConfig: {
      houseTemplate: string
      palette: string
      seasonalOptIn: boolean
      houseCustomizations?: {
        windowStyle?: string | null
        doorStyle?: string | null
        roofTrim?: string | null
        wallColor?: string | null
        roofColor?: string | null
        trimColor?: string | null
        windowColor?: string | null
        detailColor?: string | null
        houseTitle?: string | null
        houseDescription?: string | null
        houseBoardText?: string | null
      }
      atmosphere?: {
        sky: string
        weather: string
        timeOfDay: string
      }
      hasDecorations?: boolean
      decorationCount?: number
      decorations?: HomeDecoration[]
    }
    stats?: {
      isActive: boolean
    }
    connections?: {
      mutualRings?: number
      mutualFriends?: number
      isFollowing?: boolean
      isFollower?: boolean
    }
  }
}

export default function HouseDetailsPopup({ isOpen, onClose, member }: HouseDetailsPopupProps) {
  const router = useRouter()
  const isMobile = useIsMobile(768)
  const [decorations, setDecorations] = useState<HomeDecoration[]>([])
  const [atmosphere, setAtmosphere] = useState({
    sky: 'sunny' as const,
    weather: 'clear' as const,
    timeOfDay: 'midday' as const
  })
  const [profileData, setProfileData] = useState<{
    bio: string | null
    stats: {
      followers: number
      following: number
      posts: number
      mutualFriends: number
    }
  } | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [dragStartY, setDragStartY] = useState<number | null>(null)
  const [dragCurrentY, setDragCurrentY] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Reset decorations whenever member changes (using userId as dependency for reliable detection)
  useEffect(() => {
    if (member) {
      setDecorations([])
    }
  }, [member?.userId])

  useEffect(() => {
    if (isOpen && member) {
      // Ensure clean state - double safety net
      setDecorations([])
      
      // Use server-side decorations first if available
      if (member.homeConfig.decorations && member.homeConfig.decorations.length > 0) {
        setDecorations(member.homeConfig.decorations)
      } else {
        // Fallback to API only if no server data
        loadDecorations()
      }
      
      // Set atmosphere from member data if available
      if (member.homeConfig.atmosphere) {
        setAtmosphere(member.homeConfig.atmosphere as any)
      }
    }
  }, [isOpen, member?.userId])

  const loadDecorations = async () => {
    try {
      const response = await fetch(`/api/home/decorations/load?username=${encodeURIComponent(member.username)}`)
      if (response.ok) {
        const data = await response.json()
        setDecorations(data.decorations || [])
        if (data.atmosphere) {
          setAtmosphere(data.atmosphere)
        }
      }
    } catch (error) {
      console.error('Failed to load decorations:', error)
      // Use fallback decorations from member data if API fails
      if (member.homeConfig.decorations) {
        setDecorations(member.homeConfig.decorations)
      }
      if (member.homeConfig.atmosphere) {
        setAtmosphere(member.homeConfig.atmosphere as any)
      }
    }
  }

  // Load user profile data
  useEffect(() => {
    if (isOpen && member) {
      setProfileLoading(true)
      fetch(`/api/users/${encodeURIComponent(member.username)}/quick-view`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setProfileData({
              bio: data.data.bio,
              stats: data.data.stats
            })
          }
        })
        .catch(error => {
          console.error('Failed to load profile data:', error)
        })
        .finally(() => {
          setProfileLoading(false)
        })
    }
  }, [isOpen, member?.userId])

  const handleProfileClick = () => {
    trackNavigation('pixel_home', 'profile', member.username)
    router.push(`/resident/${member.username}`)
    onClose()
  }

  const handleHouseClick = () => {
    trackNavigation('pixel_home', 'pixel_home', member.username)
    router.push(`/home/${member.username}`)
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Drag handlers for bottom sheet
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return
    const target = e.target as HTMLElement
    // Only allow dragging from the handle or header area
    if (target.closest('.bottom-sheet-handle') || target.closest('.drag-handle-area')) {
      setDragStartY(e.touches[0].clientY)
      setIsDragging(true)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || dragStartY === null || !isDragging) return

    const currentY = e.touches[0].clientY
    const deltaY = currentY - dragStartY

    // Only allow dragging down
    if (deltaY > 0) {
      setDragCurrentY(deltaY)
      // Prevent pull-to-refresh when dragging the sheet
      e.preventDefault()
    }
  }

  const handleTouchEnd = () => {
    if (!isMobile || dragStartY === null) return

    const threshold = 100 // Close if dragged down more than 100px

    if (dragCurrentY !== null && dragCurrentY > threshold) {
      onClose()
    }

    // Reset drag state
    setDragStartY(null)
    setDragCurrentY(null)
    setIsDragging(false)
  }

  // Prevent pull-to-refresh when bottom sheet is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      // Prevent overscroll/pull-to-refresh
      document.body.style.overscrollBehavior = 'none'

      return () => {
        document.body.style.overscrollBehavior = 'auto'
      }
    }
  }, [isOpen, isMobile])

  if (!isOpen || !member) return null

  const displayName = member.displayName || member.username
  const houseTitle = member.homeConfig.houseCustomizations?.houseTitle
  const houseDescription = member.homeConfig.houseCustomizations?.houseDescription
  const houseBoardText = member.homeConfig.houseCustomizations?.houseBoardText

  // Connection indicators
  const connectionLabels: string[] = []
  if (member.connections?.mutualRings && member.connections.mutualRings > 0) {
    connectionLabels.push(`${member.connections.mutualRings} mutual rings`)
  }
  if (member.connections?.mutualFriends && member.connections.mutualFriends > 0) {
    connectionLabels.push(`${member.connections.mutualFriends} mutual friends`)
  }
  if (member.connections?.isFollowing) {
    connectionLabels.push('following')
  }
  if (member.connections?.isFollower) {
    connectionLabels.push('follows you')
  }

  // Only render portal on client-side
  if (typeof document === 'undefined') {
    return null
  }

  // Content component (shared between mobile and desktop)
  const ContentSection = () => (
    <>
      {/* Header */}
      <div className="relative bg-gradient-to-r from-thread-sage to-thread-pine text-thread-paper p-6 rounded-t-lg drag-handle-area">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-thread-paper hover:text-thread-cream transition-colors text-3xl sm:text-2xl min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            ×
          </button>
          
          {/* User Profile Section */}
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={displayName}
                  className="w-16 h-16 rounded-full border-2 border-thread-paper shadow-lg"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-thread-paper bg-opacity-20 flex items-center justify-center border-2 border-thread-paper">
                  <span className="text-2xl font-bold text-thread-paper">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-headline font-bold text-thread-paper mb-1">
                <UserMention
                  username={member.username}
                  displayName={displayName}
                  className="text-thread-paper"
                />
              </h2>
              <p className="text-thread-cream opacity-90 text-lg">
                @{member.username}
              </p>
              
              {/* Connection Labels */}
              {connectionLabels.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {connectionLabels.map((label, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-thread-paper bg-opacity-20 text-xs rounded-full text-thread-cream"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* House Display */}
        <div className="p-2 sm:p-6">
          {/* House Canvas - Fits mobile screen width */}
          <div className="bg-gradient-to-b from-thread-cream to-thread-paper border border-thread-sage rounded-lg p-2 sm:p-6 mb-4">
            <div className="flex justify-center overflow-visible">
              <div className="w-full max-w-full sm:max-w-[500px]">
                <EnhancedHouseCanvas
                  template={member.homeConfig.houseTemplate as any}
                  palette={member.homeConfig.palette as any}
                  houseCustomizations={(member.homeConfig.houseCustomizations || {}) as HouseCustomizations}
                  decorations={(() => {
                    return decorations.map(dec => ({
                      id: dec.decorationId + '_' + Date.now(),
                      decorationId: dec.decorationId,
                      type: dec.decorationType,
                      zone: 'front_yard' as const,
                      position: { x: dec.x, y: dec.y, layer: dec.layer },
                      variant: dec.variant,
                      size: dec.size,
                      renderSvg: dec.renderSvg ?? undefined
                    }))
                  })()}
                  atmosphere={atmosphere}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* House Description - Show first as it's specific to this view */}
          {(houseDescription || houseBoardText) && (
            <div className="bg-gradient-to-br from-thread-cream to-thread-paper border-2 border-thread-sage rounded-lg p-4 mb-4 shadow-sm">
              <h4 className="text-sm font-semibold text-thread-pine mb-3 flex items-center gap-2">
                <span>🏠</span>
                <span>About This Home</span>
              </h4>
              {houseDescription && (
                <p className="text-gray-700 leading-relaxed text-sm mb-3 whitespace-pre-wrap">
                  {houseDescription}
                </p>
              )}
              {houseBoardText && (
                <div className="mt-3 pt-3 border-t border-thread-sage/30">
                  <p className="text-gray-600 italic text-sm leading-relaxed whitespace-pre-wrap">
                    &ldquo;{houseBoardText}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}

          {/* User Bio */}
          {profileData?.bio && (
            <div className="bg-thread-cream border border-thread-sage rounded-lg p-4 mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Bio</h4>
              <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                {profileData.bio}
              </p>
            </div>
          )}

          {/* User Stats */}
          {profileData && !profileLoading && (
            <div className="bg-thread-cream border border-thread-sage rounded-lg p-4 mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Profile Stats</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col items-center p-3 bg-white rounded-lg">
                  <span className="text-2xl font-bold text-thread-pine">{profileData.stats.followers}</span>
                  <span className="text-xs text-gray-600 mt-1">Followers</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-white rounded-lg">
                  <span className="text-2xl font-bold text-thread-pine">{profileData.stats.following}</span>
                  <span className="text-xs text-gray-600 mt-1">Following</span>
                </div>
                <div className="flex flex-col items-center p-3 bg-white rounded-lg">
                  <span className="text-2xl font-bold text-thread-pine">{profileData.stats.posts}</span>
                  <span className="text-xs text-gray-600 mt-1">Posts</span>
                </div>
                {profileData.stats.mutualFriends > 0 && (
                  <div className="flex flex-col items-center p-3 bg-white rounded-lg">
                    <span className="text-2xl font-bold text-thread-pine">{profileData.stats.mutualFriends}</span>
                    <span className="text-xs text-gray-600 mt-1">Mutual Friends</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connection Details - Enhanced */}
          {connectionLabels.length > 0 && (
            <div className="bg-thread-cream border border-thread-sage rounded-lg p-4 mb-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Your Connection</h4>
              <div className="flex flex-wrap gap-2">
                {connectionLabels.map((label, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-thread-sage bg-opacity-10 text-thread-sage text-xs rounded-full border border-thread-sage font-medium"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons - Improved spacing */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleHouseClick}
              className="flex-1 min-h-[48px] bg-thread-sage text-thread-paper px-6 py-3 rounded-lg font-semibold hover:bg-thread-pine transition-colors shadow-sm text-sm"
            >
              🏠 Visit Their Home
            </button>
            <button
              onClick={handleProfileClick}
              className="flex-1 min-h-[48px] bg-thread-paper border-2 border-thread-sage text-thread-sage px-6 py-3 rounded-lg font-semibold hover:bg-thread-sage hover:text-thread-paper transition-colors text-sm"
            >
              👤 View Profile
            </button>
          </div>
        </div>
    </>
  )

  // Render mobile bottom sheet or desktop modal
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`${isMobile ? 'bottom-sheet-backdrop' : 'fixed inset-0 bg-thread-cream/30 backdrop-blur-sm z-[99999] flex items-center justify-center p-2 sm:p-4'} ${isOpen ? 'visible' : ''}`}
        onClick={handleBackdropClick}
      />

      {/* Modal/Bottom Sheet Container */}
      {isMobile ? (
        <div
          className={`mobile-bottom-sheet ${isOpen ? 'open' : ''} ${isDragging ? 'dragging' : ''}`}
          style={{
            transform: dragCurrentY !== null && dragCurrentY > 0
              ? `translateY(${dragCurrentY}px)`
              : undefined,
            transition: isDragging ? 'none' : undefined
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="bottom-sheet-handle drag-handle-area" />
          <div className="bottom-sheet-content">
            <ContentSection />
          </div>
        </div>
      ) : (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 pointer-events-none"
          onClick={handleBackdropClick}
        >
          <div
            className="bg-thread-paper rounded-lg shadow-2xl max-w-full sm:max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ContentSection />
          </div>
        </div>
      )}
    </>,
    document.body
  )
}