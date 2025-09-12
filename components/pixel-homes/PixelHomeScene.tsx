import React, { useState, useEffect } from 'react'
import InteractiveHouseSVG from './InteractiveHouseSVG'
import { HouseTemplate, ColorPalette } from './HouseSVG'
import { DoorHotspot, MailboxHotspot, ThreadbookHotspot, FlagHotspot } from './Hotspot'
import VisitorTrail from './VisitorTrail'
import { trackHouseLoad, trackHotspotClick } from '../../lib/analytics/pixel-homes'

interface PixelHomeSceneProps {
  template: HouseTemplate
  palette: ColorPalette
  username: string
  onDoorClick: () => void
  onMailboxClick: () => void
  onThreadbookClick: () => void
  onFlagClick: () => void
  className?: string
  hasUnreadGuestbook?: boolean
  isPlayingMusic?: boolean
  isUserOnline?: boolean
  houseCustomizations?: any
  badges?: Array<{
    id: string
    title: string
    backgroundColor: string
    textColor: string
    threadRing: {
      name: string
      slug: string
    }
  }>
}

interface BadgeSparkleProps {
  badges: PixelHomeSceneProps['badges']
}

const BadgeSparkles: React.FC<BadgeSparkleProps> = ({ badges }) => {
  if (!badges || badges.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      {badges.slice(0, 3).map((badge, index) => (
        <div
          key={badge.id}
          className="absolute animate-pulse"
          style={{
            left: `${20 + (index * 25)}%`,
            top: `${30 + (index * 10)}%`,
            animationDelay: `${index * 0.5}s`,
            animationDuration: '2s'
          }}
        >
          <div
            className="w-3 h-3 rounded-full shadow-sm"
            style={{ backgroundColor: badge.backgroundColor }}
            title={`${badge.threadRing.name} badge`}
          />
        </div>
      ))}
      
      {badges.length > 3 && (
        <div
          className="absolute text-xs font-bold text-thread-sage animate-bounce"
          style={{
            right: '15%',
            top: '40%',
            animationDuration: '3s'
          }}
        >
          +{badges.length - 3}
        </div>
      )}
    </div>
  )
}

export default function PixelHomeScene({
  template,
  palette,
  username,
  onDoorClick,
  onMailboxClick,
  onThreadbookClick,
  onFlagClick,
  className = '',
  hasUnreadGuestbook,
  isPlayingMusic,
  isUserOnline,
  houseCustomizations,
  badges
}: PixelHomeSceneProps) {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null)

  useEffect(() => {
    // Track house load
    trackHouseLoad(template, palette, username)
  }, [template, palette, username])

  const handleHotspotClick = (type: 'door' | 'mailbox' | 'threadbook' | 'flag', originalHandler: () => void) => {
    trackHotspotClick(type, username)
    originalHandler()
  }

  return (
    <div className={`relative w-full max-w-md mx-auto ${className}`}>
      {/* House SVG */}
      <div className="relative">
        <InteractiveHouseSVG 
          template={template} 
          palette={palette}
          customizations={houseCustomizations}
          className="w-full h-auto drop-shadow-lg"
          hasUnreadGuestbook={hasUnreadGuestbook}
          isPlayingMusic={isPlayingMusic}
          isUserOnline={isUserOnline}
        />
        
        {/* Badge sparkles overlay */}
        <BadgeSparkles badges={badges} />
        
        {/* Visitor trail - positioned on the right side of the house */}
        <VisitorTrail 
          username={username}
          className="top-4 right-4"
        />
        
        {/* Interactive hotspots */}
        <DoorHotspot 
          onClick={() => handleHotspotClick('door', onDoorClick)}
          onHover={(isHovered) => setHoveredElement(isHovered ? 'door' : null)}
        />
        
        <MailboxHotspot 
          onClick={() => handleHotspotClick('mailbox', onMailboxClick)}
          onHover={(isHovered) => setHoveredElement(isHovered ? 'mailbox' : null)}
        />
        
        <ThreadbookHotspot 
          onClick={() => handleHotspotClick('threadbook', onThreadbookClick)}
          onHover={(isHovered) => setHoveredElement(isHovered ? 'threadbook' : null)}
        />
        
        <FlagHotspot 
          onClick={() => handleHotspotClick('flag', onFlagClick)}
          onHover={(isHovered) => setHoveredElement(isHovered ? 'flag' : null)}
        />
      </div>
      
      {/* Interactive hints */}
      <div className="mt-4 text-center">
        <div className="text-sm text-thread-sage font-medium">
          {hoveredElement === 'door' && '🚪 Enter to view full profile'}
          {hoveredElement === 'mailbox' && '📬 Check guestbook messages'}
          {hoveredElement === 'threadbook' && '📖 Explore ThreadRing lineage'}
          {hoveredElement === 'flag' && '🏳️ View ring memberships'}
          {!hoveredElement && 'Hover over the house to explore'}
        </div>
        
        {badges && badges.length > 0 && (
          <div className="mt-2 text-xs text-thread-pine">
            ✨ {badges.length} ThreadRing badge{badges.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}