import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import EnhancedHouseCanvas from './EnhancedHouseCanvas'
import { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG'
import { trackNavigation } from '../../lib/analytics/pixel-homes'

interface HomeDecoration {
  id: string
  decorationType: 'plant' | 'path' | 'feature' | 'seasonal'
  decorationId: string
  variant?: string
  size?: 'small' | 'medium' | 'large'
  x: number
  y: number
  layer: number
}

interface HouseDetailsPopupProps {
  isOpen: boolean
  onClose: () => void
  member: {
    userId: string
    username: string
    displayName?: string
    avatarUrl?: string
    homeConfig: {
      houseTemplate: HouseTemplate
      palette: ColorPalette
      seasonalOptIn: boolean
      houseCustomizations?: {
        windowStyle?: string
        doorStyle?: string
        roofTrim?: string
        wallColor?: string
        roofColor?: string
        trimColor?: string
        windowColor?: string
        detailColor?: string
        houseTitle?: string
        houseDescription?: string
        houseBoardText?: string
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
  const [decorations, setDecorations] = useState<HomeDecoration[]>([])
  const [atmosphere, setAtmosphere] = useState({
    sky: 'sunny' as const,
    weather: 'clear' as const,
    timeOfDay: 'midday' as const
  })

  useEffect(() => {
    if (isOpen && member) {
      // Always load decorations from API to get correct format
      loadDecorations()
      
      // Set atmosphere from member data if available
      if (member.homeConfig.atmosphere) {
        setAtmosphere(member.homeConfig.atmosphere as any)
      }
    }
  }, [isOpen, member])

  const loadDecorations = async () => {
    try {
      const response = await fetch(`/api/home/decorations/load?username=${encodeURIComponent(member.username)}`)
      if (response.ok) {
        const data = await response.json()
        console.log('API decoration data:', data)
        setDecorations(data.decorations || [])
        if (data.atmosphere) {
          setAtmosphere(data.atmosphere)
        }
      }
    } catch (error) {
      console.error('Failed to load decorations:', error)
      // Use fallback decorations from member data if API fails
      if (member.homeConfig.decorations) {
        console.log('Using fallback decorations from member data:', member.homeConfig.decorations)
        setDecorations(member.homeConfig.decorations)
      }
      if (member.homeConfig.atmosphere) {
        setAtmosphere(member.homeConfig.atmosphere as any)
      }
    }
  }

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

  if (!isOpen || !member) return null

  const displayName = member.displayName || member.username
  const houseTitle = member.homeConfig.houseCustomizations?.houseTitle
  const houseDescription = member.homeConfig.houseCustomizations?.houseDescription
  
  // Debug log to check if data is being passed correctly
  console.log(`House Details for ${member.username}:`, {
    houseTitle,
    houseDescription,
    decorationCount: decorations.length,
    hasDecorations: member.homeConfig.hasDecorations
  })

  // Connection indicators
  const connectionLabels = []
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

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={handleBackdropClick}
    >
      <div className="bg-thread-paper rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-thread-sage to-thread-pine text-thread-paper p-6 rounded-t-lg">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-thread-paper hover:text-thread-cream transition-colors text-2xl"
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
                {displayName}
              </h2>
              <p className="text-thread-cream opacity-90 text-lg">
                @{member.username}
              </p>
              
              {/* Activity Status */}
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${member.stats?.isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                <span className="text-sm text-thread-cream opacity-75">
                  {member.stats?.isActive ? 'Active recently' : 'Away'}
                </span>
                {member.homeConfig.decorationCount && member.homeConfig.decorationCount > 0 && (
                  <>
                    <span className="text-thread-cream opacity-50">•</span>
                    <span className="text-sm text-thread-cream opacity-75">
                      {member.homeConfig.decorationCount} decorations
                    </span>
                  </>
                )}
              </div>
              
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
        <div className="p-6">
          {/* House Canvas */}
          <div className="bg-gradient-to-b from-thread-cream to-thread-paper border border-thread-sage rounded-lg p-6 mb-6">
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <EnhancedHouseCanvas
                  template={member.homeConfig.houseTemplate}
                  palette={member.homeConfig.palette}
                  houseCustomizations={(member.homeConfig.houseCustomizations || {}) as HouseCustomizations}
                  decorations={decorations.map(dec => ({
                    id: dec.id,
                    type: dec.decorationType,
                    zone: 'front_yard' as const, // Default zone for popup decorations
                    position: { x: dec.x, y: dec.y, layer: dec.layer },
                    variant: dec.variant,
                    size: dec.size
                  }))}
                  atmosphere={atmosphere}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* Custom House Info */}
          {(houseTitle || houseDescription) && (
            <div className="bg-thread-cream border border-thread-sage rounded-lg p-6 mb-6">
              {houseTitle && (
                <h4 className="text-lg font-headline font-bold text-thread-pine mb-3 text-center">
                  {houseTitle}
                </h4>
              )}
              {houseDescription && (
                <p className="text-thread-sage leading-relaxed text-center">
                  {houseDescription}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleHouseClick}
              className="flex-1 bg-thread-sage text-thread-paper px-6 py-3 rounded-lg font-medium hover:bg-thread-pine transition-colors shadow-sm"
            >
              🏠 Visit Their Home
            </button>
            <button
              onClick={handleProfileClick}
              className="flex-1 bg-thread-paper border border-thread-sage text-thread-sage px-6 py-3 rounded-lg font-medium hover:bg-thread-sage hover:text-thread-paper transition-colors"
            >
              👤 View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}