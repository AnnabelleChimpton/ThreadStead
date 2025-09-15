import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import HouseSVG, { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG'
import DecorationSVG from './DecorationSVG'
import HouseDetailsPopup from './HouseDetailsPopup'
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

interface NeighborhoodMember {
  userId: string
  username: string
  displayName?: string | null
  avatarUrl?: string | null
  homeConfig: {
    houseTemplate: HouseTemplate
    palette: ColorPalette
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
  stats: {
    isActive: boolean
  }
}

interface NeighborhoodStreetViewProps {
  members: NeighborhoodMember[]
  currentUserId?: string
  neighborhoodType: string
}

// Layer components for depth
const SkyLayer: React.FC<{ timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' }> = ({ timeOfDay }) => {
  const gradients = {
    morning: 'from-blue-200 via-blue-100 to-yellow-50',
    afternoon: 'from-blue-400 via-blue-200 to-blue-100',
    evening: 'from-purple-400 via-pink-300 to-orange-200',
    night: 'from-indigo-900 via-blue-900 to-blue-800'
  }
  
  return (
    <div className={`absolute inset-0 bg-gradient-to-b ${gradients[timeOfDay]} pointer-events-none`}>
      {/* Clouds */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="cloud cloud-1">☁️</div>
        <div className="cloud cloud-2">☁️</div>
        <div className="cloud cloud-3">☁️</div>
      </div>
      
      {/* Sun/Moon */}
      <div className="absolute top-10 right-20 text-4xl">
        {timeOfDay === 'night' ? '🌙' : '☀️'}
      </div>
    </div>
  )
}


const StreetLayer: React.FC<{ scrollOffset: number }> = ({ scrollOffset }) => {
  return (
    <div 
      className="street-layer"
      style={{
        transform: `translateX(${-scrollOffset}px)`,
      }}
    >
      {/* Grass/Ground behind houses - extends to where houses are positioned */}
      <div className="absolute bottom-32 left-0 right-0 h-64 bg-gradient-to-b from-green-200 via-green-300 to-green-400"></div>
      
      {/* Street/Sidewalk - smaller proportion */}
      <div className="h-32 bg-gradient-to-b from-gray-400 to-gray-600 relative">
        {/* Sidewalk */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-gray-300 to-gray-400">
          {/* Sidewalk lines */}
          <div className="flex h-full">
            {Array.from({ length: 100 }).map((_, i) => (
              <div key={i} className="w-16 border-r border-gray-500 opacity-20"></div>
            ))}
          </div>
        </div>
        
        {/* Street lines */}
        <div className="absolute top-16 left-0 right-0 flex justify-center gap-6">
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} className="w-16 h-2 bg-yellow-400 opacity-80"></div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Calculate which decorations are visible in street view
const getVisibleDecorations = (decorations: HomeDecoration[] | undefined): HomeDecoration[] => {
  if (!decorations) return []
  
  // Since we're now showing a proportionally scaled version of the full canvas,
  // we can show all decorations that are within the canvas bounds
  // Original canvas: 500x350
  
  return decorations.filter(decoration => 
    decoration.x >= 0 &&
    decoration.x <= 500 &&
    decoration.y >= 0 &&
    decoration.y <= 350
  )
}

export default function NeighborhoodStreetView({
  members,
  currentUserId
}: NeighborhoodStreetViewProps) {
  const router = useRouter()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('afternoon')
  const [selectedMember, setSelectedMember] = useState<NeighborhoodMember | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  
  // Determine time of day
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) setTimeOfDay('morning')
    else if (hour >= 12 && hour < 17) setTimeOfDay('afternoon')
    else if (hour >= 17 && hour < 20) setTimeOfDay('evening')
    else setTimeOfDay('night')
  }, [])
  
  // Handle horizontal scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    setScrollOffset(target.scrollLeft)
  }
  
  // Navigate to house popup
  const handleHouseClick = (member: NeighborhoodMember) => {
    trackNavigation('pixel_home', 'pixel_home', member.username)
    setSelectedMember(member)
    setShowPopup(true)
  }
  
  // Calculate total width needed - account for houses and spacing
  const totalWidth = Math.max(4000, members.length * 320)
  
  return (
    <div className="neighborhood-street-view relative h-[600px] overflow-hidden bg-gradient-to-b from-sky-100 via-sky-50 to-green-200">
      {/* Sky Background */}
      <SkyLayer timeOfDay={timeOfDay} />
      
      {/* Scrollable Container */}
      <div 
        ref={scrollContainerRef}
        className="absolute inset-0 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-thread-sage scrollbar-track-thread-cream"
        onScroll={handleScroll}
      >
        <div className="relative h-full" style={{ width: `${totalWidth}px` }}>
          {/* Street Layer - at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <StreetLayer scrollOffset={scrollOffset} />
          </div>
          
          {/* Houses Layer - positioned so bottom of canvas aligns with top of sidewalk where grass meets street */}
          <div className="absolute left-0 right-0 z-20" style={{ bottom: '350px' }}>
            <div 
              className="house-layer"
              style={{
                transform: `translateX(${-scrollOffset}px)`,
                transformOrigin: 'bottom center'
              }}
            >
              <div className="flex gap-8 md:gap-12 px-8">
                {members.map((member) => {
                  // Get visible decorations for this member
                  const visibleDecorations = getVisibleDecorations(member.homeConfig.decorations)
                  
                  return (
                    <div
                      key={member.userId}
                      className="house-container relative cursor-pointer hover-lift group flex-shrink-0"
                      onClick={() => handleHouseClick(member)}
                    >
                      {/* House with decorations container - matches canvas proportions */}
                      <div className="house-wrapper interactive relative" style={{ width: '320px', height: '224px' }}>
                        {/* Mini canvas that matches the original 500x350 proportions */}
                        <div className="relative w-full h-full">
                          {/* Decorations */}
                          {visibleDecorations.map((decoration) => {
                            // Scale from 500x350 canvas to 320x224 (0.64 scale)
                            const scale = 0.64
                            const scaledX = decoration.x * scale
                            const scaledY = decoration.y * scale
                            
                            return (
                              <div
                                key={decoration.id}
                                className="absolute pointer-events-none"
                                style={{
                                  left: `${scaledX}px`,
                                  top: `${scaledY}px`,
                                  zIndex: decoration.layer <= 5 ? 1 : 10 // Behind house (z-index 5) or in front
                                }}
                              >
                                <DecorationSVG
                                  decorationType={decoration.decorationType}
                                  decorationId={decoration.decorationId}
                                  variant={decoration.variant}
                                  size={decoration.size || 'medium'}
                                  className="drop-shadow-sm"
                                />
                              </div>
                            )
                          })}
                          
                          {/* House - positioned like in the original canvas */}
                          <div 
                            className="absolute"
                            style={{
                              left: `${150 * 0.64}px`, // 96px - scaled from original x=150
                              top: `${40 * 0.64}px`,   // 25.6px - scaled from original y=40
                              width: `${200 * 0.64}px`, // 128px - scaled from original 200px
                              height: `${180 * 0.64}px`, // 115.2px - scaled from original 180px
                              zIndex: 5
                            }}
                          >
                            <HouseSVG
                              template={member.homeConfig.houseTemplate}
                              palette={member.homeConfig.palette}
                              customizations={member.homeConfig.houseCustomizations as HouseCustomizations}
                              className="w-full h-full"
                            />
                          </div>
                        </div>
                        
                        {/* Activity indicator */}
                        {member.stats.isActive && (
                          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-20">
                            <div className="window-light-glow"></div>
                          </div>
                        )}
                        
                        {/* Decoration indicator - only show if there are decorations not visible in street view */}
                        {(member.homeConfig.decorationCount || 0) > visibleDecorations.length && (
                          <div className="absolute top-2 right-2 z-20">
                            <div className="text-lg" title={`${member.homeConfig.decorationCount} total decorations`}>🌻</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll Indicators */}
      {members.length > 5 && (
        <>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50">
            <button
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollLeft -= 300
                }
              }}
              className="p-2 bg-thread-paper bg-opacity-80 rounded-full shadow-lg hover:bg-opacity-100 transition-all"
            >
              ←
            </button>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50">
            <button
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollLeft += 300
                }
              }}
              className="p-2 bg-thread-paper bg-opacity-80 rounded-full shadow-lg hover:bg-opacity-100 transition-all"
            >
              →
            </button>
          </div>
        </>
      )}
      
      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-thread-paper bg-opacity-90 px-4 py-2 rounded-full text-sm text-thread-sage">
          Scroll horizontally to explore the neighborhood • Click houses to visit
        </div>
      </div>
      
      {/* House Details Popup */}
      {selectedMember && (
        <HouseDetailsPopup
          isOpen={showPopup}
          onClose={() => setShowPopup(false)}
          member={selectedMember}
        />
      )}
    </div>
  )
}