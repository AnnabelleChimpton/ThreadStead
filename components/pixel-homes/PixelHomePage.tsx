import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import PageHeader from '@/components/ui/layout/PageHeader'
import Callout from '@/components/ui/feedback/Callout'
import ThreadRing88x31Badge from '@/components/core/threadring/ThreadRing88x31Badge'
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
import LoadingSpinner from '../ui/feedback/LoadingSpinner'
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
    houseNumber?: string
    houseNumberStyle?: string
    welcomeMat?: string
    welcomeMatText?: string
    welcomeMatColor?: string
    chimneyStyle?: string
    exteriorLights?: string
    windowTreatments?: string
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
  displayName?: string
  homeConfig?: UserHomeConfig
  isOwner?: boolean
  className?: string
}

export default function PixelHomePage({
  username,
  displayName,
  homeConfig,
  isOwner = false,
  className = ''
}: PixelHomePageProps) {
  const nameToShow = displayName || username
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

      // Load user badges, guestbook status, and decorations in parallel.
      // allSettled: one failing endpoint must not blank the whole home —
      // Promise.all here meant a badges 500 hid the decorations too.
      const [badgeResult, guestbookResult, decorationsResult] = await Promise.allSettled([
        fetch(`/api/users/${encodeURIComponent(username)}/badges`),
        fetch(`/api/users/${encodeURIComponent(username)}/guestbook-status`),
        fetch(`/api/home/decorations/load?username=${encodeURIComponent(username)}`)
      ])

      if (badgeResult.status === 'fulfilled' && badgeResult.value.ok) {
        const badgeData = await badgeResult.value.json()
        setBadges(badgeData.badges || [])
      }

      if (guestbookResult.status === 'fulfilled' && guestbookResult.value.ok) {
        const guestbookData = await guestbookResult.value.json()
        setHasUnreadGuestbook(guestbookData.hasUnreadGuestbook || false)
      }

      if (decorationsResult.status === 'fulfilled' && decorationsResult.value.ok) {
        const decorationData = await decorationsResult.value.json()
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

  if (error) {
    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center"><PixelIcon name="home" size={48} /></div>
          <div className="text-xl font-headline text-thread-pine">Home Not Found</div>
          <div className="text-thread-sage">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="thread-button btn btn--primary"
          >
            Return to ThreadStead
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <PageHeader title={`${nameToShow}'s Pixel Home`}>
          <p>Welcome to the neighborhood — this is {nameToShow}&apos;s pixel home.</p>
        </PageHeader>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Interactive Menu */}
          <div className="lg:col-span-1 space-y-4 lg:order-1 order-2">
            {/* User Info Card — the owner's real ThreadRing badges at full 88×31 size */}
            <div className="widget-container bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy p-4 sm:p-5">
              <div className="widget-header mb-3">
                <h2 className="widget-title font-headline text-lg font-bold text-nb-ink mb-0">{nameToShow}</h2>
                {badges.length > 0 && (
                  <span className="widget-actions ml-auto badge text-xs">
                    {badges.length} ThreadRing Badge{badges.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {badges.slice(0, 6).map((badge) => (
                    <Link
                      key={badge.id}
                      href={`/tr/${badge.threadRing.slug}`}
                      title={`${badge.threadRing.name}: ${badge.title}`}
                      className="ts-card-link block"
                    >
                      <ThreadRing88x31Badge
                        title={badge.title}
                        backgroundColor={badge.backgroundColor}
                        textColor={badge.textColor}
                        imageUrl={badge.imageUrl}
                      />
                    </Link>
                  ))}
                  {badges.length > 6 && (
                    <span className="thread-label self-center">+{badges.length - 6} more</span>
                  )}
                </div>
              )}
            </div>

            {/* Interactive Actions */}
            <div className="widget-container bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy p-4 sm:p-5">
              <div className="widget-header mb-3"><h3 className="widget-title font-headline text-base font-bold text-nb-ink mb-0">Explore & Connect</h3></div>
              <div className="space-y-2">
                <button
                  onClick={handleDoorClick}
                  className="thread-button btn btn--primary w-full text-left"
                >
                  <span>Step Inside — Visit Profile</span>
                </button>

                <button
                  onClick={handleMailboxClick}
                  className="thread-button-secondary btn btn--secondary w-full text-left"
                >
                  <span>Check Mailbox {hasUnreadGuestbook && '(new)'}</span>
                  {hasUnreadGuestbook && <span aria-hidden="true" className="inline-block w-2 h-2 ml-2 bg-nb-rose rounded-full align-middle"></span>}
                </button>

                <button
                  onClick={handleThreadbookClick}
                  className="thread-button-secondary btn btn--secondary w-full text-left"
                >
                  <span>View ThreadRing Lineage</span>
                </button>

                <button
                  onClick={() => router.push(`/resident/${username}?tab=rings`)}
                  className="thread-button-secondary btn btn--secondary w-full text-left"
                >
                  <span>View Ring Memberships</span>
                </button>
              </div>
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <div className="widget-container bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy p-4 sm:p-5">
                <div className="widget-header mb-3"><h3 className="widget-title font-headline text-base font-bold text-nb-ink mb-0">Customize Your Home</h3></div>
                <div className="space-y-2">
                  <button
                    onClick={handleDecorationMode}
                    className="thread-button btn btn--primary w-full text-left"
                  >
                    <span>Decorate Home</span>
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="thread-button-secondary btn btn--secondary w-full text-left"
                  >
                    <span>Share Home</span>
                  </button>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="widget-container bg-thread-paper border border-thread-sage rounded-cozy shadow-cozy p-4 sm:p-5">
              <div className="widget-header mb-3"><h3 className="widget-title font-headline text-base font-bold text-nb-ink mb-0">Neighborhood</h3></div>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/neighborhood')}
                  className="thread-button-secondary btn btn--secondary w-full text-left"
                >
                  <span>Explore More Homes</span>
                </button>

                <button
                  onClick={() => router.push('/')}
                  className="thread-button-secondary btn btn--secondary w-full text-left"
                >
                  <span>Back to ThreadStead</span>
                </button>
              </div>
            </div>
          </div>

          {/* Center - Main House Display */}
          <div className="lg:col-span-2 lg:order-2 order-1">
            <div className="thread-module">
              {/* Pure House Display - Always show house */}
              <div className="flex justify-center">
                {loading ? (
                  <LoadingSpinner
                    size="lg"
                    message="Loading Pixel Home..."
                    className="w-full max-w-xl min-h-[300px] border-2 border-dotted border-nb-ink-mid/40 rounded-cozy"
                  />
                ) : (
                <div className="relative">
                  <EnhancedHouseCanvas
                    template={config.houseTemplate}
                    palette={config.palette}
                    decorations={decorations}
                    houseCustomizations={config.houseCustomizations as HouseCustomizations}
                    atmosphere={atmosphere}
                    terrain={terrain}
                    className="w-full max-w-xl"
                  />

                  {/* NOTE: no overlays on the artwork. Badge sparkles + a
                      bouncing "+N" counter and the visitor trail used to
                      float at fixed percentages OVER the scene, landing on
                      ponds/lawns like debris. Badges live in the sidebar
                      card; the visitor trail sits below the canvas. */}
                </div>
                )}
              </div>

              {/* Recent visitors — under the artwork, not on it */}
              <div className="flex justify-center mt-3">
                <VisitorTrail username={username} />
              </div>

              {/* House Description */}
              <div className="text-center mt-6 space-y-3">
                <div className="text-xl font-headline font-semibold text-nb-ink">
                  {config.houseCustomizations?.houseTitle || "A Cozy Corner of ThreadStead"}
                </div>
                <div className="text-nb-ink-mid max-w-lg mx-auto leading-relaxed">
                  {config.houseCustomizations?.houseDescription ||
                    `This is ${nameToShow}'s pixel home. Use the menu on the left to visit their profile, leave a note in the mailbox, or see their ThreadRings.`}
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
        title="Pixel Home Mailbox"
      >
        <div className="space-y-4">
          <Callout title={`Writing from ${nameToShow}'s Pixel Home`}>
            <p className="text-xs">Messages posted here appear on their main profile guestbook too.</p>
          </Callout>

          <div className="max-h-96 overflow-y-auto">
            <Guestbook username={username} signerLink="home" />
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