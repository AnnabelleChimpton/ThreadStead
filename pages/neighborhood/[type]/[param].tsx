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
  
  // Load user's preferred view mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('neighborhoodViewMode') as ViewMode
    if (savedMode && ['street', 'grid', 'map'].includes(savedMode)) {
      setViewMode(savedMode)
    }
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
  
  const pageTitle = `🏘️ ${title} - ThreadStead Neighborhoods`
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
          {/* Header */}
          <div className="bg-thread-paper border-b border-thread-sage sticky top-0 z-40">
            <div className="container mx-auto px-4 py-4">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-thread-sage mb-3">
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
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-headline font-bold text-thread-pine mb-2">
                    {title}
                  </h1>
                  <p className="text-thread-sage max-w-2xl mb-3">
                    {description}
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
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
        // Fetch ring neighborhood
        const ring = await db.threadRing.findUnique({
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
        
        if (!ring) return { notFound: true }
        
        title = `🏘️ ${ring.name} Neighborhood`
        description = ring.description || `Explore the homes of ${ring.name} ring members`
        metadata = { ringName: ring.name, ringSlug: ring.slug }
        
        // Get home configs for ring members
        const memberUserIds = ring.members.map(m => m.userId)
        const homeConfigs = await db.userHomeConfig.findMany({
          where: { userId: { in: memberUserIds } },
          include: {
            decorations: {
              select: {
                id: true,
                decorationType: true,
                decorationId: true,
                variant: true,
                size: true,
                positionX: true,
                positionY: true,
                layer: true
              }
            }
          }
        })
        
        const homeConfigMap = new Map(homeConfigs.map(c => [c.userId, c]))
        
        const filteredMembers = ring.members
          .filter(m => m.user.handles.length > 0)
          .map(member => {
            const user = member.user
            const handle = user.handles.find(h => h.host === 'threadstead.com') || user.handles[0]
            const config = homeConfigMap.get(user.id)
            
            if (!handle || !config) return null
            
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            
            return {
              userId: user.id,
              username: handle.handle,
              displayName: user.profile?.displayName || undefined,
              avatarUrl: user.profile?.avatarUrl || undefined,
              homeConfig: {
                houseTemplate: config.houseTemplate as HouseTemplate,
                palette: config.palette as ColorPalette,
                seasonalOptIn: config.seasonalOptIn,
                houseCustomizations: {
                  windowStyle: config.windowStyle || undefined,
                  doorStyle: config.doorStyle || undefined,
                  roofTrim: config.roofTrim || undefined,
                  wallColor: config.wallColor || undefined,
                  roofColor: config.roofColor || undefined,
                  trimColor: config.trimColor || undefined,
                  windowColor: config.windowColor || undefined,
                  detailColor: config.detailColor || undefined,
                  houseTitle: config.houseTitle || undefined,
                  houseDescription: config.houseDescription || undefined,
                  houseBoardText: config.houseBoardText || undefined
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
                  variant: d.variant || undefined,
                  size: d.size as 'small' | 'medium' | 'large' || undefined,
                  x: d.positionX,
                  y: d.positionY,
                  layer: d.layer
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
              joinedAt: member.joinedAt.toISOString(),
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
            decorations: {
              select: {
                id: true,
                decorationType: true,
                decorationId: true,
                variant: true,
                size: true,
                positionX: true,
                positionY: true,
                layer: true
              }
            }
          },
          take: 30
        })
        
        members = homeConfigs
          .filter(config => config.user.handles.length > 0)
          .map(config => {
            const user = config.user
            const handle = user.handles.find(h => h.host === 'threadstead.com') || user.handles[0]
            
            if (!handle) return null
            
            return {
              userId: user.id,
              username: handle.handle,
              displayName: user.profile?.displayName || undefined,
              avatarUrl: user.profile?.avatarUrl || undefined,
              homeConfig: {
                houseTemplate: config.houseTemplate as HouseTemplate,
                palette: config.palette as ColorPalette,
                seasonalOptIn: config.seasonalOptIn,
                houseCustomizations: {
                  windowStyle: config.windowStyle || undefined,
                  doorStyle: config.doorStyle || undefined,
                  roofTrim: config.roofTrim || undefined,
                  wallColor: config.wallColor || undefined,
                  roofColor: config.roofColor || undefined,
                  trimColor: config.trimColor || undefined,
                  windowColor: config.windowColor || undefined,
                  detailColor: config.detailColor || undefined,
                  houseTitle: config.houseTitle || undefined,
                  houseDescription: config.houseDescription || undefined,
                  houseBoardText: config.houseBoardText || undefined
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
                  variant: d.variant || undefined,
                  size: d.size as 'small' | 'medium' | 'large' || undefined,
                  x: d.positionX,
                  y: d.positionY,
                  layer: d.layer
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
            title = '🌍 Explore All Neighborhoods'
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
            title = '🌍 Explore All Neighborhoods'
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
            decorations: {
              select: {
                id: true,
                decorationType: true,
                decorationId: true,
                variant: true,
                size: true,
                positionX: true,
                positionY: true,
                layer: true
              }
            }
          },
          orderBy,
          take
        })
        
        let processedMembers = homeConfigs
          .filter(config => config.user.handles.length > 0)
          .map(config => {
            const user = config.user
            const handle = user.handles.find(h => h.host === 'threadstead.com') || user.handles[0]
            
            if (!handle) return null
            
            return {
              userId: user.id,
              username: handle.handle,
              displayName: user.profile?.displayName || undefined,
              avatarUrl: user.profile?.avatarUrl || undefined,
              homeConfig: {
                houseTemplate: config.houseTemplate as HouseTemplate,
                palette: config.palette as ColorPalette,
                seasonalOptIn: config.seasonalOptIn,
                houseCustomizations: {
                  windowStyle: config.windowStyle || undefined,
                  doorStyle: config.doorStyle || undefined,
                  roofTrim: config.roofTrim || undefined,
                  wallColor: config.wallColor || undefined,
                  roofColor: config.roofColor || undefined,
                  trimColor: config.trimColor || undefined,
                  windowColor: config.windowColor || undefined,
                  detailColor: config.detailColor || undefined,
                  houseTitle: config.houseTitle || undefined,
                  houseDescription: config.houseDescription || undefined,
                  houseBoardText: config.houseBoardText || undefined
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
                  variant: d.variant || undefined,
                  size: d.size as 'small' | 'medium' | 'large' || undefined,
                  x: d.positionX,
                  y: d.positionY,
                  layer: d.layer
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