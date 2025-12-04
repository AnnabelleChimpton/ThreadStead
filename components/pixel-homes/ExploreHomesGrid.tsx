import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import HouseSVG, { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG'
import HouseDetailsPopup from './HouseDetailsPopup'
import { trackNavigation } from '../../lib/analytics/pixel-homes'
import UserMention from '@/components/ui/navigation/UserMention'
import { PixelIcon, PixelIconName } from '@/components/ui/PixelIcon'

interface HomeExploreData {
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
    recentVisits: number
    ringMemberships: number
    isActive: boolean
  }
  connections: {
    mutualRings: number
    mutualFriends: number
    isFollowing: boolean
    isFollower: boolean
  }
}

interface ExploreHomesGridProps {
  homes: HomeExploreData[]
  filters: {
    template?: HouseTemplate
    palette?: ColorPalette
    sortBy: string
    showActiveOnly: boolean
  }
  currentUserId?: string
}

export default function ExploreHomesGrid({ homes, filters, currentUserId }: ExploreHomesGridProps) {
  const router = useRouter()
  const [localFilters, setLocalFilters] = useState(filters)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedHome, setSelectedHome] = useState<HomeExploreData | null>(null)
  const [showPopup, setShowPopup] = useState(false)

  const handleFilterChange = (newFilters: Partial<typeof localFilters>) => {
    const updatedFilters = { ...localFilters, ...newFilters }
    setLocalFilters(updatedFilters)
    
    // Update URL params
    const params = new URLSearchParams()
    if (updatedFilters.template) params.set('template', updatedFilters.template)
    if (updatedFilters.palette) params.set('palette', updatedFilters.palette)
    if (updatedFilters.sortBy !== 'recent') params.set('sort', updatedFilters.sortBy)
    if (updatedFilters.showActiveOnly) params.set('activeOnly', 'true')
    
    router.push(`/neighborhood/explore/all?${params.toString()}`)
  }

  const handleHomeClick = (e: React.MouseEvent, home: HomeExploreData) => {
    e.preventDefault()
    trackNavigation('profile', 'pixel_home', home.username)
    setSelectedHome(home)
    setShowPopup(true)
  }

  // Handle home click with custom source parameter
  const handleHomeClickWithSource = (username: string, source: 'profile' | 'pixel_home' = 'profile') => {
    trackNavigation(source, 'pixel_home', username)
  }

  // Convert HomeExploreData to NeighborhoodMember format for popup
  const convertHomeToMember = (home: HomeExploreData) => {
    return {
      userId: home.userId,
      username: home.username,
      displayName: home.displayName,
      avatarUrl: home.avatarUrl,
      homeConfig: {
        houseTemplate: home.homeConfig.houseTemplate,
        palette: home.homeConfig.palette,
        seasonalOptIn: home.homeConfig.seasonalOptIn,
        houseCustomizations: home.homeConfig.houseCustomizations,
        atmosphere: home.homeConfig.atmosphere,
        hasDecorations: home.homeConfig.hasDecorations,
        decorationCount: home.homeConfig.decorationCount,
        decorations: home.homeConfig.decorations,
      },
      stats: {
        isActive: home.stats.isActive
      },
      connections: {
        mutualRings: home.connections.mutualRings,
        mutualFriends: home.connections.mutualFriends,
        isFollowing: home.connections.isFollowing,
        isFollower: home.connections.isFollower
      }
    }
  }

  const getConnectionBadge = (home: HomeExploreData): { text: string; color: string; icon: PixelIconName } | null => {
    if (!currentUserId) return null

    if (home.connections.isFollowing && home.connections.isFollower) {
      return { text: 'Friends', color: 'bg-green-100 text-green-800', icon: 'users' }
    } else if (home.connections.isFollowing) {
      return { text: 'Following', color: 'bg-blue-100 text-blue-800', icon: 'arrow-right' }
    } else if (home.connections.isFollower) {
      return { text: 'Follows You', color: 'bg-purple-100 text-purple-800', icon: 'arrow-left' }
    } else if (home.connections.mutualRings > 0) {
      return { text: `${home.connections.mutualRings} Mutual Rings`, color: 'bg-yellow-100 text-yellow-800', icon: 'link' }
    }

    return null
  }

  return (
    <div className="space-y-6">
      {/* Advanced Filters */}
      <div className="bg-thread-cream border border-thread-sage rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h3 className="font-headline font-medium text-thread-pine text-lg">Filter & Sort</h3>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-thread-sage mr-2">View:</span>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-thread-sage text-thread-paper shadow-sm' 
                  : 'bg-thread-paper border border-thread-sage text-thread-sage hover:bg-thread-sage hover:text-thread-paper'
              }`}
            >
              ⊞ Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-thread-sage text-thread-paper shadow-sm' 
                  : 'bg-thread-paper border border-thread-sage text-thread-sage hover:bg-thread-sage hover:text-thread-paper'
              }`}
            >
              ≡ List
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Template Filter */}
          <div>
            <label className="block text-sm font-medium text-thread-pine mb-2">House Style</label>
            <select
              value={localFilters.template || ''}
              onChange={(e) => handleFilterChange({ template: e.target.value as HouseTemplate || undefined })}
              className="w-full px-3 py-2 border border-thread-sage rounded-md text-sm bg-thread-paper text-thread-pine focus:ring-2 focus:ring-thread-sage focus:border-thread-sage"
            >
              <option value="">All Styles</option>
              <option value="cottage_v1">🏠 Cottages</option>
              <option value="townhouse_v1">🏢 Townhouses</option>
              <option value="loft_v1">🏭 Lofts</option>
              <option value="cabin_v1">🏕️ Cabins</option>
            </select>
          </div>

          {/* Palette Filter */}
          <div>
            <label className="block text-sm font-medium text-thread-pine mb-2">Color Theme</label>
            <select
              value={localFilters.palette || ''}
              onChange={(e) => handleFilterChange({ palette: e.target.value as ColorPalette || undefined })}
              className="w-full px-3 py-2 border border-thread-sage rounded-md text-sm bg-thread-paper text-thread-pine focus:ring-2 focus:ring-thread-sage focus:border-thread-sage"
            >
              <option value="">All Themes</option>
              <option value="thread_sage">🌿 Thread Sage</option>
              <option value="charcoal_nights">🌃 Charcoal Nights</option>
              <option value="pixel_petals">🌸 Pixel Petals</option>
              <option value="crt_glow">💻 CRT Glow</option>
              <option value="classic_linen">📜 Classic Linen</option>
            </select>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-thread-pine mb-2">Sort By</label>
            <select
              value={localFilters.sortBy}
              onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
              className="w-full px-3 py-2 border border-thread-sage rounded-md text-sm bg-thread-paper text-thread-pine focus:ring-2 focus:ring-thread-sage focus:border-thread-sage"
            >
              <option value="recent">⚡ Recently Updated</option>
              <option value="popular">🔥 Popular</option>
              <option value="alphabetical">🔤 Alphabetical</option>
              <option value="random">🎲 Random</option>
            </select>
          </div>

          {/* Activity Filter */}
          <div>
            <label className="block text-sm font-medium text-thread-pine mb-2">Activity</label>
            <label className="flex items-center gap-3 px-3 py-2 border border-thread-sage rounded-md text-sm bg-thread-paper cursor-pointer hover:bg-thread-cream transition-colors">
              <input
                type="checkbox"
                checked={localFilters.showActiveOnly}
                onChange={(e) => handleFilterChange({ showActiveOnly: e.target.checked })}
                className="text-thread-sage focus:ring-thread-sage"
              />
              <span className="text-thread-pine">Active only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="bg-thread-paper border border-thread-sage rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-thread-pine font-medium">
            Showing {homes.length} home{homes.length !== 1 ? 's' : ''}
          </div>
          
          {currentUserId && (
            <div className="text-sm text-thread-sage">
              {homes.filter(h => h.connections.isFollowing || h.connections.isFollower || h.connections.mutualRings > 0).length} connected to you
            </div>
          )}
        </div>
      </div>

      {/* Grid/List View */}
      {homes.length === 0 ? (
        <div className="bg-thread-paper border border-thread-sage rounded-lg p-12">
          <div className="text-center">
            <div className="mb-4"><PixelIcon name="buildings" size={64} className="mx-auto text-gray-400" /></div>
            <div className="text-xl font-headline text-thread-pine mb-2">No homes found</div>
            <div className="text-thread-sage mb-6 max-w-md mx-auto">
              Try adjusting your filters or explore different categories to discover more homes.
            </div>
            <button
              onClick={() => handleFilterChange({ template: undefined, palette: undefined, showActiveOnly: false })}
              className="px-6 py-3 bg-thread-sage text-thread-paper rounded-md font-medium hover:bg-thread-pine transition-colors shadow-sm"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {homes.map((home) => {
            const connectionBadge = getConnectionBadge(home)
            
            return (
              <div
                key={home.userId}
                className="group relative bg-thread-paper border border-thread-sage rounded-lg p-4 hover:shadow-cozy transition-all duration-200"
              >
                {/* Activity & Connection Indicators */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {home.stats.isActive && (
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Active this week"></div>
                  )}
                  {connectionBadge && (
                    <div className={`text-xs px-2 py-1 rounded ${connectionBadge.color}`} title={connectionBadge.text}>
                      <PixelIcon name={connectionBadge.icon} size={14} />
                    </div>
                  )}
                </div>

                {/* House Preview */}
                <button
                  onClick={(e) => handleHomeClick(e, home)}
                  className="block w-full"
                >
                  <div className="aspect-square mb-3 flex items-center justify-center bg-gradient-to-b from-thread-paper to-thread-cream rounded-md group-hover:scale-105 transition-transform duration-200 relative">
                    <HouseSVG
                      template={home.homeConfig.houseTemplate}
                      palette={home.homeConfig.palette}
                      customizations={home.homeConfig.houseCustomizations as HouseCustomizations}
                      className="w-full h-full max-w-24 max-h-24 drop-shadow-sm"
                    />
                    
                    {/* Decoration indicator */}
                    {home.homeConfig.hasDecorations && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-sm" title={`${home.homeConfig.decorationCount} decorations`}>
                        <PixelIcon name="drop" size={12} />
                      </div>
                    )}
                  </div>
                </button>

                {/* Member Info */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2">
                    {home.avatarUrl && (
                      <img
                        src={home.avatarUrl}
                        alt={`${home.displayName || home.username}'s avatar`}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <div>
                      <UserMention
                        username={home.username}
                        displayName={home.displayName || home.username}
                        className="font-medium text-sm text-thread-pine"
                      />
                      {home.displayName && (
                        <div className="text-xs text-thread-sage">
                          @{home.username}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-xs text-thread-sage">
                    {home.stats.ringMemberships > 0 && (
                      <div>{home.stats.ringMemberships} ring{home.stats.ringMemberships !== 1 ? 's' : ''}</div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Link
                      href={`/home/${home.username}`}
                      className="text-xs px-3 py-1 bg-thread-sage text-thread-paper rounded-md font-medium hover:bg-thread-pine transition-colors shadow-sm flex items-center gap-1"
                      title="Visit pixel home"
                    >
                      <PixelIcon name="home" size={12} /> Visit
                    </Link>
                    <Link
                      href={`/resident/${home.username}`}
                      className="text-xs px-3 py-1 bg-thread-paper border border-thread-sage text-thread-sage rounded-md font-medium hover:bg-thread-sage hover:text-thread-paper transition-colors flex items-center gap-1"
                      title="View profile"
                    >
                      <PixelIcon name="script" size={12} /> Profile
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {homes.map((home) => {
            const connectionBadge = getConnectionBadge(home)
            
            return (
              <div
                key={home.userId}
                className="flex items-center gap-4 p-4 bg-thread-paper border border-thread-sage rounded-lg hover:shadow-cozy transition-all duration-200"
              >
                {/* House Preview */}
                <button
                  onClick={(e) => handleHomeClick(e, home)}
                  className="flex-shrink-0"
                >
                  <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-b from-thread-paper to-thread-cream rounded-md hover:scale-105 transition-transform duration-200 relative">
                    <HouseSVG
                      template={home.homeConfig.houseTemplate}
                      palette={home.homeConfig.palette}
                      customizations={home.homeConfig.houseCustomizations as HouseCustomizations}
                      className="w-full h-full max-w-12 max-h-12 drop-shadow-sm"
                    />
                    
                    {/* Decoration indicator */}
                    {home.homeConfig.hasDecorations && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold shadow-sm" title={`${home.homeConfig.decorationCount} decorations`}>
                        <PixelIcon name="drop" size={10} />
                      </div>
                    )}
                  </div>
                </button>

                {/* Member Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {home.avatarUrl && (
                      <img
                        src={home.avatarUrl}
                        alt={`${home.displayName || home.username}'s avatar`}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <UserMention
                      username={home.username}
                      displayName={home.displayName || home.username}
                      className="font-medium text-thread-pine"
                    />
                    {home.displayName && (
                      <div className="text-sm text-thread-sage">
                        @{home.username}
                      </div>
                    )}
                    {home.stats.isActive && (
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Active this week"></div>
                    )}
                  </div>
                  
                  <div className="text-sm text-thread-sage">
                    {home.homeConfig.houseTemplate.replace('_v1', '').replace('_', ' ')} • {home.homeConfig.palette.replace('_', ' ')}
                    {home.stats.ringMemberships > 0 && (
                      <span> • {home.stats.ringMemberships} ring{home.stats.ringMemberships !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                {/* Connection Badge */}
                {connectionBadge && (
                  <div className={`text-xs px-3 py-1 rounded ${connectionBadge.color} flex items-center gap-1`}>
                    <PixelIcon name={connectionBadge.icon} size={12} />
                    <span>{connectionBadge.text}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/home/${home.username}`}
                    className="px-4 py-2 bg-thread-sage text-thread-paper rounded-md text-sm font-medium hover:bg-thread-pine transition-colors shadow-sm flex items-center gap-1"
                  >
                    <PixelIcon name="home" size={14} /> Visit
                  </Link>
                  <Link
                    href={`/resident/${home.username}`}
                    className="px-4 py-2 bg-thread-paper border border-thread-sage text-thread-sage rounded-md text-sm font-medium hover:bg-thread-sage hover:text-thread-paper transition-colors flex items-center gap-1"
                  >
                    <PixelIcon name="script" size={14} /> Profile
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {/* House Details Popup */}
      {selectedHome && (
        <HouseDetailsPopup
          isOpen={showPopup}
          onClose={() => setShowPopup(false)}
          member={convertHomeToMember(selectedHome)}
        />
      )}
    </div>
  )
}