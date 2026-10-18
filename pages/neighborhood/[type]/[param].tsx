import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../../components/ui/layout/Layout'
import NeighborhoodStreetView from '../../../components/pixel-homes/NeighborhoodStreetView'
import NeighborhoodGridView from '../../../components/pixel-homes/NeighborhoodGridView'
import NeighborhoodMapView from '../../../components/pixel-homes/NeighborhoodMapView'
import NeighborhoodCardView from '../../../components/pixel-homes/NeighborhoodCardView'
import NeighborhoodFABs from '../../../components/pixel-homes/NeighborhoodFABs'
import NeighborhoodFilterSheet, { FilterState } from '../../../components/pixel-homes/NeighborhoodFilterSheet'
import HouseDetailsPopup from '../../../components/pixel-homes/HouseDetailsPopup'
import { HouseTemplate, ColorPalette } from '../../../components/pixel-homes/HouseSVG'
import { db } from '../../../lib/config/database/connection'
import { visibleResidentWhere } from '@/lib/domain/users/profile-access'
import { HOUSE_TEMPLATES, HOUSE_PALETTES, isHouseTemplate, isColorPalette } from '@/lib/pixel-homes/house-choice'
import Link from 'next/link'
import { PixelIcon } from '@/components/ui/PixelIcon'
import { featureFlags } from '@/lib/utils/features/feature-flags'
import { getRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { raceHubCall, HUB_TIMEOUT } from '@/lib/api/ringhub/ringhub-ssr'
import { transformRingDescriptorToThreadRing, transformRingMembersBatchWithUserResolution } from '@/lib/api/ringhub/ringhub-transformers'
import { weatherWidget } from '@/components/widgets/examples/WeatherWidget'
import useIsMobile from '../../../hooks/useIsMobile'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'

// Helper to format temperature with correct unit based on country
const formatTemperature = (temp: number, countryCode?: string): string => {
  // Only US, Liberia, Myanmar, and US territories use Fahrenheit
  const usesImperial = countryCode && ['US', 'LR', 'MM', 'PR', 'GU', 'VI', 'AS', 'MP'].includes(countryCode.toUpperCase())

  if (usesImperial) {
    return `${temp}°F`
  } else {
    // Convert Fahrenheit to Celsius for metric countries
    const celsius = Math.round((temp - 32) * 5 / 9)
    return `${celsius}°C`
  }
}

// Neighborhood member data structure
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
    decorations?: {
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
    }[]
    terrain?: Record<string, string>
  }
  stats: {
    recentVisits?: number
    ringMemberships?: number
    isActive: boolean
  }
  connections?: {
    mutualRings?: number
    mutualFriends?: number
    isFollowing?: boolean
    isFollower?: boolean
  }
  joinedAt?: string
  role?: string
}

interface UnifiedNeighborhoodProps {
  type: 'ring' | 'mutual' | 'following' | 'followers' | 'explore'
  param: string
  title: string
  description: string
  members: NeighborhoodMember[]
  totalCount: number
  metadata: {
    ringName?: string
    ringSlug?: string
    targetUsername?: string
    targetDisplayName?: string
  }
  currentUserId?: string
}

type ViewMode = 'street' | 'grid' | 'map' | 'card'

export default function UnifiedNeighborhood({
  type,
  param,
  title,
  description,
  members,
  totalCount,
  metadata,
  currentUserId
}: UnifiedNeighborhoodProps) {
  const isMobile = useIsMobile(768)
  const [viewMode, setViewMode] = useState<ViewMode>('street')
  const [filterActive, setFilterActive] = useState(false)
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical'>('recent')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [templateFilter, setTemplateFilter] = useState<string>('')
  const [paletteFilter, setPaletteFilter] = useState<string>('')
  const [weatherData, setWeatherData] = useState<any>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [showFilterSheet, setShowFilterSheet] = useState(false)
  const [selectedMember, setSelectedMember] = useState<NeighborhoodMember | null>(null)
  const [showHouseDetails, setShowHouseDetails] = useState(false)
  const [showViewModeSelector, setShowViewModeSelector] = useState(false)

  // Filters can come from the URL (?template=, ?palette=, ?activeOnly=true),
  // so old /explore/homes?template=… links keep their filter
  const router = useRouter()
  useEffect(() => {
    if (!router.isReady) return
    const { template, palette, activeOnly } = router.query
    if (isHouseTemplate(template)) setTemplateFilter(template)
    if (isColorPalette(palette)) setPaletteFilter(palette)
    if (activeOnly === 'true') setFilterActive(true)
    if (isHouseTemplate(template) || isColorPalette(palette) || activeOnly === 'true') setShowAdvancedFilters(true)
  }, [router.isReady, router.query])

  // Load user's preferred view mode from localStorage and auto-select card on mobile
  useEffect(() => {
    if (isMobile) {
      // On mobile, default to card view
      const savedMode = localStorage.getItem('neighborhoodViewModeMobile') as ViewMode
      if (savedMode && ['card', 'grid', 'map'].includes(savedMode)) {
        setViewMode(savedMode)
      } else {
        setViewMode('card')
      }
    } else {
      // On desktop, use saved preference or default to street
      const savedMode = localStorage.getItem('neighborhoodViewMode') as ViewMode
      if (savedMode && ['street', 'grid', 'map', 'card'].includes(savedMode)) {
        setViewMode(savedMode)
      }
    }
  }, [isMobile])

  // Load weather data
  useEffect(() => {
    const loadWeather = async () => {
      try {
        setWeatherLoading(true)
        const data = await weatherWidget.fetchData()
        setWeatherData(data)
      } catch (error) {
        console.error('Failed to load weather data:', error)
      } finally {
        setWeatherLoading(false)
      }
    }

    loadWeather()
  }, [])

  // Save view mode preference
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    const storageKey = isMobile ? 'neighborhoodViewModeMobile' : 'neighborhoodViewMode'
    localStorage.setItem(storageKey, mode)
  }

  // Handle filter application
  const handleFiltersChange = (filters: FilterState) => {
    setFilterActive(filters.activeOnly || filters.templates.length > 0 || filters.palettes.length > 0)
    setTemplateFilter(filters.templates[0] || '')
    setPaletteFilter(filters.palettes[0] || '')
    setSortBy(filters.sortBy)
  }

  // Handle random house jump
  const handleRandomJump = () => {
    const randomIndex = Math.floor(Math.random() * processedMembers.length)
    const randomMember = processedMembers[randomIndex]
    if (randomMember) {
      setSelectedMember(randomMember)
      setShowHouseDetails(true)
    }
  }

  // Handle card swipe up (show details)
  const handleCardSwipeUp = (member: NeighborhoodMember) => {
    setSelectedMember(member)
    setShowHouseDetails(true)
  }

  // Filter and sort members
  const processedMembers = members
    .filter(m => {
      // Basic activity filter
      if (filterActive && !m.stats.isActive) return false

      // Advanced template filter
      if (templateFilter && m.homeConfig.houseTemplate !== templateFilter) return false

      // Advanced palette filter
      if (paletteFilter && m.homeConfig.palette !== paletteFilter) return false

      return true
    })
    .sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return (a.username || '').localeCompare(b.username || '')
      }
      // Default: recent (by joinedAt or activity)
      return (b.joinedAt || '').localeCompare(a.joinedAt || '')
    })

  const filterCount = (filterActive ? 1 : 0) + (templateFilter ? 1 : 0) + (paletteFilter ? 1 : 0)

  const pageTitle = `${title} - ThreadStead`
  const activeCount = members.filter(m => m.stats.isActive).length

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta name="neighborhood:type" content={type} />
        <meta name="neighborhood:count" content={totalCount.toString()} />
      </Head>

      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-thread-paper to-thread-cream">
          {/* Condensed header for mobile card view */}
          {viewMode === 'card' && isMobile && (
            <div
              className="fixed top-0 left-0 right-0 z-50 bg-thread-paper/95 backdrop-blur-sm border-b border-thread-sage px-4 py-2"
              style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-thread-pine truncate flex-1 mr-2">{title}</span>
                <span className="text-thread-sage whitespace-nowrap">{processedMembers.length} homes</span>
              </div>
            </div>
          )}

          {/* Header - compact, hidden in card view on mobile */}
          <div className={`bg-thread-paper border-b border-thread-sage sticky top-0 z-40 ${viewMode === 'card' && isMobile ? 'hidden' : ''}`}>
            <div className="container mx-auto px-3 md:px-4 py-2 md:py-3">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg md:text-2xl font-headline font-bold text-thread-pine mb-1">
                    {title}
                  </h1>
                  <p className="hidden md:block text-thread-sage max-w-2xl mb-1 text-sm">
                    {description}
                  </p>

                  <p className="text-xs text-thread-sage mb-0">
                    <span className="font-medium text-thread-pine">{processedMembers.length}</span>
                    {processedMembers.length === totalCount ? ' homes' : ` of ${totalCount} homes`}
                    {' · '}
                    <span className="font-medium text-thread-pine">{activeCount}</span> active this week
                  </p>

                  {type === 'explore' && (
                    <p className="text-sm mt-1.5 mb-0 flex flex-wrap gap-x-4 gap-y-1">
                      <Link href="/neighborhood/residents">Residents</Link>
                      <Link href="/neighborhood/random">A random house</Link>
                      {!currentUserId && <Link href="/home/demo">The demo house</Link>}
                    </p>
                  )}
                </div>

                {/* View, order and filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex bg-thread-cream border border-thread-sage rounded-lg p-0.5 md:p-1" role="group" aria-label="View">
                    {([
                      { mode: 'street', label: 'Street', icon: 'buildings' },
                      ...(isMobile ? [{ mode: 'card', label: 'Cards', icon: 'image' }] : []),
                      { mode: 'grid', label: 'Grid', icon: 'drag-and-drop' },
                      { mode: 'map', label: 'Map', icon: 'map' },
                    ] as { mode: ViewMode; label: string; icon: 'buildings' | 'image' | 'drag-and-drop' | 'map' }[]).map(({ mode, label, icon }) => (
                      <button
                        key={mode}
                        onClick={() => handleViewModeChange(mode)}
                        aria-pressed={viewMode === mode}
                        className={`ts-chip px-2 md:px-3 py-1 md:py-1.5 rounded-md text-xs md:text-sm font-medium transition-all ${viewMode === mode
                          ? 'bg-thread-sage text-thread-paper shadow-sm'
                          : 'text-thread-sage hover:text-thread-pine'
                          }`}
                        title={label}
                      >
                        <PixelIcon name={icon} size={14} className="inline-block align-middle" />
                        <span className="hidden md:inline ml-1">{label}</span>
                        <span className="sr-only md:hidden">{label}</span>
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-1.5 text-xs md:text-sm text-thread-sage">
                    <span className="hidden md:inline">Order</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'recent' | 'alphabetical')}
                      className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm rounded-md border border-thread-sage bg-thread-paper text-thread-pine"
                      aria-label="Order"
                    >
                      <option value="recent">Recently updated</option>
                      <option value="alphabetical">A–Z</option>
                    </select>
                  </label>

                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    aria-expanded={showAdvancedFilters}
                    aria-controls="neighborhood-filters"
                    className="px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm rounded-md border border-thread-sage text-thread-pine hover:bg-thread-cream transition-colors"
                  >
                    Filters{filterCount > 0 ? ` (${filterCount})` : ''}
                  </button>
                </div>
              </div>

              {/* Filters - collapsed until asked for */}
              {showAdvancedFilters && (
                <div id="neighborhood-filters" className="mt-3 bg-thread-cream border border-thread-sage rounded-lg p-3 md:p-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <label className="flex items-center gap-2 text-sm text-thread-pine">
                      <input
                        type="checkbox"
                        checked={filterActive}
                        onChange={(e) => setFilterActive(e.target.checked)}
                      />
                      Active this week
                    </label>

                    <label className="text-xs font-medium text-thread-pine">
                      <span className="block mb-1">House style</span>
                      <select
                        value={templateFilter}
                        onChange={(e) => setTemplateFilter(e.target.value)}
                        className="px-2 py-1.5 text-sm border border-thread-sage rounded-md bg-thread-paper text-thread-pine"
                      >
                        <option value="">Any</option>
                        {HOUSE_TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="text-xs font-medium text-thread-pine">
                      <span className="block mb-1">Colors</span>
                      <select
                        value={paletteFilter}
                        onChange={(e) => setPaletteFilter(e.target.value)}
                        className="px-2 py-1.5 text-sm border border-thread-sage rounded-md bg-thread-paper text-thread-pine"
                      >
                        <option value="">Any</option>
                        {HOUSE_PALETTES.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </label>

                    {filterCount > 0 && (
                      <button
                        onClick={() => {
                          setTemplateFilter('')
                          setPaletteFilter('')
                          setFilterActive(false)
                        }}
                        className="text-sm text-thread-sage hover:text-thread-pine underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Neighborhood View */}
          <div className="relative">
            {/* Weather Overlay - Top Left Corner for explore pages (hide in card view on mobile since card has its own) */}
            {type === 'explore' && !(viewMode === 'card' && isMobile) && (
              <div className="absolute top-4 left-4 z-30">
                <div className="bg-thread-paper bg-opacity-95 border border-thread-sage rounded-lg px-3 py-2 shadow-lg">
                  {weatherLoading ? (
                    <LoadingSpinner size="sm" layout="row" message="Loading weather..." className="justify-start" />
                  ) : weatherData ? (
                    <div className="text-xs text-thread-pine">
                      <span>It&apos;s {/^[aeiou]/.test(weatherData.condition.toLowerCase()) ? 'an' : 'a'} {weatherData.condition.toLowerCase()} {formatTemperature(weatherData.temperature, weatherData.countryCode)} day in the neighborhood</span>
                      <span className="ml-2">{weatherData.emoji}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-thread-sage">Weather unavailable</div>
                  )}
                </div>
              </div>
            )}

            {viewMode === 'street' && (
              <NeighborhoodStreetView
                members={processedMembers}
                currentUserId={currentUserId}
                neighborhoodType={type}
              />
            )}

            {viewMode === 'card' && (
              <div className={isMobile ? "h-[calc(100dvh-9rem)]" : "h-[calc(100vh-200px)]"}>
                <NeighborhoodCardView
                  members={processedMembers}
                  currentUserId={currentUserId}
                  onSwipeUp={handleCardSwipeUp}
                  weatherData={weatherData ? {
                    temp: weatherData.temperature,
                    condition: weatherData.condition,
                    icon: weatherData.emoji
                  } : undefined}
                />
              </div>
            )}

            {viewMode === 'grid' && (
              <div className="container mx-auto px-4 py-8">
                <NeighborhoodGridView
                  members={processedMembers}
                  ringSlug={metadata.ringSlug || type}
                />
              </div>
            )}

            {viewMode === 'map' && (
              <NeighborhoodMapView
                members={processedMembers}
                currentUserId={currentUserId}
                neighborhoodType={type}
              />
            )}
          </div>

          {/* Footer Actions */}
          <div className="container mx-auto px-4 py-8">
            {type !== 'explore' && (
              <div className="bg-thread-paper border border-thread-sage rounded-lg p-6 text-center">
                <h3 className="text-lg font-headline font-medium text-thread-pine mb-4">
                  <PixelIcon name="search" size={16} className="inline-block align-middle" /> More neighborhoods to wander
                </h3>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href="/neighborhood"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-thread-sage text-thread-paper rounded-md hover:bg-thread-pine transition-colors"
                  >
                    <PixelIcon name="map" size={16} /> The street
                  </Link>
                  {type !== 'ring' && metadata.ringSlug && (
                    <Link
                      href={`/neighborhood/ring/${metadata.ringSlug}`}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-thread-sage text-thread-sage rounded-md hover:bg-thread-sage hover:text-thread-paper transition-colors"
                    >
                      <PixelIcon name="coin" size={16} /> Ring Neighborhood
                    </Link>
                  )}
                  <Link
                    href="/threadrings"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-thread-sage text-thread-sage rounded-md hover:bg-thread-sage hover:text-thread-paper transition-colors"
                  >
                    <PixelIcon name="bookmark" size={16} /> All rings
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Mobile FABs - Only show in card view */}
          {viewMode === 'card' && (
            <NeighborhoodFABs
              onFilterClick={() => setShowFilterSheet(true)}
              onRandomClick={handleRandomJump}
              onViewModeClick={() => setShowViewModeSelector(true)}
              filterActive={filterCount > 0}
              filterCount={filterCount + (sortBy !== 'recent' ? 1 : 0)}
            />
          )}

          {/* Mobile Filter Sheet */}
          <NeighborhoodFilterSheet
            isOpen={showFilterSheet}
            onClose={() => setShowFilterSheet(false)}
            filters={{
              activeOnly: filterActive,
              templates: templateFilter ? [templateFilter] : [],
              palettes: paletteFilter ? [paletteFilter] : [],
              sortBy: sortBy
            }}
            onFiltersChange={handleFiltersChange}
            availableTemplates={Array.from(new Set(members.map(m => m.homeConfig.houseTemplate)))}
            availablePalettes={Array.from(new Set(members.map(m => m.homeConfig.palette)))}
            resultCount={processedMembers.length}
            totalCount={members.length}
          />

          {/* House Details Popup */}
          {selectedMember && (
            <HouseDetailsPopup
              isOpen={showHouseDetails}
              onClose={() => setShowHouseDetails(false)}
              member={selectedMember}
            />
          )}

          {/* View Mode Selector Sheet (Mobile only) */}
          {showViewModeSelector && isMobile && (
            <>
              <div
                className="bottom-sheet-backdrop visible"
                onClick={() => setShowViewModeSelector(false)}
              />
              <div className={`mobile-bottom-sheet ${showViewModeSelector ? 'open' : ''}`}>
                <div className="bottom-sheet-handle" />
                <div className="bottom-sheet-content">
                  <div className="bg-gradient-to-r from-thread-sage to-thread-pine text-thread-paper p-6 rounded-t-lg">
                    <h3 className="text-lg font-semibold">View Mode</h3>
                    <p className="text-sm text-thread-cream mt-1">Choose how to explore</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <button
                      onClick={() => {
                        handleViewModeChange('card')
                        setShowViewModeSelector(false)
                      }}
                      className={`w-full min-h-[48px] px-4 py-3 rounded-lg font-medium transition-colors ${viewMode === 'card'
                        ? 'bg-thread-sage text-thread-paper'
                        : 'bg-thread-cream text-thread-pine border border-thread-sage'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <PixelIcon name="image" size={20} />
                        <div className="text-left">
                          <div className="font-semibold">Card View</div>
                          <div className="text-xs opacity-75">Swipe through homes</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleViewModeChange('street')
                        setShowViewModeSelector(false)
                      }}
                      className={`w-full min-h-[48px] px-4 py-3 rounded-lg font-medium transition-colors ${viewMode === 'street'
                        ? 'bg-thread-sage text-thread-paper'
                        : 'bg-thread-cream text-thread-pine border border-thread-sage'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <PixelIcon name="buildings" size={20} />
                        <div className="text-left">
                          <div className="font-semibold">Street View</div>
                          <div className="text-xs opacity-75">Scroll horizontally</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleViewModeChange('grid')
                        setShowViewModeSelector(false)
                      }}
                      className={`w-full min-h-[48px] px-4 py-3 rounded-lg font-medium transition-colors ${viewMode === 'grid'
                        ? 'bg-thread-sage text-thread-paper'
                        : 'bg-thread-cream text-thread-pine border border-thread-sage'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <PixelIcon name="more-horizontal" size={20} />
                        <div className="text-left">
                          <div className="font-semibold">Grid View</div>
                          <div className="text-xs opacity-75">Browse all at once</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        handleViewModeChange('map')
                        setShowViewModeSelector(false)
                      }}
                      className={`w-full min-h-[48px] px-4 py-3 rounded-lg font-medium transition-colors ${viewMode === 'map'
                        ? 'bg-thread-sage text-thread-paper'
                        : 'bg-thread-cream text-thread-pine border border-thread-sage'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <PixelIcon name="map" size={20} />
                        <div className="text-left">
                          <div className="font-semibold">Map View</div>
                          <div className="text-xs opacity-75">Spatial layout</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Layout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { type, param } = context.query

  if (typeof type !== 'string' || typeof param !== 'string') {
    return { notFound: true }
  }

  try {
    // Get current user for personalization
    const { getSessionUser } = await import('../../../lib/auth/server')
    const currentUser = await getSessionUser(context.req as any)
    // Homes the viewer may not see (profile visibility, blocks) are left off
    const visibleOwners = visibleResidentWhere(currentUser?.id)

    let title = ''
    let description = ''
    let members: NeighborhoodMember[] = []
    let metadata: any = {}

    // Route to appropriate data fetching based on type
    switch (type) {
      case 'ring': {
        let ring = null
        let ringMembers: any[] = []

        // Use Ring Hub if enabled
        if (featureFlags.ringhub()) {
          const client = getRingHubClient()
          if (client) {
            try {
              // Fetch ring from Ring Hub with a short SSR deadline; timeout -> local fallback.
              const ringDescriptor = await raceHubCall(client.getRing(param))
              if (ringDescriptor !== HUB_TIMEOUT && ringDescriptor) {
                ring = transformRingDescriptorToThreadRing(ringDescriptor)

                // Fetch members from Ring Hub (bounded; failure/timeout just yields no members)
                const ringHubMembersResponse = await raceHubCall(client.getRingMembers(param))
                if (ringHubMembersResponse !== HUB_TIMEOUT && ringHubMembersResponse && ringHubMembersResponse.members) {
                  ringMembers = ringHubMembersResponse.members
                }
              }
            } catch (error) {
              console.error('Error fetching ring from Ring Hub:', error)
            }
          }
        }

        // Fallback to local database if Ring Hub fails or is disabled
        if (!ring) {
          const localRing = await db.threadRing.findUnique({
            where: { slug: param },
            include: {
              members: {
                include: {
                  user: {
                    include: {
                      handles: true,
                      profile: true
                    }
                  }
                }
              }
            }
          })

          if (!localRing) return { notFound: true }

          ring = localRing
          ringMembers = localRing.members
        }

        if (!ring) return { notFound: true }

        title = `${ring.name} Neighborhood`
        description = ring.description || `The homes of ${ring.name} ring members`
        metadata = { ringName: ring.name, ringSlug: ring.slug }

        // For Ring Hub members, use the proper transformer to resolve local user accounts
        let resolvedMembers: any[] = []

        if (featureFlags.ringhub() && ringMembers.length > 0) {
          // Batched member resolution (no N+1): one bulk DID map + one user findMany.
          try {
            const resolved = await transformRingMembersBatchWithUserResolution(
              ringMembers,
              param as string,
              db
            )
            resolvedMembers = resolved.map((resolvedMember) => ({
              userId: resolvedMember.userId,
              user: {
                id: resolvedMember.user.id,
                handles: resolvedMember.user.handles,
                profile: {
                  displayName: resolvedMember.user.displayName,
                  avatarUrl: resolvedMember.user.avatarUrl
                }
              },
              role: resolvedMember.role,
              joinedAt: resolvedMember.joinedAt
            }))
          } catch (error) {
            console.error('Error resolving Ring Hub members:', error)
            resolvedMembers = []
          }
        } else {
          // Use local members directly
          resolvedMembers = ringMembers
        }

        // Get home configs for resolved members
        const memberUserIds = resolvedMembers.map(m => m.userId || m.user?.id).filter(Boolean)
        const homeConfigs = await db.userHomeConfig.findMany({
          where: { userId: { in: memberUserIds }, user: visibleOwners },
          include: {
            decorations: true
          }
        })

        // Get all unique decoration IDs from all decorations
        const allDecorationIds = new Set<string>()
        homeConfigs.forEach(config => {
          config.decorations?.forEach(dec => {
            allDecorationIds.add(dec.decorationId)
          })
        })

        // Fetch decoration items for renderSvg and pngUrl
        const decorationItems = await db.decorationItem.findMany({
          where: {
            itemId: { in: Array.from(allDecorationIds) }
          },
          select: {
            itemId: true,
            renderSvg: true,
            pngUrl: true
          }
        })
        const decorationItemMap = new Map<string, { renderSvg: string | null; pngUrl: string | null }>(
          decorationItems.map(item => [item.itemId, { renderSvg: item.renderSvg, pngUrl: item.pngUrl }])
        )

        const homeConfigMap = new Map(homeConfigs.map(c => [c.userId, c]))

        const filteredMembers = resolvedMembers
          .filter(m => {
            const user = m.user || m
            return user.handles && user.handles.length > 0
          })
          .map(member => {
            const user = member.user || member
            const handle = user.handles.find((h: any) => h.host === 'threadstead.com') || user.handles[0]
            const config = homeConfigMap.get(user.id)

            if (!handle || !config) return null

            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)

            return {
              userId: user.id,
              username: handle.handle,
              ...(user.profile?.displayName && { displayName: user.profile.displayName }),
              ...(user.profile?.avatarUrl && { avatarUrl: user.profile.avatarUrl }),
              homeConfig: {
                houseTemplate: config.houseTemplate as HouseTemplate,
                palette: config.palette as ColorPalette,
                seasonalOptIn: config.seasonalOptIn,
                houseCustomizations: {
                  ...(config.windowStyle && { windowStyle: config.windowStyle }),
                  ...(config.doorStyle && { doorStyle: config.doorStyle }),
                  ...(config.roofTrim && { roofTrim: config.roofTrim }),
                  ...(config.wallColor && { wallColor: config.wallColor }),
                  ...(config.roofColor && { roofColor: config.roofColor }),
                  ...(config.trimColor && { trimColor: config.trimColor }),
                  ...(config.windowColor && { windowColor: config.windowColor }),
                  ...(config.detailColor && { detailColor: config.detailColor }),
                  ...(config.houseTitle && { houseTitle: config.houseTitle }),
                  ...(config.houseDescription && { houseDescription: config.houseDescription }),
                  ...(config.houseBoardText && { houseBoardText: config.houseBoardText }),
                  ...(config.houseNumber && { houseNumber: config.houseNumber }),
                  ...(config.houseNumberStyle && { houseNumberStyle: config.houseNumberStyle }),
                  ...(config.welcomeMat && { welcomeMat: config.welcomeMat }),
                  ...(config.welcomeMatText && { welcomeMatText: config.welcomeMatText }),
                  ...(config.welcomeMatColor && { welcomeMatColor: config.welcomeMatColor }),
                  ...(config.chimneyStyle && { chimneyStyle: config.chimneyStyle }),
                  ...(config.exteriorLights && { exteriorLights: config.exteriorLights }),
                  ...(config.windowTreatments && { windowTreatments: config.windowTreatments })
                },
                atmosphere: {
                  sky: config.atmosphereSky,
                  weather: config.atmosphereWeather,
                  timeOfDay: config.atmosphereTimeOfDay
                },
                hasDecorations: config.decorations && config.decorations.length > 0,
                decorationCount: config.decorations ? config.decorations.length : 0,
                decorations: config.decorations ? config.decorations.map(d => ({
                  id: d.id,
                  decorationType: d.decorationType as 'plant' | 'path' | 'feature' | 'seasonal',
                  decorationId: d.decorationId,
                  ...(d.variant && { variant: d.variant }),
                  ...(d.size && { size: d.size as 'small' | 'medium' | 'large' }),
                  x: d.positionX,
                  y: d.positionY,
                  layer: d.layer,
                  ...(decorationItemMap.has(d.decorationId) && {
                    renderSvg: decorationItemMap.get(d.decorationId)?.renderSvg,
                    pngUrl: decorationItemMap.get(d.decorationId)?.pngUrl
                  }),
                  ...(d.data && { data: d.data })
                })) : [],
                terrain: (config.terrain as Record<string, string>) || {}
              },
              stats: {
                ringMemberships: 1,
                isActive: config.updatedAt > weekAgo
              },
              connections: {
                mutualRings: 1, // They're in this ring
                mutualFriends: 0,
                isFollowing: false,
                isFollower: false
              },
              joinedAt: typeof member.joinedAt === 'string' ? member.joinedAt : member.joinedAt?.toISOString() || new Date().toISOString(),
              role: member.role
            }
          })
          .filter(m => m !== null)

        members = filteredMembers as NeighborhoodMember[]
        break
      }

      case 'mutual': {
        // Fetch mutual friends neighborhood
        title = `Mutual Friends with ${param}`
        description = `Homes of people you both know through ${param}`
        metadata = { targetUsername: param }

        // Implementation would fetch mutual friends
        // For now, using explore as fallback
        const homeConfigs = await db.userHomeConfig.findMany({
          where: { user: visibleOwners },
          include: {
            user: {
              include: {
                handles: true,
                profile: true
              }
            },
            decorations: true
          },
          take: 30
        })

        // Get all unique decoration IDs from all decorations
        const allDecorationIds = new Set<string>()
        homeConfigs.forEach(config => {
          config.decorations?.forEach(dec => {
            allDecorationIds.add(dec.decorationId)
          })
        })

        // Fetch decoration items for renderSvg and pngUrl
        const decorationItems = await db.decorationItem.findMany({
          where: {
            itemId: { in: Array.from(allDecorationIds) }
          },
          select: {
            itemId: true,
            renderSvg: true,
            pngUrl: true
          }
        })
        const decorationItemMap = new Map<string, { renderSvg: string | null; pngUrl: string | null }>(
          decorationItems.map(item => [item.itemId, { renderSvg: item.renderSvg, pngUrl: item.pngUrl }])
        )

        members = homeConfigs
          .filter(config => config.user.handles.length > 0)
          .map(config => {
            const user = config.user
            const handle = user.handles.find(h => h.host === 'threadstead.com') || user.handles[0]

            if (!handle) return null

            return {
              userId: user.id,
              username: handle.handle,
              ...(user.profile?.displayName && { displayName: user.profile.displayName }),
              ...(user.profile?.avatarUrl && { avatarUrl: user.profile.avatarUrl }),
              homeConfig: {
                houseTemplate: config.houseTemplate as HouseTemplate,
                palette: config.palette as ColorPalette,
                seasonalOptIn: config.seasonalOptIn,
                houseCustomizations: {
                  ...(config.windowStyle && { windowStyle: config.windowStyle }),
                  ...(config.doorStyle && { doorStyle: config.doorStyle }),
                  ...(config.roofTrim && { roofTrim: config.roofTrim }),
                  ...(config.wallColor && { wallColor: config.wallColor }),
                  ...(config.roofColor && { roofColor: config.roofColor }),
                  ...(config.trimColor && { trimColor: config.trimColor }),
                  ...(config.windowColor && { windowColor: config.windowColor }),
                  ...(config.detailColor && { detailColor: config.detailColor }),
                  ...(config.houseTitle && { houseTitle: config.houseTitle }),
                  ...(config.houseDescription && { houseDescription: config.houseDescription }),
                  ...(config.houseBoardText && { houseBoardText: config.houseBoardText }),
                  ...(config.houseNumber && { houseNumber: config.houseNumber }),
                  ...(config.houseNumberStyle && { houseNumberStyle: config.houseNumberStyle }),
                  ...(config.welcomeMat && { welcomeMat: config.welcomeMat }),
                  ...(config.welcomeMatText && { welcomeMatText: config.welcomeMatText }),
                  ...(config.welcomeMatColor && { welcomeMatColor: config.welcomeMatColor }),
                  ...(config.chimneyStyle && { chimneyStyle: config.chimneyStyle }),
                  ...(config.exteriorLights && { exteriorLights: config.exteriorLights }),
                  ...(config.windowTreatments && { windowTreatments: config.windowTreatments })
                },
                atmosphere: {
                  sky: config.atmosphereSky,
                  weather: config.atmosphereWeather,
                  timeOfDay: config.atmosphereTimeOfDay
                },
                hasDecorations: config.decorations && config.decorations.length > 0,
                decorationCount: config.decorations ? config.decorations.length : 0,
                decorations: config.decorations ? config.decorations.map(d => ({
                  id: d.id,
                  decorationType: d.decorationType as 'plant' | 'path' | 'feature' | 'seasonal',
                  decorationId: d.decorationId,
                  ...(d.variant && { variant: d.variant }),
                  ...(d.size && { size: d.size as 'small' | 'medium' | 'large' }),
                  x: d.positionX,
                  y: d.positionY,
                  layer: d.layer,
                  ...(decorationItemMap.has(d.decorationId) && {
                    renderSvg: decorationItemMap.get(d.decorationId)?.renderSvg,
                    pngUrl: decorationItemMap.get(d.decorationId)?.pngUrl
                  }),
                  ...(d.data && { data: d.data })
                })) : [],
                terrain: (config.terrain as Record<string, string>) || {}
              },
              stats: {
                isActive: false
              }
            }
          })
          .filter(m => m !== null)
        break
      }

      case 'explore': {
        const orderBy = { updatedAt: 'desc' as const }
        const take = 60

        // One street: every home, most recently updated first. The old
        // all/recent/popular/random params redirect to /neighborhood.
        title = 'The street'
        description = 'Pixel homes, most recently updated first.'

        const homeConfigs = await db.userHomeConfig.findMany({
          include: {
            user: {
              include: {
                handles: true,
                profile: true,
                sessions: {
                  where: {
                    expiresAt: { gte: new Date() },
                    issuedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                  },
                  select: { id: true }
                }
              }
            },
            decorations: true
          },
          where: { user: visibleOwners },
          orderBy,
          take
        })

        // Get all unique decoration IDs from all decorations
        const allDecorationIds = new Set<string>()
        homeConfigs.forEach(config => {
          config.decorations?.forEach(dec => {
            allDecorationIds.add(dec.decorationId)
          })
        })

        // Fetch decoration items for renderSvg and pngUrl
        const decorationItems = await db.decorationItem.findMany({
          where: {
            itemId: { in: Array.from(allDecorationIds) }
          },
          select: {
            itemId: true,
            renderSvg: true,
            pngUrl: true
          }
        })
        const decorationItemMap = new Map<string, { renderSvg: string | null; pngUrl: string | null }>(
          decorationItems.map(item => [item.itemId, { renderSvg: item.renderSvg, pngUrl: item.pngUrl }])
        )

        const processedMembers = homeConfigs
          .filter(config => config.user.handles.length > 0)
          .map(config => {
            const user = config.user
            const handle = user.handles.find(h => h.host === 'threadstead.com') || user.handles[0]

            if (!handle) return null

            return {
              userId: user.id,
              username: handle.handle,
              ...(user.profile?.displayName && { displayName: user.profile.displayName }),
              ...(user.profile?.avatarUrl && { avatarUrl: user.profile.avatarUrl }),
              homeConfig: {
                houseTemplate: config.houseTemplate as HouseTemplate,
                palette: config.palette as ColorPalette,
                seasonalOptIn: config.seasonalOptIn,
                houseCustomizations: {
                  ...(config.windowStyle && { windowStyle: config.windowStyle }),
                  ...(config.doorStyle && { doorStyle: config.doorStyle }),
                  ...(config.roofTrim && { roofTrim: config.roofTrim }),
                  ...(config.wallColor && { wallColor: config.wallColor }),
                  ...(config.roofColor && { roofColor: config.roofColor }),
                  ...(config.trimColor && { trimColor: config.trimColor }),
                  ...(config.windowColor && { windowColor: config.windowColor }),
                  ...(config.detailColor && { detailColor: config.detailColor }),
                  ...(config.houseTitle && { houseTitle: config.houseTitle }),
                  ...(config.houseDescription && { houseDescription: config.houseDescription }),
                  ...(config.houseBoardText && { houseBoardText: config.houseBoardText }),
                  ...(config.houseNumber && { houseNumber: config.houseNumber }),
                  ...(config.houseNumberStyle && { houseNumberStyle: config.houseNumberStyle }),
                  ...(config.welcomeMat && { welcomeMat: config.welcomeMat }),
                  ...(config.welcomeMatText && { welcomeMatText: config.welcomeMatText }),
                  ...(config.welcomeMatColor && { welcomeMatColor: config.welcomeMatColor }),
                  ...(config.chimneyStyle && { chimneyStyle: config.chimneyStyle }),
                  ...(config.exteriorLights && { exteriorLights: config.exteriorLights }),
                  ...(config.windowTreatments && { windowTreatments: config.windowTreatments })
                },
                atmosphere: {
                  sky: config.atmosphereSky,
                  weather: config.atmosphereWeather,
                  timeOfDay: config.atmosphereTimeOfDay
                },
                hasDecorations: config.decorations && config.decorations.length > 0,
                decorationCount: config.decorations ? config.decorations.length : 0,
                decorations: config.decorations ? config.decorations.map(d => ({
                  id: d.id,
                  decorationType: d.decorationType as 'plant' | 'path' | 'feature' | 'seasonal',
                  decorationId: d.decorationId,
                  ...(d.variant && { variant: d.variant }),
                  ...(d.size && { size: d.size as 'small' | 'medium' | 'large' }),
                  x: d.positionX,
                  y: d.positionY,
                  layer: d.layer,
                  ...(decorationItemMap.has(d.decorationId) && {
                    renderSvg: decorationItemMap.get(d.decorationId)?.renderSvg,
                    pngUrl: decorationItemMap.get(d.decorationId)?.pngUrl
                  }),
                  ...(d.data && { data: d.data })
                })) : [],
                terrain: (config.terrain as Record<string, string>) || {}
              },
              stats: {
                isActive: user.sessions && user.sessions.length > 0
              }
            }
          })
          .filter(m => m !== null)

        members = processedMembers
        break
      }

      default:
        return { notFound: true }
    }

    return {
      props: {
        type,
        param,
        title,
        description,
        members,
        totalCount: members.length,
        metadata,
        currentUserId: currentUser?.id || null
      }
    }

  } catch (error) {
    console.error('Neighborhood SSR error:', error)
    return { notFound: true }
  }
}