import React, { useState } from 'react'
import Link from 'next/link'
import HouseSVG, { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG'
import HouseDetailsPopup from './HouseDetailsPopup'
import { trackNavigation } from '../../lib/analytics/pixel-homes'
import UserMention from '@/components/ui/navigation/UserMention'
import { PixelIcon } from '@/components/ui/PixelIcon'
import { TERRAIN_TILES } from '../../lib/pixel-homes/decoration-data'
import { DEFAULT_DECORATION_GRID } from '../../lib/pixel-homes/decoration-grid-utils'

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
      data?: any // Custom data for decorations (e.g. sign text)
    }[]
    terrain?: Record<string, string>
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

interface NeighborhoodGridViewProps {
  members: NeighborhoodMember[]
  ringSlug?: string
}

export default function NeighborhoodGridView({ members, ringSlug }: NeighborhoodGridViewProps) {
  const [selectedMember, setSelectedMember] = useState<NeighborhoodMember | null>(null)
  const [showPopup, setShowPopup] = useState(false)

  const handleHouseClick = (e: React.MouseEvent, member: NeighborhoodMember) => {
    e.preventDefault()
    trackNavigation('pixel_home', 'pixel_home', member.username)
    setSelectedMember(member)
    setShowPopup(true)
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mb-4 flex justify-center">
          <PixelIcon name="home" size={48} />
        </div>
        <div className="text-xl font-headline text-thread-pine mb-2">No homes found</div>
        <div className="text-thread-sage">
          This neighborhood is empty right now. Check back later!
        </div>
      </div>
    )
  }

  // Calculate statistics
  const templateCounts = members.reduce((acc, member) => {
    const template = member.homeConfig.houseTemplate
    acc[template] = (acc[template] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const paletteCounts = members.reduce((acc, member) => {
    const palette = member.homeConfig.palette
    acc[palette] = (acc[palette] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-8">
      {/* Grid of homes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {members.map((member) => (
          <button
            key={member.userId}
            onClick={(e) => handleHouseClick(e, member)}
            className="group block text-left w-full"
          >
            <div className="space-y-3">
              {/* House */}
              <div className="relative bg-gradient-to-b from-thread-paper to-thread-cream border border-thread-sage rounded-lg p-4 transition-all group-hover:shadow-lg group-hover:-translate-y-1">
                {/* Terrain Layer - positioned absolutely below house */}
                {member.homeConfig.terrain && Object.keys(member.homeConfig.terrain).length > 0 && (
                  <div className="absolute inset-0 overflow-hidden rounded-lg" style={{ zIndex: 0 }}>
                    {Object.entries(member.homeConfig.terrain).map(([key, tileId]) => {
                      const [gridX, gridY] = key.split(',').map(Number)
                      const tile = TERRAIN_TILES.find(t => t.id === tileId)
                      if (!tile) return null

                      // Convert grid coords to percentage (512x352 canvas)
                      const cellSize = DEFAULT_DECORATION_GRID.cellSize
                      const leftPct = (gridX * cellSize / 512) * 100
                      const topPct = (gridY * cellSize / 352) * 100
                      const widthPct = (cellSize / 512) * 100
                      const heightPct = (cellSize / 352) * 100

                      return (
                        <div
                          key={`terrain-${key}`}
                          className="absolute pointer-events-none"
                          style={{
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            width: `${widthPct}%`,
                            height: `${heightPct}%`,
                            backgroundColor: tile.color,
                          }}
                        />
                      )
                    })}
                  </div>
                )}
                <HouseSVG
                  template={member.homeConfig.houseTemplate as any}
                  palette={member.homeConfig.palette as any}
                  customizations={member.homeConfig.houseCustomizations as HouseCustomizations}
                  className="w-full h-auto relative z-10"
                />
                
                {/* Activity indicator */}
                {member.stats?.isActive && (
                  <div className="absolute top-2 right-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Active this week"></div>
                  </div>
                )}
                
                {/* Decoration indicator */}
                {(member.homeConfig.decorationCount || 0) > 0 && (
                  <div className="absolute top-2 right-8">
                    <div className="text-sm" title={`${member.homeConfig.decorationCount} decorations`}>🌻</div>
                  </div>
                )}
                
                {/* Connection badges */}
                {member.connections && (
                  <div className="absolute top-2 left-2 flex gap-1">
                    {member.connections.isFollowing && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs" title="Following">
                        →
                      </div>
                    )}
                    {member.connections.isFollower && (
                      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs" title="Follows you">
                        ←
                      </div>
                    )}
                    {(member.connections.mutualRings || 0) > 0 && (
                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs" title="Shared rings">
                        {member.connections.mutualRings}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* User info */}
              <div className="text-center" onClick={(e) => e.stopPropagation()}>
                <div className="font-medium text-thread-pine group-hover:text-thread-sage transition-colors">
                  <UserMention
                    username={member.username}
                    displayName={member.displayName || undefined}
                  />
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* House Details Popup */}
      {selectedMember && (
        <HouseDetailsPopup
          isOpen={showPopup}
          onClose={() => setShowPopup(false)}
          member={selectedMember}
        />
      )}

      {/* Statistics */}
      <div className="bg-thread-paper border border-thread-sage rounded-lg p-6">
        <h3 className="text-lg font-headline font-medium text-thread-pine mb-4 flex items-center gap-2">
          <PixelIcon name="home" size={16} /> Neighborhood Statistics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* House Templates */}
          <div>
            <h4 className="text-sm font-medium text-thread-sage mb-2">House Styles</h4>
            <div className="space-y-2">
              {Object.entries(templateCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([template, count]) => (
                  <div key={template} className="flex items-center justify-between text-sm">
                    <span className="text-thread-pine capitalize">
                      {template.replace('_v1', '').replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-thread-cream rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-thread-sage"
                          style={{ width: `${(count / members.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-thread-sage text-xs">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          
          {/* Color Palettes */}
          <div>
            <h4 className="text-sm font-medium text-thread-sage mb-2">Color Themes</h4>
            <div className="space-y-2">
              {Object.entries(paletteCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([palette, count]) => (
                  <div key={palette} className="flex items-center justify-between text-sm">
                    <span className="text-thread-pine capitalize">
                      {palette.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-thread-cream rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-thread-pine"
                          style={{ width: `${(count / members.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-thread-sage text-xs">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}