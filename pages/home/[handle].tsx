import { getSiteBaseUrl } from '@/lib/config/site-url';
import { GetServerSideProps } from 'next'
import { db } from '@/lib/config/database/connection'
import Head from 'next/head'
import Layout from '../../components/ui/layout/Layout'
import PixelHomePage from '../../components/pixel-homes/PixelHomePage'
import { HouseTemplate, ColorPalette } from '../../components/pixel-homes/HouseSVG'
import { serializeJsonLd } from "@/lib/utils/sanitization/json-ld";
import PrivateProfile from '@/components/core/profile/PrivateProfile'
import { residentAccess } from '@/lib/domain/users/profile-access'
import { getHomeNeighbors, type HomeNeighbors } from '@/lib/pixel-homes/neighbors'
import { streetIndexOf } from '@/lib/pixel-homes/street'
import { loadCatalogArt, loadDecorationRows, toSceneDecorations, type SceneDecoration } from '@/lib/pixel-homes/home-scene'
import { SITE_NAME } from '@/lib/config/site/constants'

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

interface PixelHomeProps {
  username: string
  homeConfig: UserHomeConfig
  isOwner: boolean
  isSignedIn: boolean
  userDisplayName?: string
  userBio?: string
  neighbors: HomeNeighbors
  /** The yard, sent with the page so it draws on first paint */
  decorations: SceneDecoration[]
  /** Back to this house's own street, with it in view */
  streetHref: string
  /** The yard's share image; null when a signed-out visitor couldn't see this home. */
  shareImage: string | null
}

/** A home the viewer may not see shows the same page as the private profile. */
interface HiddenHomeProps {
  privateProfile: {
    username: string
    displayName: string
    avatarUrl: string
    visibility: 'private' | 'followers' | 'friends'
  }
}

export default function PixelHomeRoute(props: PixelHomeProps | HiddenHomeProps) {
  if ('privateProfile' in props) {
    return <PrivateProfile {...props.privateProfile} />
  }
  return <PixelHome {...props} />
}

function PixelHome({
  username,
  homeConfig,
  isOwner,
  isSignedIn,
  userDisplayName,
  userBio,
  neighbors,
  shareImage,
  streetHref,
  decorations
}: PixelHomeProps) {
  const pageTitle = `${userDisplayName || `@${username}`}'s Pixel Home`
  const pageDescription = userBio
    ? `${userBio.slice(0, 150)}...`
    : `Visit @${username}'s interactive Pixel Home on ThreadStead - explore their ThreadRing connections and discover their content.`

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={`${getSiteBaseUrl()}/home/${username}`} />
        {shareImage && (
          <>
            <meta key="og:image" property="og:image" content={shareImage} />
            <meta key="og:image:width" property="og:image:width" content="1200" />
            <meta key="og:image:height" property="og:image:height" content="630" />
            <meta key="og:image:alt" property="og:image:alt" content={`${userDisplayName || `@${username}`}'s house and yard`} />
            <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
            <meta key="twitter:image" name="twitter:image" content={shareImage} />
          </>
        )}

        {/* Pixel Home specific meta tags */}
        <meta name="pixel-home:template" content={homeConfig.houseTemplate} />
        <meta name="pixel-home:palette" content={homeConfig.palette} />

        {/* Structured data for rich snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
              '@context': 'https://schema.org',
              '@type': 'ProfilePage',
              mainEntity: {
                '@type': 'Person',
                name: userDisplayName || `@${username}`,
                alternateName: `@${username}`,
                description: userBio || `${username}'s profile on ThreadStead`,
                url: `${getSiteBaseUrl()}/resident/${username}`,
                sameAs: `${getSiteBaseUrl()}/home/${username}`
              }
            })
          }}
        />
      </Head>

      <Layout>
        <PixelHomePage
          username={username}
          displayName={userDisplayName}
          homeConfig={homeConfig}
          isOwner={isOwner}
          isSignedIn={isSignedIn}
          neighbors={neighbors}
          streetHref={streetHref}
          initialDecorations={decorations}
        />
      </Layout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { handle } = context.query

  if (typeof handle !== 'string') {
    return { notFound: true }
  }

  try {
    // Remove @ prefix if present
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle

    // Find user by handle
    const userHandle = await db.handle.findFirst({
      where: { handle: cleanHandle.toLowerCase() },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    })

    if (!userHandle) {
      return { notFound: true }
    }

    const user = userHandle.user

    // Check if current user is the owner
    const { getSessionUser } = await import('../../lib/auth/server')
    const currentUser = await getSessionUser(context.req as any)
    const isOwner = currentUser?.id === user.id

    // The profile's visibility rules, checked before anything is loaded
    const access = await residentAccess(currentUser, user.id, user.profile?.visibility ?? null)
    if (!access.visible) {
      return {
        props: {
          privateProfile: {
            username: cleanHandle,
            displayName: user.profile?.displayName || cleanHandle,
            avatarUrl: user.profile?.avatarUrl || '/assets/default-avatar.gif',
            visibility: access.visibility
          }
        }
      }
    }

    // Get or create home configuration
    let homeConfig = await db.userHomeConfig.findUnique({
      where: { userId: user.id }
    })

    if (!homeConfig) {
      homeConfig = await db.userHomeConfig.create({
        data: {
          userId: user.id,
          houseTemplate: 'cottage_v1',
          palette: 'thread_sage',
          bookSkin: 'linen_v1',
          seasonalOptIn: false,
          preferPixelHome: false,
          atmosphereSky: 'sunny',
          atmosphereWeather: 'clear',
          atmosphereTimeOfDay: 'midday',
          windowStyle: 'default',
          doorStyle: 'default',
          roofTrim: 'default'
        }
      })
    }

    const [neighbors, streetIndex, decorationRows] = await Promise.all([
      getHomeNeighbors(db, user, { viewerId: currentUser?.id, host: SITE_NAME }),
      streetIndexOf(db, user.id, SITE_NAME),
      loadDecorationRows(user.id),
    ])
    // The yard goes out with the page (same shape as /api/home/decorations/load),
    // so it draws with the house instead of a beat after hydration.
    const catalog = await loadCatalogArt(decorationRows.map((d) => d.decorationId))
    const decorations: SceneDecoration[] = JSON.parse(
      JSON.stringify(toSceneDecorations(decorationRows, catalog, homeConfig.customAssets))
    )
    const streetParam = streetIndex ? `street=${streetIndex + 1}&` : ''
    const streetHref = `/neighborhood?${streetParam}at=${encodeURIComponent(cleanHandle)}`

    // The share image is for link previews, which reach signed-out
    // visitors: only a public home gets one, whoever is viewing now.
    let shareImage: string | null = null
    if ((user.profile?.visibility ?? 'public') === 'public') {
      shareImage = homeConfig.snapshotUrl
      if (!shareImage) {
        // Not drawn yet: start it now, and point previews at the route
        // that waits for it.
        const { scheduleHomeSnapshot } = await import('@/lib/pixel-homes/snapshot/service')
        void scheduleHomeSnapshot(user.id)
        shareImage = `${getSiteBaseUrl()}/api/home/${encodeURIComponent(cleanHandle)}/snapshot`
      }
    }

    return {
      props: {
        username: cleanHandle,
        neighbors,
        streetHref,
        decorations,
        shareImage,
        homeConfig: {
          houseTemplate: homeConfig.houseTemplate as HouseTemplate,
          palette: homeConfig.palette as ColorPalette,
          bookSkin: homeConfig.bookSkin,
          seasonalOptIn: homeConfig.seasonalOptIn,
          preferPixelHome: homeConfig.preferPixelHome,
          atmosphere: {
            sky: homeConfig.atmosphereSky,
            weather: homeConfig.atmosphereWeather,
            timeOfDay: homeConfig.atmosphereTimeOfDay
          },
          houseCustomizations: {
            windowStyle: homeConfig.windowStyle,
            doorStyle: homeConfig.doorStyle,
            roofTrim: homeConfig.roofTrim,
            wallColor: homeConfig.wallColor,
            roofColor: homeConfig.roofColor,
            trimColor: homeConfig.trimColor,
            windowColor: homeConfig.windowColor,
            detailColor: homeConfig.detailColor,
            houseTitle: homeConfig.houseTitle,
            houseDescription: homeConfig.houseDescription,
            houseBoardText: homeConfig.houseBoardText,
            houseNumber: homeConfig.houseNumber,
            houseNumberStyle: homeConfig.houseNumberStyle,
            welcomeMat: homeConfig.welcomeMat,
            welcomeMatText: homeConfig.welcomeMatText,
            welcomeMatColor: homeConfig.welcomeMatColor,
            chimneyStyle: homeConfig.chimneyStyle,
            exteriorLights: homeConfig.exteriorLights,
            windowTreatments: homeConfig.windowTreatments,
            terrain: (homeConfig.terrain as Record<string, string>) || {}
          }
        },
        isOwner,
        isSignedIn: !!currentUser,
        userDisplayName: user.profile?.displayName || null,
        userBio: user.profile?.bio || null
      }
    }

  } catch (error) {
    console.error('Pixel Home SSR error:', error)
    return { notFound: true }
  }
}