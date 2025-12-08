import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import HouseSVG, { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG'
import DecorationSVG from './DecorationSVG'
import HouseDetailsPopup from './HouseDetailsPopup'
import { trackNavigation } from '../../lib/analytics/pixel-homes'
import { PixelIcon } from '@/components/ui/PixelIcon'
import { TERRAIN_TILES } from '../../lib/pixel-homes/decoration-data'
import { DEFAULT_DECORATION_GRID } from '../../lib/pixel-homes/decoration-grid-utils'
import { SkyDitherDefs, GrassTextureDefs, getSkyPatternCount, getGroundPatternCount } from './DitherPatternDefs'

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
  pngUrl?: string | null
  data?: any // Custom data for decorations (e.g. sign text)
}

interface NeighborhoodMember {
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
      houseNumber?: string | null
      houseNumberStyle?: string | null
      welcomeMat?: string | null
      welcomeMatText?: string | null
      welcomeMatColor?: string | null
      chimneyStyle?: string | null
      exteriorLights?: string | null
      windowTreatments?: string | null
    }
    atmosphere?: {
      sky: string
      weather: string
      timeOfDay: string
    }
    hasDecorations?: boolean
    decorationCount?: number
    decorations?: HomeDecoration[]
    terrain?: Record<string, string>
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

// Map time of day to sky pattern type
const getSkyTypeForTime = (timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'): 'sunny' | 'cloudy' | 'sunset' | 'night' => {
  switch (timeOfDay) {
    case 'morning': return 'sunny'
    case 'afternoon': return 'sunny'
    case 'evening': return 'sunset'
    case 'night': return 'night'
  }
}

// Layer components for depth
const SkyLayer: React.FC<{ timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'; totalWidth: number }> = ({ timeOfDay, totalWidth }) => {
  // Static mode when totalWidth is 0
  const isStatic = totalWidth === 0
  const width = isStatic ? '100%' : `${totalWidth}px`

  // Get sky pattern info
  const skyType = getSkyTypeForTime(timeOfDay)
  const patternCount = getSkyPatternCount(skyType)
  const skyPrefix = `street-sky-${skyType}`
  const patterns = Array.from({ length: patternCount }, (_, i) => `${skyPrefix}-${i}`)

  return (
    <div
      className="absolute top-0 left-0 h-full pointer-events-none"
      style={{ width }}
    >
      {/* Dithered sky gradient */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
      >
        <SkyDitherDefs prefix="street" />
        {/* Solid fallback in case patterns fail */}
        <rect x={0} y={0} width={100} height={100} fill={
          timeOfDay === 'night' ? '#151550' :
          timeOfDay === 'evening' ? '#FF7060' : '#87CEEB'
        } />
        {/* Dithered sky bands - using absolute coords matching viewBox */}
        {patterns.map((pattern, i) => {
          const bandHeight = 100 / patternCount
          return (
            <rect
              key={i}
              x={0}
              y={i * bandHeight}
              width={100}
              height={bandHeight + 0.5}
              fill={`url(#${pattern})`}
            />
          )
        })}
      </svg>

      {/* Clouds - only show when scrollable */}
      {!isStatic && (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: Math.ceil(totalWidth / 400) }).map((_, i) => (
            <div key={`cloud-${i}`} className="absolute">
              <div
                className="opacity-80"
                style={{
                  left: `${i * 400 + (i % 3) * 100}px`,
                  top: `${20 + (i % 4) * 15}px`,
                  transform: `scale(${1 + (i % 3) * 0.5})`
                }}
              >
                <PixelIcon name="cloud" size={32} color={timeOfDay === 'night' ? '#ffffff40' : '#ffffff'} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Static clouds for static mode */}
      {isStatic && (
        <>
          <div className="absolute top-8 left-20 opacity-80">
            <PixelIcon name="cloud" size={32} color={timeOfDay === 'night' ? '#ffffff40' : '#ffffff'} />
          </div>
          <div className="absolute top-16 left-1/3 opacity-60">
            <PixelIcon name="cloud" size={24} color={timeOfDay === 'night' ? '#ffffff40' : '#ffffff'} />
          </div>
          <div className="absolute top-6 right-1/3 opacity-80">
            <PixelIcon name="cloud" size={32} color={timeOfDay === 'night' ? '#ffffff40' : '#ffffff'} />
          </div>
        </>
      )}

      {/* Sun/Moon - static position in top right */}
      <div
        className="absolute top-10 right-10"
      >
        {timeOfDay === 'night' ? (
          <PixelIcon name="moon" size={48} color="#F4F6F0" />
        ) : (
          <PixelIcon name="sun" size={48} color="#FDB813" />
        )}
      </div>
    </div>
  )
}


const StreetLayer: React.FC<{ scrollOffset: number; totalWidth: number }> = ({ scrollOffset, totalWidth }) => {
  // Get ground pattern info for dithered grass
  const groundPatternCount = getGroundPatternCount()
  const groundPatterns = Array.from({ length: groundPatternCount }, (_, i) => `street-ground-${i}`)

  return (
    <div
      className="street-layer relative"
      style={{
        width: `${totalWidth}px`
      }}
    >
      {/* Grass/Ground behind houses - extends to full scrollable width */}
      <div
        className="absolute left-0 h-[220px]"
        style={{ width: `${totalWidth}px`, bottom: '80px' }}
      >
        {/* Dithered grass gradient */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${Math.max(100, totalWidth)} 220`}
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
        >
          <SkyDitherDefs prefix="street" />
          <GrassTextureDefs prefix="street" />
          {/* Solid fallback in case patterns fail */}
          <rect x="0" y="0" width="100%" height="100%" fill="#4ade80" />
          {/* Grass gradient bands */}
          {groundPatterns.map((pattern, i) => {
            const bandHeight = 220 / groundPatternCount
            return (
              <rect
                key={i}
                x={0}
                y={Math.floor(i * bandHeight)}
                width={Math.max(100, totalWidth)}
                height={Math.ceil(bandHeight) + 1}
                fill={`url(#${pattern})`}
              />
            )
          })}
          {/* Grass blade texture overlay - sparse at back, dense at front */}
          <rect
            x={0}
            y={0}
            width={Math.max(100, totalWidth)}
            height={110}
            fill="url(#street-grass-blades)"
          />
          <rect
            x={0}
            y={110}
            width={Math.max(100, totalWidth)}
            height={110}
            fill="url(#street-grass-blades-dense)"
          />
        </svg>

        {/* Small flowers scattered - pixel style */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: Math.ceil(totalWidth / 100) }).map((_, i) => (
            <div
              key={`flower-${i}`}
              className="absolute"
              style={{
                left: `${i * 100 + (i % 5) * 20}px`,
                top: `${30 + (i % 6) * 25}px`,
              }}
            >
              <div className="w-1 h-1 bg-yellow-400 shadow-[2px_0_#fbbf24,-2px_0_#fbbf24,0_2px_#fbbf24,0_-2px_#fbbf24]" />
            </div>
          ))}
        </div>
      </div>

      {/* Street/Sidewalk - smaller proportion */}
      <div
        className="h-20 bg-[#9ca3af] relative" // Solid gray street
        style={{ width: `${totalWidth}px` }}
      >
        {/* Sidewalk */}
        <div
          className="absolute top-0 left-0 h-12 bg-[#d1d5db]" // Lighter gray sidewalk
          style={{ width: `${totalWidth}px` }}
        >
          {/* Sidewalk lines - solid pixel lines */}
          <div className="flex h-full">
            {Array.from({ length: Math.ceil(totalWidth / 32) }).map((_, i) => (
              <div key={i} className="w-32 border-r-2 border-[#9ca3af] opacity-50"></div>
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
              className="absolute w-16 h-2 bg-[#facc15]" // Solid yellow
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
  // Canvas: 512x352 (grid-aligned)

  return decorations.filter(decoration =>
    decoration.x >= 0 &&
    decoration.x <= 512 &&
    decoration.y >= 0 &&
    decoration.y <= 352
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
  const rafIdRef = useRef<number | null>(null)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('afternoon')
  const [selectedMember, setSelectedMember] = useState<NeighborhoodMember | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [currentStreet, setCurrentStreet] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)
  const [visibleHouses, setVisibleHouses] = useState<Set<string>>(new Set())

  // Determine time of day
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) setTimeOfDay('morning')
    else if (hour >= 12 && hour < 17) setTimeOfDay('afternoon')
    else if (hour >= 17 && hour < 20) setTimeOfDay('evening')
    else setTimeOfDay('night')
  }, [])

  // Auto-hide instructions after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInstructions(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  // Handle horizontal scrolling with requestAnimationFrame for performance
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement

    // Cancel any pending animation frame
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
    }

    // Schedule update for next animation frame
    rafIdRef.current = requestAnimationFrame(() => {
      setScrollOffset(target.scrollLeft)
      rafIdRef.current = null
    })
  }

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  // Intersection Observer to optimize animations - only animate visible houses
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleHouses((prev) => {
          const next = new Set(prev)
          entries.forEach((entry) => {
            const houseId = entry.target.getAttribute('data-house-id')
            if (houseId) {
              if (entry.isIntersecting) {
                next.add(houseId)
              } else {
                next.delete(houseId)
              }
            }
          })
          return next
        })
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '50px', // Start animating slightly before entering viewport
        threshold: 0.1
      }
    )

    // Observe all house containers after a short delay to ensure they're rendered
    const timer = setTimeout(() => {
      const houseElements = document.querySelectorAll('[data-house-id]')
      houseElements.forEach((el) => observer.observe(el))
    }, 100)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [currentStreet, members.length]) // Re-observe when street changes

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
    <div className="neighborhood-street-view relative h-[calc(100dvh-200px)] sm:h-[calc(100vh-200px)] max-h-[750px] overflow-hidden bg-[#E0F7FA] z-0">
      <div
        className="absolute inset-0 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-thread-sage scrollbar-track-thread-cream z-30"
        onScroll={handleScroll}
        ref={scrollContainerRef}
      >
        <div className="relative h-full" style={{ width: `${totalWidth}px` }}>
          {/* Sky Layer */}
          <SkyLayer timeOfDay={timeOfDay} totalWidth={totalWidth} />

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
                  const isHouseVisible = visibleHouses.has(member.userId)

                  return (
                    <div
                      key={member.userId}
                      data-house-id={member.userId}
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
                      <div className="house-wrapper interactive relative" style={{ width: '285px', height: '196px', zIndex: 2 }}>
                        {/* Mini canvas that matches the 512x352 proportions - scaled to 285x196 (0.556 scale) */}
                        <div className="relative w-full h-full">
                          {/* Terrain Layer - below decorations and house */}
                          {member.homeConfig.terrain && Object.entries(member.homeConfig.terrain).map(([key, tileId]) => {
                            const [gridX, gridY] = key.split(',').map(Number)
                            const tile = TERRAIN_TILES.find(t => t.id === tileId)
                            if (!tile) return null

                            const scale = 0.556
                            const cellSize = DEFAULT_DECORATION_GRID.cellSize

                            return (
                              <div
                                key={`terrain-${key}`}
                                className="absolute pointer-events-none"
                                style={{
                                  left: `${gridX * cellSize * scale}px`,
                                  top: `${gridY * cellSize * scale}px`,
                                  width: `${cellSize * scale}px`,
                                  height: `${cellSize * scale}px`,
                                  backgroundColor: tile.color,
                                  zIndex: 0
                                }}
                              />
                            )
                          })}

                          {/* Decorations */}
                          {visibleDecorations.map((decoration) => {
                            // Scale from 512x352 canvas to 285x196 (0.556 scale)
                            const scale = 0.556
                            const scaledX = decoration.x * scale
                            const scaledY = decoration.y * scale

                            return (
                              <div
                                key={decoration.id}
                                className="absolute pointer-events-none"
                                style={{
                                  left: `${scaledX}px`,
                                  top: `${scaledY}px`,
                                  transform: 'scale(0.556)',
                                  transformOrigin: 'top left',
                                  zIndex: decoration.layer <= 5 ? 1 : 10 // Behind house (z-index 5) or in front
                                }}
                              >
                                <DecorationSVG
                                  decorationType={decoration.decorationType}
                                  decorationId={decoration.decorationId}
                                  variant={decoration.variant}
                                  size={decoration.size || 'medium'}
                                  className="drop-shadow-sm"
                                  text={decoration.data?.text}
                                  pngUrl={decoration.pngUrl || undefined}
                                />
                              </div>
                            )
                          })}

                          {/* House - positioned like in the original canvas */}
                          <div
                            className="absolute"
                            style={{
                              left: `${156 * 0.556}px`, // 87px - scaled from x=156
                              top: `${32 * 0.556}px`,   // 18px - scaled from y=32
                              width: `${200 * 0.556}px`, // 111px - scaled from 200px
                              height: `${180 * 0.556}px`, // 100px - scaled from 180px
                              zIndex: 5
                            }}
                          >
                            <HouseSVG
                              template={member.homeConfig.houseTemplate as any}
                              palette={member.homeConfig.palette as any}
                              customizations={member.homeConfig.houseCustomizations as HouseCustomizations}
                              className="w-full h-full"
                              variant="simplified"
                            />
                          </div>
                        </div>

                        {/* Enhanced Activity indicators - only animate when visible */}
                        {member.stats.isActive && isHouseVisible && (
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
            <div
              className="absolute z-50"
              style={{
                left: 'calc(0.5rem + env(safe-area-inset-left, 0px))',
                bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))'
              }}
            >
              <div className="flex flex-col items-center">
                <button
                  onClick={goToPreviousStreet}
                  disabled={isTransitioning}
                  className="group bg-thread-paper bg-opacity-90 border border-thread-sage rounded-md px-2 py-1.5 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  aria-label={`Previous street: ${getStreetName(currentStreet - 1)}`}
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
            <div
              className="absolute z-50"
              style={{
                right: 'calc(0.5rem + env(safe-area-inset-right, 0px))',
                bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))'
              }}
            >
              <div className="flex flex-col items-center">
                <button
                  onClick={goToNextStreet}
                  disabled={isTransitioning}
                  className="group bg-thread-paper bg-opacity-90 border border-thread-sage rounded-md px-2 py-1.5 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  aria-label={`Next street: ${getStreetName(currentStreet + 1)}`}
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

      {/* Horizontal Scroll Indicators (within current street) - Desktop only */}
      {currentStreetMembers.length > 8 && (
        <>
          <div className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 z-40">
            <button
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollLeft -= 400
                }
              }}
              className="p-2 bg-thread-paper bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-lg hover:shadow-xl transition-all border-2 border-thread-sage text-thread-pine hover:scale-110 min-w-[48px] min-h-[48px] flex items-center justify-center font-bold text-xl"
              aria-label="Scroll left"
            >
              ←
            </button>
          </div>
          <div className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 z-40">
            <button
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollLeft += 400
                }
              }}
              className="p-2 bg-thread-paper bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-lg hover:shadow-xl transition-all border-2 border-thread-sage text-thread-pine hover:scale-110 min-w-[48px] min-h-[48px] flex items-center justify-center font-bold text-xl"
              aria-label="Scroll right"
            >
              →
            </button>
          </div>
        </>
      )}

      {/* Instructions - Auto-hide after 3s, dismissible on tap */}
      {showInstructions && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 cursor-pointer"
          onClick={() => setShowInstructions(false)}
        >
          <div className="bg-thread-paper bg-opacity-90 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm text-thread-sage transition-opacity duration-300 hover:bg-opacity-100">
            {/* Mobile: Short and concise */}
            <span className="md:hidden">Swipe to explore • Tap houses</span>
            {/* Desktop: Full instructions */}
            <span className="hidden md:inline">
              {totalStreets > 1
                ? 'Explore this street • Use street portals to visit other streets • Click houses to visit'
                : 'Scroll to explore the street • Click houses to visit'
              }
            </span>
          </div>
        </div>
      )}

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