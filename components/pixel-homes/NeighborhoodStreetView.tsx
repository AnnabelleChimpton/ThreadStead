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
const SkyLayer: React.FC<{ timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'; totalWidth: number }> = ({ timeOfDay, totalWidth }) => {
  const gradients = {
    morning: 'from-blue-200 via-blue-100 to-yellow-50',
    afternoon: 'from-blue-400 via-blue-200 to-blue-100',
    evening: 'from-purple-400 via-pink-300 to-orange-200',
    night: 'from-indigo-900 via-blue-900 to-blue-800'
  }

  // Static mode when totalWidth is 0
  const isStatic = totalWidth === 0

  return (
    <div
      className={`absolute top-0 left-0 h-full bg-gradient-to-b ${gradients[timeOfDay]} pointer-events-none`}
      style={{ width: isStatic ? '100%' : `${totalWidth}px` }}
    >
      {/* Clouds - only show when scrollable */}
      {!isStatic && (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: Math.ceil(totalWidth / 400) }).map((_, i) => (
            <div key={`cloud-${i}`} className="absolute">
              <div
                className="text-2xl opacity-60"
                style={{
                  left: `${i * 400 + (i % 3) * 100}px`,
                  top: `${20 + (i % 4) * 15}px`,
                  transform: `rotate(${(i % 3) * 10 - 5}deg)`
                }}
              >
                ☁️
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Static clouds for static mode */}
      {isStatic && (
        <>
          <div className="absolute top-8 left-20 text-2xl opacity-60">☁️</div>
          <div className="absolute top-16 left-1/3 text-2xl opacity-50 rotate-12">☁️</div>
          <div className="absolute top-6 right-1/3 text-2xl opacity-60 -rotate-6">☁️</div>
        </>
      )}

      {/* Sun/Moon - static position in top right */}
      <div
        className="absolute top-10 right-10 text-4xl"
      >
        {timeOfDay === 'night' ? '🌙' : '☀️'}
      </div>
    </div>
  )
}


const StreetLayer: React.FC<{ scrollOffset: number; totalWidth: number }> = ({ scrollOffset, totalWidth }) => {
  return (
    <div
      className="street-layer"
      style={{
        width: `${totalWidth}px`
      }}
    >
      {/* Grass/Ground behind houses - extends to full scrollable width */}
      <div
        className="absolute bottom-20 left-0 h-[220px] bg-gradient-to-b from-green-200 via-green-300 to-green-400"
        style={{ width: `${totalWidth}px` }}
      >
        {/* Grass texture details */}
        <div className="absolute inset-0 opacity-30">
          {/* Random grass patches */}
          {Array.from({ length: Math.ceil(totalWidth / 50) }).map((_, i) => (
            <div key={`patch-${i}`} className="absolute">
              <div
                className="grass-patch"
                style={{
                  left: `${i * 50 + (i % 3) * 15}px`,
                  top: `${10 + (i % 4) * 15}px`,
                  width: '8px',
                  height: '8px',
                  backgroundColor: i % 3 === 0 ? '#22c55e' : i % 3 === 1 ? '#16a34a' : '#15803d',
                  borderRadius: '50%',
                  opacity: 0.6
                }}
              />
            </div>
          ))}

          {/* Small flowers scattered */}
          {Array.from({ length: Math.ceil(totalWidth / 80) }).map((_, i) => (
            <div
              key={`flower-${i}`}
              className="absolute text-xs"
              style={{
                left: `${i * 80 + (i % 5) * 20}px`,
                top: `${20 + (i % 6) * 12}px`,
                transform: `rotate(${(i % 4) * 90}deg)`
              }}
            >
              {i % 4 === 0 ? '🌼' : i % 4 === 1 ? '🌻' : i % 4 === 2 ? '🌺' : '🌷'}
            </div>
          ))}

          {/* Grass blades */}
          {Array.from({ length: Math.ceil(totalWidth / 30) }).map((_, i) => (
            <div
              key={`blade-${i}`}
              className="absolute"
              style={{
                left: `${i * 30 + (i % 7) * 8}px`,
                top: `${5 + (i % 5) * 10}px`,
                width: '2px',
                height: `${8 + (i % 3) * 4}px`,
                backgroundColor: '#22c55e',
                borderRadius: '2px 2px 0 0',
                opacity: 0.4,
                transform: `rotate(${(i % 3) * 15 - 15}deg)`
              }}
            />
          ))}
        </div>
      </div>

      {/* Street/Sidewalk - smaller proportion */}
      <div
        className="h-20 bg-gradient-to-b from-gray-400 to-gray-600 relative"
        style={{ width: `${totalWidth}px` }}
      >
        {/* Sidewalk */}
        <div
          className="absolute top-0 left-0 h-12 bg-gradient-to-b from-gray-300 to-gray-400"
          style={{ width: `${totalWidth}px` }}
        >
          {/* Sidewalk lines */}
          <div className="flex h-full">
            {Array.from({ length: Math.ceil(totalWidth / 16) }).map((_, i) => (
              <div key={i} className="w-16 border-r border-gray-500 opacity-20"></div>
            ))}
          </div>
        </div>

        {/* Street lines */}
        <div
          className="absolute top-16 left-0"
          style={{ width: `${totalWidth}px` }}
        >
          {Array.from({ length: Math.ceil(totalWidth / 88) }).map((_, i) => (
            <div
              key={i}
              className="absolute w-16 h-2 bg-yellow-400 opacity-80"
              style={{ left: `${i * 88}px` }}
            />
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

// Street pagination constants
const HOUSES_PER_STREET = 25
const STREET_WIDTH = 5600 // Fixed width per street (350px * 16 houses)

// Street names for consistent neighborhood feel
const STREET_NAMES = [
  'Pine Street', 'Oak Avenue', 'Maple Drive', 'Cedar Lane', 'Birch Boulevard',
  'Elm Street', 'Cherry Lane', 'Willow Way', 'Aspen Avenue', 'Spruce Street',
  'Poplar Place', 'Hickory Lane', 'Dogwood Drive', 'Sycamore Street', 'Walnut Way'
]

// Generate consistent street name based on index
const getStreetName = (streetIndex: number): string => {
  return STREET_NAMES[streetIndex % STREET_NAMES.length]
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
  const [currentStreet, setCurrentStreet] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

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

  // Street pagination logic
  const totalStreets = Math.ceil(members.length / HOUSES_PER_STREET)
  const startIndex = currentStreet * HOUSES_PER_STREET
  const endIndex = startIndex + HOUSES_PER_STREET
  const currentStreetMembers = members.slice(startIndex, endIndex)

  // Width calculation updated for new sizing: 285px houses + 64-80px gaps + padding
  const totalWidth = Math.max(1200, currentStreetMembers.length * 350 + 600)

  // Street navigation functions
  const goToNextStreet = () => {
    if (currentStreet < totalStreets - 1 && !isTransitioning) {
      setIsTransitioning(true)
      setCurrentStreet(currentStreet + 1)
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = 0
      }
      setTimeout(() => setIsTransitioning(false), 500)
    }
  }

  const goToPreviousStreet = () => {
    if (currentStreet > 0 && !isTransitioning) {
      setIsTransitioning(true)
      setCurrentStreet(currentStreet - 1)
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = 0
      }
      setTimeout(() => setIsTransitioning(false), 500)
    }
  }
  
  return (
    <div className="neighborhood-street-view relative h-[calc(100dvh-200px)] sm:h-[calc(100vh-200px)] max-h-[750px] overflow-hidden bg-gradient-to-b from-sky-100 via-sky-50 to-green-200 z-0">
      {/* Static Sky Background with Sun - outside scrollable area */}
      <div className="absolute inset-0 pointer-events-none">
        <SkyLayer timeOfDay={timeOfDay} totalWidth={0} />
      </div>

      {/* Street Indicator Overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
        <div className={`bg-thread-paper bg-opacity-95 border border-thread-sage rounded-lg px-4 py-2 shadow-lg transition-all duration-300 ${isTransitioning ? 'scale-110 shadow-xl' : 'scale-100'}`}>
          <div className="text-center">
            <div className="text-sm font-headline font-medium text-thread-pine">
              {getStreetName(currentStreet)}
            </div>
            {totalStreets > 1 && (
              <div className="text-xs text-thread-sage mt-1">
                Street {currentStreet + 1} of {totalStreets} • {currentStreetMembers.length} homes
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className="absolute inset-0 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-thread-sage scrollbar-track-thread-cream z-30"
        onScroll={handleScroll}
      >
        <div className="relative h-full" style={{ width: `${totalWidth}px` }}>
          {/* Street Layer - at the bottom */}
          <div className="absolute bottom-0 left-0 z-10" style={{ width: `${totalWidth}px` }}>
            <StreetLayer scrollOffset={scrollOffset} totalWidth={totalWidth} />
          </div>
          
          {/* Houses Layer - positioned closer to street for better viewport usage */}
          <div className="absolute left-0 right-0 z-20" style={{ bottom: '300px' }}>
            <div
              className={`house-layer motion-safe:transition-all motion-safe:duration-500 ${isTransitioning ? 'opacity-80 scale-95' : 'opacity-100 scale-100'}`}
              style={{
                transform: `translateX(${-scrollOffset}px)`,
                transformOrigin: 'bottom center'
              }}
            >
              <div className="flex gap-12 sm:gap-16 md:gap-20 px-4 sm:px-8">
                {currentStreetMembers.map((member) => {
                  // Get visible decorations for this member
                  const visibleDecorations = getVisibleDecorations(member.homeConfig.decorations)
                  
                  return (
                    <div
                      key={member.userId}
                      className="house-container relative cursor-pointer hover-lift group flex-shrink-0 motion-safe:transition-transform"
                      onClick={() => handleHouseClick(member)}
                      style={{
                        filter: 'drop-shadow(8px 12px 16px rgba(0,0,0,0.15))'
                      }}
                    >
                      {/* Ground shadow */}
                      <div
                        className="absolute"
                        style={{
                          bottom: '-85px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '80%',
                          height: '18px',
                          background: 'radial-gradient(ellipse, rgba(0,0,0,0.15), transparent)',
                          borderRadius: '50%',
                          zIndex: 1
                        }}
                      />

                      {/* House with decorations container - matches canvas proportions */}
                      <div className="house-wrapper interactive relative" style={{ width: '285px', height: '200px', zIndex: 2 }}>
                        {/* Mini canvas that matches the original 500x350 proportions - scaled to 285x200 */}
                        <div className="relative w-full h-full">
                          {/* Decorations */}
                          {visibleDecorations.map((decoration) => {
                            // Scale from 500x350 canvas to 285x200 (0.57 scale)
                            const scale = 0.57
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
                              left: `${150 * 0.57}px`, // 85.5px - scaled from original x=150
                              top: `${40 * 0.57}px`,   // 22.8px - scaled from original y=40
                              width: `${200 * 0.57}px`, // 114px - scaled from original 200px
                              height: `${180 * 0.57}px`, // 102.6px - scaled from original 180px
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
                        
                        {/* Enhanced Activity indicators */}
                        {member.stats.isActive && (
                          <>
                            {/* Enhanced window glow */}
                            <div className="absolute top-1/3 left-1/3 z-20">
                              <div className="window-glow-enhanced"></div>
                            </div>
                            <div className="absolute top-1/3 right-1/3 z-20">
                              <div className="window-glow-enhanced"></div>
                            </div>

                            {/* Chimney smoke for cozy feeling */}
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
                              <div className="chimney-smoke"></div>
                              <div className="chimney-smoke"></div>
                              <div className="chimney-smoke"></div>
                            </div>
                          </>
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
      
      {/* Street Navigation Controls */}
      {totalStreets > 1 && (
        <>
          {/* Previous Street Portal */}
          {currentStreet > 0 && (
            <div className="absolute left-8 bottom-16 z-50">
              <div className="flex flex-col items-center">
                <button
                  onClick={goToPreviousStreet}
                  disabled={isTransitioning}
                  className="group bg-thread-paper bg-opacity-90 border border-thread-sage rounded-md px-2 py-1.5 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-1 text-xs text-thread-pine">
                    <div className="text-center">
                      <div className="font-medium">← Prev</div>
                      <div className="text-[10px] text-thread-sage">{getStreetName(currentStreet - 1)}</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Next Street Portal */}
          {currentStreet < totalStreets - 1 && (
            <div className="absolute right-8 bottom-16 z-50">
              <div className="flex flex-col items-center">
                <button
                  onClick={goToNextStreet}
                  disabled={isTransitioning}
                  className="group bg-thread-paper bg-opacity-90 border border-thread-sage rounded-md px-2 py-1.5 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-1 text-xs text-thread-pine">
                    <div className="text-center">
                      <div className="font-medium">Next →</div>
                      <div className="text-[10px] text-thread-sage">{getStreetName(currentStreet + 1)}</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Horizontal Scroll Indicators (within current street) */}
      {currentStreetMembers.length > 8 && (
        <>
          <div className="absolute left-1/4 top-1/2 -translate-y-1/2 z-40">
            <button
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollLeft -= 300
                }
              }}
              className="p-3 sm:p-2 bg-thread-paper bg-opacity-60 rounded-full shadow-md hover:bg-opacity-80 transition-all text-thread-sage hover:text-thread-pine min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              ←
            </button>
          </div>
          <div className="absolute right-1/4 top-1/2 -translate-y-1/2 z-40">
            <button
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollLeft += 300
                }
              }}
              className="p-3 sm:p-2 bg-thread-paper bg-opacity-60 rounded-full shadow-md hover:bg-opacity-80 transition-all text-thread-sage hover:text-thread-pine min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              →
            </button>
          </div>
        </>
      )}
      
      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-thread-paper bg-opacity-90 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm text-thread-sage">
          {totalStreets > 1
            ? 'Explore this street • Use street portals to visit other streets • Click houses to visit'
            : 'Scroll to explore the street • Click houses to visit'
          }
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