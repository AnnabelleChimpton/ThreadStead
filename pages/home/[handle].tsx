import { GetServerSideProps } from 'next'
import { PrismaClient } from '@prisma/client'
import Head from 'next/head'
import Layout from '../../components/ui/layout/Layout'
import PixelHomePage from '../../components/pixel-homes/PixelHomePage'
import { HouseTemplate, ColorPalette } from '../../components/pixel-homes/HouseSVG'

const prisma = new PrismaClient()

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
}

export default function PixelHome({
  username,
  homeConfig,
  isOwner,
  userDisplayName,
  userBio
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
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL}/home/${username}`} />

        {/* Pixel Home specific meta tags */}
        <meta name="pixel-home:template" content={homeConfig.houseTemplate} />
        <meta name="pixel-home:palette" content={homeConfig.palette} />

        {/* Structured data for rich snippets */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ProfilePage',
              mainEntity: {
                '@type': 'Person',
                name: userDisplayName || `@${username}`,
                alternateName: `@${username}`,
                description: userBio || `${username}'s profile on ThreadStead`,
                url: `${process.env.NEXT_PUBLIC_BASE_URL}/resident/${username}`,
                sameAs: `${process.env.NEXT_PUBLIC_BASE_URL}/home/${username}`
              }
            })
          }}
        />
      </Head>

      <Layout>
        <PixelHomePage
          username={username}
          homeConfig={homeConfig}
          isOwner={isOwner}
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
    const userHandle = await prisma.handle.findFirst({
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

    // Get or create home configuration
    let homeConfig = await prisma.userHomeConfig.findUnique({
      where: { userId: user.id }
    })

    if (!homeConfig) {
      homeConfig = await prisma.userHomeConfig.create({
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

    return {
      props: {
        username: cleanHandle,
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
  } finally {
    await prisma.$disconnect()
  }
}