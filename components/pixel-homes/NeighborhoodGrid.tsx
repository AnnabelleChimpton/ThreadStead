import React, { useState } from 'react'
import Link from 'next/link'
import HouseSVG, { HouseTemplate, ColorPalette } from './HouseSVG'
import { trackNavigation } from '../../lib/analytics/pixel-homes'
import UserMention from '@/components/ui/navigation/UserMention'
import { PixelIcon } from '@/components/ui/PixelIcon'

interface HomeMember {
  userId: string
  username: string
  displayName?: string
  avatarUrl?: string
  homeConfig: {
    houseTemplate: HouseTemplate
    palette: ColorPalette
    seasonalOptIn: boolean
  }
  joinedAt: string
  role: string
  isActive: boolean
}

interface NeighborhoodGridProps {
  members: HomeMember[]
  ringSlug: string
}

export default function NeighborhoodGrid({ members, ringSlug }: NeighborhoodGridProps) {
  const [sortBy, setSortBy] = useState<'joined' | 'activity' | 'alphabetical'>('joined')
  const [filterByActive, setFilterByActive] = useState(false)

  // Sort members based on selected criteria
  const sortedMembers = React.useMemo(() => {
    const filtered = filterByActive ? members.filter(m => m.isActive) : members

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'activity':
          // Active members first, then by joined date
          if (a.isActive !== b.isActive) {
            return a.isActive ? -1 : 1
          }
          return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
        case 'alphabetical':
          const nameA = a.displayName || a.username
          const nameB = b.displayName || b.username
          return nameA.localeCompare(nameB)
        case 'joined':
        default:
          return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
      }
    })
  }, [members, sortBy, filterByActive])

  const handleHomeClick = (username: string) => {
    trackNavigation('pixel_home', 'pixel_home', username)
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-thread-sage">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <label className="text-thread-sage">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1 border border-thread-sage rounded text-sm bg-thread-paper"
            >
              <option value="joined">Joined Date</option>
              <option value="activity">Activity</option>
              <option value="alphabetical">Name</option>
            </select>
          </div>
          
          <label className="flex items-center gap-2 text-sm text-thread-sage">
            <input
              type="checkbox"
              checked={filterByActive}
              onChange={(e) => setFilterByActive(e.target.checked)}
              className="text-thread-sage"
            />
            Active only
          </label>
        </div>

        <div className="text-sm text-thread-sage">
          Showing {sortedMembers.length} of {members.length} homes
        </div>
      </div>

      {/* Grid */}
      {sortedMembers.length === 0 ? (
        <div className="text-center py-16">
          <div className="mb-4"><PixelIcon name="buildings" size={64} className="mx-auto text-gray-400" /></div>
          <div className="text-xl font-headline text-thread-pine mb-2">No homes found</div>
          <div className="text-thread-sage">
            {filterByActive 
              ? "No active members found. Try removing the activity filter."
              : "This ring doesn't have any members with pixel homes yet."
            }
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {sortedMembers.map((member) => (
            <div
              key={member.userId}
              className="group relative bg-thread-paper border border-thread-sage rounded-lg p-4 hover:shadow-cozy transition-all duration-200"
            >
              {/* Activity Indicator */}
              {member.isActive && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              )}

              {/* Role Badge */}
              {member.role !== 'member' && (
                <div className="absolute top-2 left-2 text-xs bg-thread-sage text-thread-paper px-2 py-1 rounded flex items-center gap-1">
                  {member.role === 'curator' ? <PixelIcon name="trophy" size={12} /> : <PixelIcon name="bookmark" size={12} />} {member.role}
                </div>
              )}

              {/* House Preview */}
              <Link
                href={`/home/${member.username}`}
                onClick={() => handleHomeClick(member.username)}
                className="block"
              >
                <div className="aspect-square mb-3 flex items-center justify-center bg-gradient-to-b from-thread-paper to-thread-cream rounded-md group-hover:scale-105 transition-transform duration-200">
                  <HouseSVG
                    template={member.homeConfig.houseTemplate}
                    palette={member.homeConfig.palette}
                    className="w-full h-full max-w-24 max-h-24 drop-shadow-sm"
                  />
                </div>
              </Link>

              {/* Member Info */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  {member.avatarUrl && (
                    <img
                      src={member.avatarUrl}
                      alt={`${member.displayName || member.username}'s avatar`}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <div>
                    <UserMention
                      username={member.username}
                      displayName={member.displayName || member.username}
                      className="font-medium text-sm text-thread-pine"
                    />
                    {member.displayName && (
                      <div className="text-xs text-thread-sage">
                        @{member.username}
                      </div>
                    )}
                  </div>
                </div>

                {/* Home Style Info */}
                <div className="text-xs text-thread-sage">
                  <div className="capitalize">
                    {member.homeConfig.houseTemplate.replace('_v1', '').replace('_', ' ')}
                  </div>
                  <div className="capitalize">
                    {member.homeConfig.palette.replace('_', ' ')}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Link
                    href={`/home/${member.username}`}
                    onClick={() => handleHomeClick(member.username)}
                    className="text-xs px-2 py-1 bg-thread-sage text-thread-paper rounded hover:bg-thread-pine transition-colors flex items-center"
                    title="Visit pixel home"
                  >
                    <PixelIcon name="home" size={14} />
                  </Link>
                  <Link
                    href={`/resident/${member.username}`}
                    className="text-xs px-2 py-1 bg-thread-sage text-thread-paper rounded hover:bg-thread-pine transition-colors flex items-center"
                    title="View profile"
                  >
                    <PixelIcon name="script" size={14} />
                  </Link>
                </div>

                {/* Join Date */}
                <div className="text-xs text-thread-sage opacity-75">
                  Member since {new Date(member.joinedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Footer */}
      {sortedMembers.length > 0 && (
        <div className="mt-8 pt-6 border-t border-thread-sage">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
            <div>
              <div className="font-medium text-thread-pine">
                {members.filter(m => m.homeConfig.houseTemplate === 'cottage_v1').length}
              </div>
              <div className="text-thread-sage">Cottages</div>
            </div>
            <div>
              <div className="font-medium text-thread-pine">
                {members.filter(m => m.homeConfig.houseTemplate === 'townhouse_v1').length}
              </div>
              <div className="text-thread-sage">Townhouses</div>
            </div>
            <div>
              <div className="font-medium text-thread-pine">
                {members.filter(m => m.homeConfig.houseTemplate === 'loft_v1').length}
              </div>
              <div className="text-thread-sage">Lofts</div>
            </div>
            <div>
              <div className="font-medium text-thread-pine">
                {members.filter(m => m.homeConfig.houseTemplate === 'cabin_v1').length}
              </div>
              <div className="text-thread-sage">Cabins</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}