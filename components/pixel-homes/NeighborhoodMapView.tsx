import React, { useState } from 'react'
import { useRouter } from 'next/router'
import HouseSVG, { HouseTemplate, ColorPalette } from './HouseSVG'
import HouseDetailsPopup from './HouseDetailsPopup'
import { trackNavigation } from '../../lib/analytics/pixel-homes'

interface NeighborhoodMember {
  userId: string
  username: string
  displayName?: string | null
  avatarUrl?: string | null
  homeConfig: {
    houseTemplate: HouseTemplate
    palette: ColorPalette
    seasonalOptIn: boolean
  }
  stats: {
    isActive: boolean
  }
}

interface NeighborhoodMapViewProps {
  members: NeighborhoodMember[]
  currentUserId?: string
  neighborhoodType: string
}

export default function NeighborhoodMapView({
  members,
  currentUserId
}: NeighborhoodMapViewProps) {
  const router = useRouter()
  const [selectedMember, setSelectedMember] = useState<NeighborhoodMember | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  
  // Create a grid layout for the map view
  const gridSize = Math.ceil(Math.sqrt(members.length))
  
  const handleHouseClick = (member: NeighborhoodMember) => {
    trackNavigation('pixel_home', 'pixel_home', member.username)
    setSelectedMember(member)
    setShowPopup(true)
  }
  
  return (
    <div className="neighborhood-map-view container mx-auto px-4 py-8">
      <div className="bg-thread-paper border border-thread-sage rounded-lg shadow-lg relative">
        {/* Map header */}
        <div className="p-6 border-b border-thread-sage">
          <h3 className="text-lg font-headline font-medium text-thread-pine mb-2">
            🗺️ Neighborhood Map
          </h3>
          <p className="text-sm text-thread-sage">
            Bird&apos;s eye view • Click any house to visit • Scroll to explore
          </p>
        </div>
        
        {/* Scrollable map area */}
        <div className="relative h-96 overflow-auto scrollbar-thin scrollbar-thumb-thread-sage scrollbar-track-thread-cream">
          <div className="min-w-full min-h-full bg-gradient-to-br from-green-100 to-green-200 relative">
            {/* Street grid pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full">
                <defs>
                  <pattern id="map-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="gray" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#map-grid)" />
              </svg>
            </div>
            
            {/* Houses grid - responsive and scrollable */}
            <div 
              className="grid gap-6 p-8"
              style={{
                gridTemplateColumns: `repeat(${Math.min(gridSize, 6)}, 1fr)`,
                minHeight: 'max-content'
              }}
            >
              {members.map((member, index) => {
                return (
                  <div
                    key={member.userId}
                    className="map-house-plot relative group cursor-pointer flex flex-col items-center"
                    onClick={() => handleHouseClick(member)}
                  >
                    {/* House lot background */}
                    <div className="absolute inset-0 bg-green-300 bg-opacity-20 rounded-lg group-hover:bg-opacity-40 transition-all -m-1"></div>
                    
                    {/* House */}
                    <div className="relative z-10 mb-2">
                      <HouseSVG
                        template={member.homeConfig.houseTemplate}
                        palette={member.homeConfig.palette}
                        className="w-16 h-16 transform group-hover:scale-110 transition-transform"
                      />
                      
                      {/* Activity indicator */}
                      {member.stats.isActive && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                    
                    {/* Username label */}
                    <div className="text-center z-10">
                      <div className="text-xs font-medium text-thread-pine bg-thread-paper bg-opacity-80 px-2 py-1 rounded">
                        @{member.username}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Map legend */}
        <div className="absolute top-20 right-4 bg-thread-paper bg-opacity-95 p-3 rounded-lg text-sm shadow-md border border-thread-sage z-10">
          <div className="font-medium text-thread-pine mb-2">Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>Inactive</span>
            </div>
          </div>
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