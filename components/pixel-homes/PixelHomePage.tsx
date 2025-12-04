import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import PixelHomeScene from './PixelHomeScene'
import EnhancedHouseCanvas from './EnhancedHouseCanvas'
import HouseSVG from './HouseSVG'
import VisitorTrail from './VisitorTrail'
import ThreadbookModal from './ThreadbookModal'
import SharePixelHomeModal from './SharePixelHomeModal'
import { PixelIcon } from '../ui/PixelIcon'
// import DecorationMode from './DecorationMode' // Now handled by dedicated page
import { HouseTemplate, ColorPalette, HouseCustomizations } from './HouseSVG'
import Modal from '../ui/feedback/Modal'
import Guestbook from '../shared/Guestbook'
import { trackNavigation, trackModalOpen } from '../../lib/analytics/pixel-homes'

interface UserHomeConfig {
  houseTemplate: HouseTemplate
  palette: ColorPalette
  bookSkin?: string
  seasonalOptIn: boolean
  preferPixelHome: boolean
  atmosphere: {
    sky: string
    weather: string
    timeOfDay: string
  }
  houseCustomizations: {
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
    terrain?: Record<string, string>
  }
}

interface ProfileBadge {
  id: string
  title: string
  backgroundColor: string
  textColor: string
  imageUrl?: string
  threadRing: {
    name: string
    slug: string
  }
}

interface PixelHomePageProps {
  username: string
  homeConfig?: UserHomeConfig
  isOwner?: boolean
  className?: string
}

export default function PixelHomePage({
  username,
  homeConfig,
  isOwner = false,
  className = ''
}: PixelHomePageProps) {
  const router = useRouter()
  const [showShareModal, setShowShareModal] = useState(false)
  const [badges, setBadges] = useState<ProfileBadge[]>([])
  const [showThreadbook, setShowThreadbook] = useState(false)
  const [showGuestbook, setShowGuestbook] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasUnreadGuestbook, setHasUnreadGuestbook] = useState(false)
  // const [showDecorationMode, setShowDecorationMode] = useState(false) // Now handled by dedicated page
  const [decorations, setDecorations] = useState<any[]>([])
  const [terrain, setTerrain] = useState<Record<string, string>>(
    homeConfig?.houseCustomizations?.terrain || {}
  )
  const [loadingDecorations, setLoadingDecorations] = useState(true)
  const [atmosphere, setAtmosphere] = useState({
    sky: 'sunny' as const,
    weather: 'clear' as const,
    timeOfDay: 'midday' as const
  })

  const config: UserHomeConfig = homeConfig || {
    houseTemplate: 'cottage_v1',
    palette: 'thread_sage',
    seasonalOptIn: false,
    preferPixelHome: false,
    atmosphere: {
      sky: 'sunny',
      weather: 'clear',
      timeOfDay: 'midday'
    },
    houseCustomizations: {}
  }

  useEffect(() => {
    loadUserData()
  }, [username])

  const loadUserData = async () => {
    try {
      setLoading(true)

      // Load user badges, guestbook status, and decorations in parallel
      const [badgeResponse, guestbookStatusResponse, decorationsResponse] = await Promise.all([
        fetch(`/api/users/${encodeURIComponent(username)}/badges`),
        fetch(`/api/users/${encodeURIComponent(username)}/guestbook-status`),
        fetch(`/api/home/decorations/load?username=${encodeURIComponent(username)}`)
      ])

      if (badgeResponse.ok) {
        const badgeData = await badgeResponse.json()
        setBadges(badgeData.badges || [])
      }

      if (guestbookStatusResponse.ok) {
        const guestbookData = await guestbookStatusResponse.json()
        setHasUnreadGuestbook(guestbookData.hasUnreadGuestbook || false)
      }

      if (decorationsResponse.ok) {
        const decorationData = await decorationsResponse.json()
        setDecorations(decorationData.decorations || [])
        if (decorationData.atmosphere) {
          setAtmosphere(decorationData.atmosphere)
        }
        if (decorationData.terrain) {
          setTerrain(decorationData.terrain)
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user data')
    } finally {
      setLoading(false)
      setLoadingDecorations(false)
    }
  }

  const handleDoorClick = () => {
    // Track navigation from pixel home to profile
    trackNavigation('pixel_home', 'profile', username)
    // Navigate to main profile page
    router.push(`/resident/${username}`)
  }

  const handleMailboxClick = async () => {
    trackModalOpen('guestbook', username)
    setShowGuestbook(true)

    // Mark guestbook notifications as read if user is the owner
    if (isOwner && hasUnreadGuestbook) {
      try {
        await fetch(`/api/users/${encodeURIComponent(username)}/mark-guestbook-read`, {
          method: 'POST'
        })
        setHasUnreadGuestbook(false)
      } catch (error) {
        console.error('Failed to mark guestbook as read:', error)
      }
    }
  }

  const handleThreadbookClick = () => {
    trackModalOpen('threadbook', username)
    setShowThreadbook(true)
  }

  const handleDecorationMode = () => {
    router.push(`/home/${username}/decorate`)
  }

  // handleSaveDecorations now handled by dedicated page

  const loadDecorations = async () => {
    try {
      setLoadingDecorations(true)
      const response = await fetch(`/api/home/decorations/load?username=${encodeURIComponent(username)}`)
      if (response.ok) {
        const data = await response.json()
        setDecorations(data.decorations || [])
        if (data.atmosphere) {
          setAtmosphere(data.atmosphere)
        }
        if (data.terrain) {
          setTerrain(data.terrain)
        }
      }
    } catch (error) {
      console.error('Failed to load decorations:', error)
    } finally {
      setLoadingDecorations(false)
    }
  }

  // handleCancelDecorations now handled by dedicated page

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-thread-sage mx-auto"></div>
          <div className="text-thread-sage">Loading Pixel Home...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">🏠</div>
          <div className="text-xl font-headline text-thread-pine">Home Not Found</div>
          <div className="text-thread-sage">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-thread-sage text-thread-paper rounded-md hover:bg-thread-pine transition-colors"
          >
            Return to ThreadStead
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-thread-paper via-thread-cream to-thread-sky bg-opacity-10 ${className}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-headline font-bold text-thread-pine mb-3 flex items-center justify-center gap-3">
            {username}&apos;s Pixel Home
          </h1>
          <div className="text-thread-sage text-lg mb-6 max-w-2xl mx-auto">
            Welcome to the neighborhood! This is {username}&apos;s interactive pixel home.
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Left Side - Interactive Menu */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Info Card */}
            <div className="bg-thread-paper border-2 border-thread-sage rounded-xl p-6 shadow-cozy">
              <div className="text-center space-y-4">
                <div className="text-2xl font-headline font-bold text-thread-pine">
                  @{username}
                </div>
                {badges.length > 0 && (
                  <div className="flex justify-center">
                    <div className="bg-thread-sky bg-opacity-20 px-3 py-1 rounded-full text-sm text-thread-pine font-medium">
                      {badges.length} ThreadRing Badge{badges.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
                {badges.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {badges.slice(0, 6).map((badge) => (
                      <div
                        key={badge.id}
                        className="w-8 h-8 shadow-sm border-2 border-white rounded-sm hover:scale-110 transition-transform"
                        title={`${badge.threadRing.name}: ${badge.title}`}
                      >
                        {badge.imageUrl ? (
                          <img
                            src={badge.imageUrl}
                            alt={badge.title}
                            className="w-full h-full object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <div
                            className="w-full h-full rounded-sm flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: badge.backgroundColor,
                              color: badge.textColor
                            }}
                          >
                            {badge.title.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}
                    {badges.length > 6 && (
                      <div className="w-8 h-8 rounded-sm bg-thread-sage text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-sm">
                        +{badges.length - 6}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Actions */}
            <div className="bg-thread-paper border-2 border-thread-sage rounded-xl p-6 shadow-cozy">
              <h3 className="text-lg font-headline font-semibold text-thread-pine mb-4 text-center">
                Explore & Connect
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleDoorClick}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-thread-sage to-thread-pine text-thread-paper hover:from-thread-pine hover:to-thread-sage transition-all duration-300 rounded-lg font-medium shadow-cozySm hover:shadow-cozy transform hover:-translate-y-0.5"
                >
                  <span>Enter & Explore Full Profile</span>
                </button>

                <button
                  onClick={handleMailboxClick}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-thread-cream hover:bg-thread-sky hover:bg-opacity-20 text-thread-pine transition-all duration-300 rounded-lg font-medium shadow-cozySm hover:shadow-cozy transform hover:-translate-y-0.5 border border-thread-sage border-opacity-30"
                >
                  <span>Check Mailbox {hasUnreadGuestbook && '(New!)'}</span>
                  {hasUnreadGuestbook && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                </button>

                <button
                  onClick={handleThreadbookClick}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-thread-cream hover:bg-thread-sky hover:bg-opacity-20 text-thread-pine transition-all duration-300 rounded-lg font-medium shadow-cozySm hover:shadow-cozy transform hover:-translate-y-0.5 border border-thread-sage border-opacity-30"
                >
                  <span>View ThreadRing Lineage</span>
                </button>

                <button
                  onClick={() => router.push(`/resident/${username}?tab=rings`)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-thread-cream hover:bg-thread-sky hover:bg-opacity-20 text-thread-pine transition-all duration-300 rounded-lg font-medium shadow-cozySm hover:shadow-cozy transform hover:-translate-y-0.5 border border-thread-sage border-opacity-30"
                >
                  <span>View Ring Memberships</span>
                </button>
              </div>
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <div className="bg-thread-paper border-2 border-thread-sage rounded-xl p-6 shadow-cozy">
                <h3 className="text-lg font-headline font-semibold text-thread-pine mb-4 text-center">
                  Customize Your Home
                </h3>
                <div className="space-y-3">
                  <button
                    onClick={handleDecorationMode}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300 rounded-lg font-medium shadow-cozySm hover:shadow-cozy transform hover:-translate-y-0.5"
                  >
                    <span>Decorate Home</span>
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 rounded-lg font-medium shadow-cozySm hover:shadow-cozy transform hover:-translate-y-0.5"
                  >
                    <span>Share Home</span>
                  </button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="bg-thread-paper border-2 border-thread-sage rounded-xl p-6 shadow-cozy">
              <h3 className="text-lg font-headline font-semibold text-thread-pine mb-4 text-center">
                Neighborhood
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/neighborhood/explore/all')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-thread-cream hover:bg-thread-sky hover:bg-opacity-20 text-thread-pine transition-all duration-300 rounded-lg font-medium shadow-cozySm hover:shadow-cozy transform hover:-translate-y-0.5 border border-thread-sage border-opacity-30"
                >
                  <span>Explore More Homes</span>
                </button>

                <button
                  onClick={() => router.push('/')}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-thread-cream hover:bg-thread-sky hover:bg-opacity-20 text-thread-pine transition-all duration-300 rounded-lg font-medium shadow-cozySm hover:shadow-cozy transform hover:-translate-y-0.5 border border-thread-sage border-opacity-30"
                >
                  <span>Back to ThreadStead</span>
                </button>
              </div>
            </div>
          </div>

          {/* Center - Main House Display */}
          <div className="lg:col-span-2 flex flex-col items-center justify-start">
            <div className="bg-gradient-to-br from-thread-sky from-opacity-10 to-thread-cream rounded-3xl p-8 shadow-2xl border-4 border-thread-sage border-opacity-30 max-w-2xl w-full">
              {/* Pure House Display - Always show house */}
              <div className="flex justify-center">
                <div className="relative">
                  <EnhancedHouseCanvas
                    template={config.houseTemplate}
                    palette={config.palette}
                    decorations={decorations}
                    houseCustomizations={config.houseCustomizations as HouseCustomizations}
                    atmosphere={atmosphere}
                    terrain={terrain}
                    className="w-full max-w-xl drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
                  />

                  {/* Badge sparkles overlay - preserved for visual appeal */}
                  {badges && badges.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none">
                      {badges.slice(0, 3).map((badge, index) => (
                        <div
                          key={badge.id}
                          className="absolute animate-pulse"
                          style={{
                            left: `${20 + (index * 25)}%`,
                            top: `${30 + (index * 10)}%`,
                            animationDelay: `${index * 0.5}s`,
                            animationDuration: '2s'
                          }}
                        >
                          <div
                            className="w-4 h-4 shadow-lg border-2 border-white rounded-sm"
                            title={`${badge.threadRing.name} badge`}
                          >
                            {badge.imageUrl ? (
                              <img
                                src={badge.imageUrl}
                                alt={badge.title}
                                className="w-full h-full object-contain"
                                style={{ imageRendering: 'pixelated' }}
                              />
                            ) : (
                              <div
                                className="w-full h-full rounded-sm flex items-center justify-center text-[8px] font-bold"
                                style={{
                                  backgroundColor: badge.backgroundColor,
                                  color: badge.textColor
                                }}
                              >
                                {badge.title.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {badges.length > 3 && (
                        <div
                          className="absolute text-sm font-bold text-thread-sage animate-bounce bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-thread-sage"
                          style={{
                            right: '15%',
                            top: '40%',
                            animationDuration: '3s'
                          }}
                        >
                          +{badges.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Visitor trail - positioned on the right side */}
                  <VisitorTrail
                    username={username}
                    className="top-4 right-4"
                  />
                </div>
              </div>

              {/* House Description */}
              <div className="text-center mt-6 space-y-3">
                <div className="text-xl font-headline font-semibold text-thread-pine">
                  {config.houseCustomizations?.houseTitle || "A Cozy Corner of ThreadStead"}
                </div>
                <div className="text-thread-sage max-w-lg mx-auto leading-relaxed">
                  {config.houseCustomizations?.houseDescription ||
                    `This is @${username}'s pixel home - a personalized space for connection and discovery. Use the interactive menu on the left to explore their profile, leave messages, and learn more about their ThreadRing community.`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ThreadbookModal
        isOpen={showThreadbook}
        onClose={() => setShowThreadbook(false)}
        username={username}
      />

      {/* Guestbook Modal - Using existing Guestbook component */}
      <Modal
        isOpen={showGuestbook}
        onClose={() => setShowGuestbook(false)}
        title="📬 Pixel Home Mailbox"
      >
        <div className="space-y-4">
          <div className="text-sm text-thread-sage bg-thread-cream bg-opacity-30 p-3 rounded-md border border-thread-sage border-opacity-20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🏠</span>
              <span className="font-medium">Writing from @{username}&apos;s Pixel Home</span>
            </div>
            <div className="text-xs">
              Messages posted here appear on their main profile guestbook too!
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <Guestbook username={username} />
          </div>
        </div>
      </Modal>
      <SharePixelHomeModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        template={config.houseTemplate}
        palette={config.palette}
        username={username}
        houseCustomizations={config.houseCustomizations}
        decorations={decorations}
        atmosphere={atmosphere}
        terrain={terrain}
        badges={badges}
      />
    </div>
  )
}