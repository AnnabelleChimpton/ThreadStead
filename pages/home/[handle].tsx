import { getSiteBaseUrl } from '@/lib/config/site-url';
import { GetServerSideProps } from 'next'
import { db } from '@/lib/config/database/connection'
import PageMeta from '@/components/ui/layout/PageMeta'
import type { PageImage } from '@/lib/share-images'
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
import { SITE_TITLE } from '@/lib/config/site/constants'
import { PROFILE_WITHOUT_PAGE } from '@/lib/domain/profile/profile-fields';

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
  userDisplayName?: string
  userBio?: string
  neighbors: HomeNeighbors
  /** The yard, sent with the page so it draws on first paint */
  decorations: SceneDecoration[]
  /** Back to this house's own street, with it in view */
  streetHref: string
  /** The yard's share image; null when a signed-out visitor couldn't see this home. */
  shareImage: PageImage | null
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
  userDisplayName,
  userBio,
  neighbors,
  shareImage,
  streetHref,
  decorations
}: PixelHomeProps) {
  const name = userDisplayName || `@${username}`

  return (
    <>
      <PageMeta
        title={`${name}'s pixel home`}
        description={userBio || `Come see ${name}'s little house, yard and neighbors on ${SITE_TITLE}.`}
        path={`/home/${username}`}
        type="profile"
        image={shareImage ?? undefined}
      >
        {/* Structured data for rich snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
              '@context': 'https://schema.org',
              '@type': 'ProfilePage',
              mainEntity: {
                '@type': 'Person',
                name,
                alternateName: `@${username}`,
                description: userBio || `${username}'s profile on ${SITE_TITLE}`,
                url: `${getSiteBaseUrl()}/resident/${username}`,
                sameAs: `${getSiteBaseUrl()}/home/${username}`
              }
            })
          }}
        />
      </PageMeta>

      <Layout>
        {/* Keyed by resident: a neighbor link is a client-side move to this
            same page, and PixelHomePage reads its yard, weather and badges
            into state once, so without a fresh mount it kept the last home's */}
        <PixelHomePage
          key={username}
          username={username}
          displayName={userDisplayName}
          homeConfig={homeConfig}
          isOwner={isOwner}
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
            profile: PROFILE_WITHOUT_PAGE
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
    if (!access.visible && access.suspended) return { notFound: true }
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
    let shareImage: PageImage | null = null
    if ((user.profile?.visibility ?? 'public') === 'public') {
      const { homeShareImage } = await import('@/lib/share-images/server')
      const name = user.profile?.displayName || `@${cleanHandle}`
      shareImage = await homeShareImage({ userId: user.id, username: cleanHandle, name }, homeConfig)
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
        userDisplayName: user.profile?.displayName || null,
        userBio: user.profile?.bio || null
      }
    }

  } catch (error) {
    console.error('Pixel Home SSR error:', error)
    return { notFound: true }
  }
}