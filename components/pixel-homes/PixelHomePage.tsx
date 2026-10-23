import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Callout from '@/components/ui/feedback/Callout'
import ThreadRing88x31Badge from '@/components/core/threadring/ThreadRing88x31Badge'
import EnhancedHouseCanvas from './EnhancedHouseCanvas'
import VisitorTrail from './VisitorTrail'
import SharePixelHomeModal from './SharePixelHomeModal'
import { HouseTemplate, ColorPalette, HouseCustomizations, AtmosphereSettings } from './HouseSVG'
import Modal from '../ui/feedback/Modal'
import Guestbook from '../shared/Guestbook'
import { trackNavigation, trackModalOpen } from '../../lib/analytics/pixel-homes'
import { useToast } from '@/contexts/ToastContext'
import { CommentMarkupWithEmojis } from '@/lib/comment-markup'
import { decorationNote } from '@/lib/pixel-homes/decoration-note'
import type { DecorationItem } from '@/lib/pixel-homes/decoration-data'
import type { HomeNeighbors } from '@/lib/pixel-homes/neighbors'
import { csrfFetch } from '@/lib/api/client/csrf-fetch'

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
  /** The houses on either side, for the next-door links */
  neighbors?: HomeNeighbors
  /** Back to this house's street, with it in view */
  streetHref?: string
  /** The yard from SSR; when given, the page doesn't fetch it again */
  initialDecorations?: any[]
  className?: string
}

export default function PixelHomePage({
  username,
  displayName,
  homeConfig,
  isOwner = false,
  neighbors = { previous: null, next: null },
  streetHref = '/neighborhood',
  initialDecorations,
  className = ''
}: PixelHomePageProps) {
  const nameToShow = displayName || username
  const router = useRouter()
  const { showSuccess, showError } = useToast()
  const [showShareModal, setShowShareModal] = useState(false)
  const [badges, setBadges] = useState<ProfileBadge[]>([])
  const [showGuestbook, setShowGuestbook] = useState(false)
  const [hasUnreadGuestbook, setHasUnreadGuestbook] = useState(false)
  // const [showDecorationMode, setShowDecorationMode] = useState(false) // Now handled by dedicated page
  const [decorations, setDecorations] = useState<any[]>(initialDecorations ?? [])
  const [terrain, setTerrain] = useState<Record<string, string>>(
    homeConfig?.houseCustomizations?.terrain || {}
  )
  const [loadingDecorations, setLoadingDecorations] = useState(true)
  // The owner's note on a decoration someone clicked, shown under the scene
  const [openNote, setOpenNote] = useState<{ id: string; text: string } | null>(null)
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

  // Seeded from the SSR config so the house draws on first paint; the
  // decorations request only adds the yard (and refreshes these).
  const [atmosphere, setAtmosphere] = useState<AtmosphereSettings>(
    config.atmosphere as AtmosphereSettings
  )

  useEffect(() => {
    loadUserData()
  }, [username])

  const loadUserData = async () => {
    try {
      // Load user badges, guestbook status, and decorations in parallel.
      // allSettled: one failing endpoint must not blank the whole home —
      // Promise.all here meant a badges 500 hid the decorations too.
      // Guestbook status is owner-only, so visitors don't ask.
      const [badgeResult, guestbookResult, decorationsResult] = await Promise.allSettled([
        fetch(`/api/users/${encodeURIComponent(username)}/badges`),
        isOwner
          ? fetch(`/api/users/${encodeURIComponent(username)}/guestbook-status`)
          : Promise.resolve(null),
        // The yard came with the page; only fetch it for callers that didn't send it
        initialDecorations
          ? Promise.resolve(null)
          : fetch(`/api/home/decorations/load?username=${encodeURIComponent(username)}`)
      ])

      if (badgeResult.status === 'fulfilled' && badgeResult.value.ok) {
        const badgeData = await badgeResult.value.json()
        setBadges(badgeData.badges || [])
      }

      if (guestbookResult.status === 'fulfilled' && guestbookResult.value?.ok) {
        const guestbookData = await guestbookResult.value.json()
        setHasUnreadGuestbook(guestbookData.hasUnreadGuestbook || false)
      }

      if (decorationsResult.status === 'fulfilled' && decorationsResult.value?.ok) {
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
      // The house is already on screen from SSR; a bad side response
      // just leaves the yard or badges empty.
      console.error('Failed to load home extras:', err)
    } finally {
      setLoadingDecorations(false)
    }
  }

  const insideHref = `/resident/${encodeURIComponent(username)}`
  const handleGoInside = () => trackNavigation('pixel_home', 'profile', username)

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/home/${encodeURIComponent(username)}`
    try {
      await navigator.clipboard.writeText(url)
      showSuccess('Link copied.')
    } catch {
      showError(`Couldn't copy. The link is ${url}`)
    }
  }

  const handleMailboxClick = async () => {
    trackModalOpen('guestbook', username)
    setShowGuestbook(true)

    // Mark guestbook notifications as read if user is the owner
    if (isOwner && hasUnreadGuestbook) {
      try {
        await csrfFetch(`/api/users/${encodeURIComponent(username)}/mark-guestbook-read`, {
          method: 'POST'
        })
        setHasUnreadGuestbook(false)
      } catch (error) {
        console.error('Failed to mark guestbook as read:', error)
      }
    }
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

  const handleNoteClick = (item: DecorationItem) => {
    const text = decorationNote(item)
    if (!text) return
    setOpenNote((current) => (current?.id === item.id ? null : { id: item.id, text }))
  }

  const houseTitle = config.houseCustomizations?.houseTitle?.trim()
  const houseDescription = config.houseCustomizations?.houseDescription?.trim()
  const neighborName = (n: { username: string; displayName: string | null }) => n.displayName || n.username

  return (
    <div className={className}>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <h1 className="thread-headline text-2xl sm:text-3xl font-bold mb-3">
          {isOwner ? 'Your house' : `${nameToShow}'s house`}
        </h1>

        {/* The scene comes first and is the page. The door goes inside, and a
            placed mailbox opens the guestbook; nothing is drawn over the art. */}
        <EnhancedHouseCanvas
          template={config.houseTemplate}
          palette={config.palette}
          decorations={decorations}
          houseCustomizations={config.houseCustomizations as HouseCustomizations}
          atmosphere={atmosphere}
          terrain={terrain}
          pixelPerfect
          door={{ href: insideHref, label: isOwner ? 'Go inside to your page' : `Go inside to ${nameToShow}'s page` }}
          onMailboxClick={handleMailboxClick}
          onNoteClick={handleNoteClick}
          openNoteId={openNote?.id ?? null}
          className="w-full"
        />

        {/* A note the owner left on a decoration: under the art, never on it */}
        {openNote && (
          <section
            id="ts-decoration-note"
            aria-live="polite"
            aria-label={isOwner ? 'Your note' : `${nameToShow}'s note`}
            className="mt-3 max-w-xl border border-thread-sage/60 bg-thread-paper px-4 py-3"
          >
            <div className="text-nb-ink leading-relaxed whitespace-pre-line break-words">
              <CommentMarkupWithEmojis text={openNote.text} />
            </div>
            <button type="button" onClick={() => setOpenNote(null)} className="ts-bare ts-text-button mt-2 text-sm">
              Close
            </button>
          </section>
        )}

        {/* What you can do here, as one plain row under the art */}
        <nav aria-label="This house" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:text-base">
          <Link href={insideHref} onClick={handleGoInside} className="font-semibold">Go inside</Link>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={handleMailboxClick} className="ts-bare ts-text-button">
            Mailbox{hasUnreadGuestbook ? ' (new)' : ''}
          </button>
          {badges.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <Link href={`${insideHref}?tab=rings`}>
                {badges.length} ring{badges.length !== 1 ? 's' : ''}
              </Link>
            </>
          )}
          <span aria-hidden="true">·</span>
          <button type="button" onClick={handleCopyLink} className="ts-bare ts-text-button">Copy link</button>
          {isOwner && (
            <>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={handleDecorationMode} className="ts-bare ts-text-button font-semibold">Decorate</button>
              <span aria-hidden="true">·</span>
              <button type="button" onClick={() => setShowShareModal(true)} className="ts-bare ts-text-button">Save an image</button>
            </>
          )}
        </nav>

        {/* Only what the owner wrote: no stand-in title or description */}
        {(houseTitle || houseDescription) && (
          <div className="mt-6 max-w-2xl">
            {houseTitle && <h2 className="font-headline text-xl font-semibold text-nb-ink mb-1">{houseTitle}</h2>}
            {houseDescription && <p className="text-nb-ink-mid leading-relaxed whitespace-pre-line">{houseDescription}</p>}
          </div>
        )}

        {/* Their real ThreadRing badges, at full 88×31 */}
        {badges.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2" aria-label="ThreadRing badges">
            {badges.slice(0, 12).map((badge) => (
              <Link
                key={badge.id}
                href={`/tr/${badge.threadRing.slug}`}
                title={`${badge.threadRing.name}: ${badge.title}`}
                className="ts-card-link block"
              >
                <ThreadRing88x31Badge
                  slug={badge.threadRing.slug}
                  title={badge.title}
                  imageUrl={badge.imageUrl}
                />
              </Link>
            ))}
            {badges.length > 12 && (
              <Link href={`${insideHref}?tab=rings`} className="thread-label self-center">+{badges.length - 12} more</Link>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-start">
          <VisitorTrail username={username} recordVisit={!isOwner} />
        </div>

        {/* Keep walking: the houses either side, or back out to the street */}
        <nav aria-label="Neighbors" className="mt-8 pt-4 border-t border-thread-sage/40 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm sm:text-base">
          {neighbors.previous ? (
            <Link href={`/home/${encodeURIComponent(neighbors.previous.username)}`}>
              ← {neighborName(neighbors.previous)}&apos;s house
            </Link>
          ) : <span />}
          <Link href={streetHref}>Back to the street</Link>
          {neighbors.next ? (
            <Link href={`/home/${encodeURIComponent(neighbors.next.username)}`}>
              {neighborName(neighbors.next)}&apos;s house →
            </Link>
          ) : <span />}
        </nav>
      </div>

      {/* Modals */}
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