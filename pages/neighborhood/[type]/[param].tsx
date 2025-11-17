import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useState, useEffect } from 'react'
import Layout from '../../../components/ui/layout/Layout'
import NeighborhoodStreetView from '../../../components/pixel-homes/NeighborhoodStreetView'
import NeighborhoodGridView from '../../../components/pixel-homes/NeighborhoodGridView'
import NeighborhoodMapView from '../../../components/pixel-homes/NeighborhoodMapView'
import { HouseTemplate, ColorPalette } from '../../../components/pixel-homes/HouseSVG'
import { db } from '../../../lib/config/database/connection'
import Link from 'next/link'
import { featureFlags } from '@/lib/utils/features/feature-flags'
import { getRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { transformRingDescriptorToThreadRing, transformRingMemberWithUserResolution } from '@/lib/api/ringhub/ringhub-transformers'
import { weatherWidget } from '@/components/widgets/examples/WeatherWidget'

// Helper to format temperature with correct unit based on country
const formatTemperature = (temp: number, countryCode?: string): string => {
  // Only US, Liberia, Myanmar, and US territories use Fahrenheit
  const usesImperial = countryCode && ['US', 'LR', 'MM', 'PR', 'GU', 'VI', 'AS', 'MP'].includes(countryCode.toUpperCase())

  if (usesImperial) {
    return `${temp}°F`
  } else {
    // Convert Fahrenheit to Celsius for metric countries
    const celsius = Math.round((temp - 32) * 5/9)
    return `${celsius}°C`
  }
}

// Neighborhood member data structure
interface NeighborhoodMember {
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
    }[]
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

type ViewMode = 'street' | 'grid' | 'map'

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
  const [viewMode, setViewMode] = useState<ViewMode>('street')
  const [filterActive, setFilterActive] = useState(false)
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical' | 'random'>('recent')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [templateFilter, setTemplateFilter] = useState<string>('')
  const [paletteFilter, setPaletteFilter] = useState<string>('')
  const [weatherData, setWeatherData] = useState<any>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  
  // Load user's preferred view mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('neighborhoodViewMode') as ViewMode
    if (savedMode && ['street', 'grid', 'map'].includes(savedMode)) {
      setViewMode(savedMode)
    }
  }, [])

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
    localStorage.setItem('neighborhoodViewMode', mode)
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
        return a.username.localeCompare(b.username)
      }
      if (sortBy === 'random') {
        return Math.random() - 0.5
      }
      // Default: recent (by joinedAt or activity)
      return (b.joinedAt || '').localeCompare(a.joinedAt || '')
    })
  
  const pageTitle = `${title} - ThreadStead Neighborhoods`
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
          {/* Header - more compact for street view */}
          <div className="bg-thread-paper border-b border-thread-sage sticky top-0 z-40">
            <div className="container mx-auto px-4 py-2">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-thread-sage mb-2">
                <Link href="/" className="hover:text-thread-pine transition-colors">
                  Home
                </Link>
                <span>→</span>
                <Link href="/neighborhood/explore/all" className="hover:text-thread-pine transition-colors">
                  Explore
                </Link>
                <span>→</span>
                <span className="text-thread-pine font-medium">{title}</span>
              </div>
              
              {/* Unified header with flex layout */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                <div className="flex-1">
                  <h1 className="text-xl font-headline font-bold text-thread-pine mb-1">
                    {title}
                  </h1>
                  <p className="text-thread-sage max-w-2xl mb-2 text-sm">
                    {description}
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-thread-pine">{processedMembers.length}</span>
                      <span className="text-thread-sage">homes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-thread-sage">{activeCount} active</span>
                    </div>
                    {type === 'explore' && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-thread-pine">{processedMembers.filter(m => m.connections?.mutualRings && m.connections.mutualRings > 0).length}</span>
                        <span className="text-thread-sage">connected</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Compact navigation for explore */}
                  {type === 'explore' && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Link
                        href="/neighborhood/explore/all"
                        className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                          param === 'all'
                            ? 'bg-thread-sage text-thread-paper'
                            : 'bg-thread-cream text-thread-sage hover:bg-thread-sage hover:text-thread-paper'
                        }`}
                      >
                        🌍 All
                      </Link>
                      <Link
                        href="/neighborhood/explore/recent"
                        className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                          param === 'recent'
                            ? 'bg-thread-sage text-thread-paper'
                            : 'bg-thread-cream text-thread-sage hover:bg-thread-sage hover:text-thread-paper'
                        }`}
                      >
                        ⚡ Recent
                      </Link>
                      <Link
                        href="/neighborhood/explore/popular"
                        className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                          param === 'popular'
                            ? 'bg-thread-sage text-thread-paper'
                            : 'bg-thread-cream text-thread-sage hover:bg-thread-sage hover:text-thread-paper'
                        }`}
                      >
                        🔥 Popular
                      </Link>
                      <Link
                        href="/neighborhood/explore/random"
                        className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                          param === 'random'
                            ? 'bg-thread-sage text-thread-paper'
                            : 'bg-thread-cream text-thread-sage hover:bg-thread-sage hover:text-thread-paper'
                        }`}
                      >
                        🎲 Random
                      </Link>
                    </div>
                  )}

                  {/* Demo Banner for visitors exploring pixel homes */}
                  {type === 'explore' && !currentUserId && (
                    <div className="mt-3 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-300 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl flex-shrink-0">🎨</span>
                        <div className="flex-1">
                          <div className="font-semibold text-thread-pine text-sm">New to Pixel Homes?</div>
                          <div className="text-xs text-thread-sage">Try our interactive demo to see what you can build!</div>
                        </div>
                        <Link
                          href="/home/demo"
                          className="px-4 py-2 bg-pink-200 hover:bg-pink-300 border border-pink-400 rounded-md text-sm font-medium transition-colors shadow-sm hover:shadow-md flex-shrink-0"
                        >
                          Try Demo →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              
                {/* View Controls */}
                <div className="flex flex-col gap-3">
                  {/* View Mode Toggle */}
                  <div className="flex bg-thread-cream border border-thread-sage rounded-lg p-1">
                    <button
                      onClick={() => handleViewModeChange('street')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'street'
                          ? 'bg-thread-sage text-thread-paper shadow-sm'
                          : 'text-thread-sage hover:text-thread-pine'
                      }`}
                      title="Street View - Immersive neighborhood experience"
                    >
                      🏘️ Street
                    </button>
                    <button
                      onClick={() => handleViewModeChange('grid')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'grid'
                          ? 'bg-thread-sage text-thread-paper shadow-sm'
                          : 'text-thread-sage hover:text-thread-pine'
                      }`}
                      title="Grid View - Efficient browsing"
                    >
                      ⊞ Grid
                    </button>
                    <button
                      onClick={() => handleViewModeChange('map')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'map'
                          ? 'bg-thread-sage text-thread-paper shadow-sm'
                          : 'text-thread-sage hover:text-thread-pine'
                      }`}
                      title="Map View - Bird's eye perspective"
                    >
                      🗺️ Map
                    </button>
                  </div>
                  
                  {/* Filter Options */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterActive(!filterActive)}
                      className={`px-3 py-1.5 text-sm rounded-md border transition-all ${
                        filterActive
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-thread-paper border-thread-sage text-thread-sage hover:bg-thread-cream'
                      }`}
                    >
                      {filterActive ? '✓ Active Only' : '○ Active Only'}
                    </button>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-1.5 text-sm rounded-md border border-thread-sage bg-thread-paper text-thread-pine"
                    >
                      <option value="recent">Recent</option>
                      <option value="alphabetical">A-Z</option>
                      <option value="random">Random</option>
                    </select>
                    <button
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className="px-3 py-1.5 text-sm rounded-md border border-thread-sage text-thread-sage hover:bg-thread-cream transition-colors"
                      title="Advanced filtering options"
                    >
                      🔍 {showAdvancedFilters ? 'Less' : 'More'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Advanced Filters - Collapsible */}
              {showAdvancedFilters && (
                <div className="mt-3 bg-thread-cream border border-thread-sage rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* House Style Filter */}
                    <div>
                      <label className="block text-xs font-medium text-thread-pine mb-2">🏠 House Style</label>
                      <select
                        value={templateFilter}
                        onChange={(e) => setTemplateFilter(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-thread-sage rounded-md bg-thread-paper text-thread-pine"
                      >
                        <option value="">All Styles</option>
                        <option value="cottage_v1">🏠 Cottages</option>
                        <option value="townhouse_v1">🏢 Townhouses</option>
                        <option value="loft_v1">🏭 Lofts</option>
                        <option value="cabin_v1">🏕️ Cabins</option>
                      </select>
                    </div>
                    
                    {/* Color Theme Filter */}
                    <div>
                      <label className="block text-xs font-medium text-thread-pine mb-2">🎨 Color Theme</label>
                      <select
                        value={paletteFilter}
                        onChange={(e) => setPaletteFilter(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-thread-sage rounded-md bg-thread-paper text-thread-pine"
                      >
                        <option value="">All Themes</option>
                        <option value="thread_sage">🌿 Thread Sage</option>
                        <option value="charcoal_nights">🌃 Charcoal Nights</option>
                        <option value="pixel_petals">🌸 Pixel Petals</option>
                        <option value="crt_glow">💻 CRT Glow</option>
                        <option value="classic_linen">📜 Classic Linen</option>
                      </select>
                    </div>
                    
                    {/* Results Counter */}
                    <div className="flex items-end">
                      <div className="text-xs text-thread-sage">
                        <div className="font-medium text-thread-pine">{processedMembers.length} of {totalCount}</div>
                        <div>homes match filters</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Clear Filters */}
                  {(templateFilter || paletteFilter || filterActive) && (
                    <div className="mt-3 pt-3 border-t border-thread-sage">
                      <button
                        onClick={() => {
                          setTemplateFilter('')
                          setPaletteFilter('')
                          setFilterActive(false)
                        }}
                        className="text-xs text-thread-sage hover:text-thread-pine transition-colors"
                      >
                        ✕ Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Neighborhood View */}
          <div className="relative">
            {/* Weather Overlay - Top Left Corner for explore pages */}
            {type === 'explore' && (
              <div className="absolute top-4 left-4 z-30">
                <div className="bg-thread-paper bg-opacity-95 border border-thread-sage rounded-lg px-3 py-2 shadow-lg">
                  {weatherLoading ? (
                    <div className="flex items-center gap-2 text-xs text-thread-sage">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-thread-sage"></div>
                      <span>Loading weather...</span>
                    </div>
                  ) : weatherData ? (
                    <div className="text-xs text-thread-pine">
                      <span>It&apos;s a {weatherData.condition.toLowerCase()} {formatTemperature(weatherData.temperature, weatherData.countryCode)} day in the neighborhood</span>
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
            {type === 'explore' ? (
              <>
                {/* Discovery Tips for explore pages */}
                <div className="bg-thread-paper border border-thread-sage rounded-lg p-8 shadow-sm mb-8">
                  <h3 className="text-lg font-headline font-medium text-thread-pine text-center mb-6">
                    💡 Discovery Tips
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    <div className="text-center p-4 bg-thread-cream rounded-lg border border-thread-sage">
                      <div className="text-2xl mb-3">🎨</div>
                      <div className="font-medium text-thread-pine mb-2">Explore by Style</div>
                      <div className="text-sm text-thread-sage leading-relaxed">
                        Use the view mode toggle to see homes in Street, Grid, or Map view for different perspectives
                      </div>
                    </div>
                    <div className="text-center p-4 bg-thread-cream rounded-lg border border-thread-sage">
                      <div className="text-2xl mb-3">🔗</div>
                      <div className="font-medium text-thread-pine mb-2">Find Connections</div>
                      <div className="text-sm text-thread-sage leading-relaxed">
                        Discover mutual friends, ThreadRing members, or people in your extended network
                      </div>
                    </div>
                    <div className="text-center p-4 bg-thread-cream rounded-lg border border-thread-sage">
                      <div className="text-2xl mb-3">⚡</div>
                      <div className="font-medium text-thread-pine mb-2">Stay Current</div>
                      <div className="text-sm text-thread-sage leading-relaxed">
                        Visit recently updated homes or popular destinations to see what&apos;s trending
                      </div>
                    </div>
                  </div>
                </div>

                {/* Random Discovery */}
                {param !== 'random' && (
                  <div className="bg-thread-paper border border-thread-sage rounded-lg p-6 shadow-sm text-center mb-8">
                    <h3 className="text-lg font-headline font-medium text-thread-pine mb-4">
                      🎲 Feeling Adventurous?
                    </h3>
                    <p className="text-thread-sage mb-4 max-w-md mx-auto">
                      Let serendipity guide you to unexpected connections and interesting homes
                    </p>
                    <Link
                      href="/neighborhood/explore/random"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-thread-sage text-thread-paper rounded-md font-medium hover:bg-thread-pine transition-colors shadow-sm"
                    >
                      🎲 Random Home Adventure
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-thread-paper border border-thread-sage rounded-lg p-6 text-center">
                <h3 className="text-lg font-headline font-medium text-thread-pine mb-4">
                  🔍 Discover More Neighborhoods
                </h3>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    href="/neighborhood/explore/all"
                    className="px-4 py-2 bg-thread-sage text-thread-paper rounded-md hover:bg-thread-pine transition-colors"
                  >
                    🌍 Explore All Homes
                  </Link>
                  {type !== 'ring' && metadata.ringSlug && (
                    <Link
                      href={`/neighborhood/ring/${metadata.ringSlug}`}
                      className="px-4 py-2 border border-thread-sage text-thread-sage rounded-md hover:bg-thread-sage hover:text-thread-paper transition-colors"
                    >
                      🏛️ Ring Neighborhood
                    </Link>
                  )}
                  <Link
                    href="/rings"
                    className="px-4 py-2 border border-thread-sage text-thread-sage rounded-md hover:bg-thread-sage hover:text-thread-paper transition-colors"
                  >
                    💫 Browse ThreadRings
                  </Link>
                </div>
              </div>
            )}
          </div>
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
              // Fetch ring from Ring Hub
              const ringDescriptor = await client.getRing(param)
              if (ringDescriptor) {
                ring = transformRingDescriptorToThreadRing(ringDescriptor)

                // Fetch members from Ring Hub
                try {
                  const ringHubMembersResponse = await client.getRingMembers(param)
                  if (ringHubMembersResponse && ringHubMembersResponse.members) {
                    ringMembers = ringHubMembersResponse.members
                  }
                } catch (error) {
                  console.error('Error fetching Ring Hub members:', error)
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
        
        title = `🏘️ ${ring.name} Neighborhood`
        description = ring.description || `Explore the homes of ${ring.name} ring members`
        metadata = { ringName: ring.name, ringSlug: ring.slug }
        
        // For Ring Hub members, use the proper transformer to resolve local user accounts
        let resolvedMembers: any[] = []

        if (featureFlags.ringhub() && ringMembers.length > 0) {
          // Use the same transformer that the API uses for proper member resolution
          resolvedMembers = await Promise.all(
            ringMembers.map(async (member) => {
              try {
                const resolvedMember = await transformRingMemberWithUserResolution(
                  member,
                  param as string,
                  db
                )

                return {
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
                }
              } catch (error) {
                console.error('Error resolving Ring Hub member:', error)
                return null
              }
            })
          )
          resolvedMembers = resolvedMembers.filter(Boolean)
        } else {
          // Use local members directly
          resolvedMembers = ringMembers
        }

        // Get home configs for resolved members
        const memberUserIds = resolvedMembers.map(m => m.userId || m.user?.id).filter(Boolean)
        const homeConfigs = await db.userHomeConfig.findMany({
          where: { userId: { in: memberUserIds } },
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

        // Fetch decoration items for renderSvg
        const decorationItems = await db.decorationItem.findMany({
          where: {
            itemId: { in: Array.from(allDecorationIds) }
          },
          select: {
            itemId: true,
            renderSvg: true
          }
        })
        const decorationItemMap = new Map(decorationItems.map(item => [item.itemId, item.renderSvg]))

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
                  ...(config.houseBoardText && { houseBoardText: config.houseBoardText })
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
                  ...(decorationItemMap.has(d.decorationId) && { renderSvg: decorationItemMap.get(d.decorationId) })
                })) : []
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
        title = `🤝 Mutual Friends with ${param}`
        description = `Discover homes of people connected to ${param}`
        metadata = { targetUsername: param }
        
        // Implementation would fetch mutual friends
        // For now, using explore as fallback
        const homeConfigs = await db.userHomeConfig.findMany({
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

        // Fetch decoration items for renderSvg
        const decorationItems = await db.decorationItem.findMany({
          where: {
            itemId: { in: Array.from(allDecorationIds) }
          },
          select: {
            itemId: true,
            renderSvg: true
          }
        })
        const decorationItemMap = new Map(decorationItems.map(item => [item.itemId, item.renderSvg]))

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
                  ...(config.houseBoardText && { houseBoardText: config.houseBoardText })
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
                  ...(decorationItemMap.has(d.decorationId) && { renderSvg: decorationItemMap.get(d.decorationId) })
                })) : []
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
        // Enhanced exploration with different sub-categories
        let orderBy: any = { updatedAt: 'desc' } // default
        let take = 60
        
        switch (param) {
          case 'all':
            title = 'Explore All Neighborhoods'
            description = 'Discover pixel homes across all of ThreadStead'
            break
          case 'recent':
            title = '⚡ Recently Updated Homes'
            description = 'Explore homes that have been recently updated or customized'
            orderBy = { updatedAt: 'desc' }
            break
          case 'popular':
            title = '🔥 Popular This Week'
            description = 'Discover the most visited and active homes this week'
            orderBy = { updatedAt: 'desc' } // Could be enhanced with actual popularity metrics
            break
          case 'random':
            title = '🎲 Random Home Adventure'
            description = 'Let serendipity guide you to unexpected connections'
            orderBy = { createdAt: 'desc' } // Will shuffle in memory
            take = 30
            break
          default:
            title = 'Explore All Neighborhoods'
            description = 'Discover pixel homes across all of ThreadStead'
        }
        
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

        // Fetch decoration items for renderSvg
        const decorationItems = await db.decorationItem.findMany({
          where: {
            itemId: { in: Array.from(allDecorationIds) }
          },
          select: {
            itemId: true,
            renderSvg: true
          }
        })
        const decorationItemMap = new Map(decorationItems.map(item => [item.itemId, item.renderSvg]))

        let processedMembers = homeConfigs
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
                  ...(config.houseBoardText && { houseBoardText: config.houseBoardText })
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
                  ...(decorationItemMap.has(d.decorationId) && { renderSvg: decorationItemMap.get(d.decorationId) })
                })) : []
              },
              stats: {
                isActive: user.sessions && user.sessions.length > 0
              }
            }
          })
          .filter(m => m !== null)
        
        // Apply randomization if needed
        if (param === 'random') {
          processedMembers = processedMembers.sort(() => Math.random() - 0.5)
        }
        
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
  } finally {
    await db.$disconnect()
  }
}