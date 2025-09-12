import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Layout from '../../../components/ui/layout/Layout'
import NeighborhoodGrid from '../../../components/pixel-homes/NeighborhoodGrid'
import { HouseTemplate, ColorPalette } from '../../../components/pixel-homes/HouseSVG'
import { db } from '../../../lib/config/database/connection'
import Link from 'next/link'

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

interface RingNeighborhoodProps {
  ringName: string
  ringSlug: string
  ringDescription?: string
  members: HomeMember[]
  memberCount: number
  isRingMember: boolean
}

export default function RingNeighborhood({
  ringName,
  ringSlug,
  ringDescription,
  members,
  memberCount,
  isRingMember
}: RingNeighborhoodProps) {
  const pageTitle = `🏘️ ${ringName} Neighborhood - Ring Streets`
  const pageDescription = ringDescription
    ? `Explore the ${members.length} homes in the ${ringName} ThreadRing neighborhood. ${ringDescription.slice(0, 100)}...`
    : `Discover and visit the ${members.length} unique pixel homes of ${ringName} ring members on ThreadStead.`

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL}/rings/${ringSlug}/neighborhood`} />
        
        {/* Ring neighborhood specific meta tags */}
        <meta name="ring:slug" content={ringSlug} />
        <meta name="ring:member-count" content={memberCount.toString()} />
      </Head>

      <Layout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-sm text-thread-sage mb-2">
              <Link href="/rings" className="hover:text-thread-pine transition-colors">
                ThreadRings
              </Link>
              <span>→</span>
              <Link href={`/tr/${ringSlug}`} className="hover:text-thread-pine transition-colors">
                {ringName}
              </Link>
              <span>→</span>
              <span>Neighborhood</span>
            </div>
            
            <h1 className="text-3xl font-headline font-bold text-thread-pine mb-3">
              🏘️ {ringName} Neighborhood
            </h1>
            
            {ringDescription && (
              <p className="text-thread-sage max-w-2xl mx-auto mb-4">
                {ringDescription}
              </p>
            )}
            
            <div className="flex items-center justify-center gap-6 text-sm text-thread-charcoal">
              <div className="flex items-center gap-1">
                <span className="font-medium">{members.length}</span>
                <span>homes</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">{memberCount}</span>
                <span>total members</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>{members.filter(m => m.isActive).length} active this week</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex justify-center mb-8">
            <div className="flex gap-3">
              <Link
                href={`/tr/${ringSlug}`}
                className="px-4 py-2 bg-thread-sage text-thread-paper rounded-md hover:bg-thread-pine transition-colors text-sm"
              >
                💬 Ring Discussion
              </Link>
              {!isRingMember && (
                <Link
                  href={`/tr/${ringSlug}?action=join`}
                  className="px-4 py-2 border border-thread-sage text-thread-sage rounded-md hover:bg-thread-sage hover:text-thread-paper transition-colors text-sm"
                >
                  ➕ Join Ring
                </Link>
              )}
              <button className="px-4 py-2 border border-thread-sage text-thread-sage rounded-md hover:bg-thread-sage hover:text-thread-paper transition-colors text-sm">
                🎲 Random Visit
              </button>
            </div>
          </div>

          {/* Neighborhood Grid */}
          <NeighborhoodGrid members={members} ringSlug={ringSlug} />

          {/* Ring Navigation */}
          <div className="mt-12 pt-8 border-t border-thread-sage text-center">
            <p className="text-thread-sage mb-4">
              Discover more communities
            </p>
            <Link
              href="/rings"
              className="inline-flex items-center gap-2 text-thread-pine hover:text-thread-sage transition-colors"
            >
              🔍 Explore All ThreadRings
            </Link>
          </div>
        </div>
      </Layout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.query
  
  if (typeof slug !== 'string') {
    return { notFound: true }
  }

  // Redirect to unified neighborhood system
  return {
    redirect: {
      destination: `/neighborhood/ring/${slug}`,
      permanent: true
    }
  }

  // Old SSR logic - keeping for reference but not used due to redirect above
  /*
  try {
    // Get ring and its members
    const ring = await db.threadRing.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: {
              include: {
                handles: true,
                profile: true
              }
            }
          },
          orderBy: { joinedAt: 'asc' }
        }
      }
    })

    if (!ring) {
      return { notFound: true }
    }

    // Check if current user is a ring member
    const { getSessionUser } = await import('../../../lib/auth/server')
    const currentUser = await getSessionUser(context.req as any)
    const isRingMember = currentUser ? ring.members.some(m => m.userId === currentUser.id) : false

    // Get home configs for all members
    const memberUserIds = ring.members.map(m => m.userId)
    const homeConfigs = await db.userHomeConfig.findMany({
      where: { userId: { in: memberUserIds } }
    })

    // Map home configs by userId for quick lookup
    const homeConfigMap = new Map(
      homeConfigs.map(config => [config.userId, config])
    )

    // Build member data with home configs
    const members: HomeMember[] = ring.members
      .filter(member => member.user.handles.length > 0) // Only members with handles
      .map(member => {
        const user = member.user
        const primaryHandle = user.handles.find(h => h.host === 'threadstead.com') || user.handles[0]
        const homeConfig = homeConfigMap.get(user.id)
        
        if (!primaryHandle) return null

        // Determine if user is active (has posted or been active in last week)
        // For now, we'll use joinedAt as a proxy - in a real implementation,
        // we'd check recent posts, comments, or other activity
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const isActive = new Date(member.joinedAt) > weekAgo

        return {
          userId: user.id,
          username: primaryHandle.handle,
          displayName: user.profile?.displayName || null,
          avatarUrl: user.profile?.avatarUrl || null,
          homeConfig: {
            houseTemplate: (homeConfig?.houseTemplate || 'cottage_v1') as HouseTemplate,
            palette: (homeConfig?.palette || 'thread_sage') as ColorPalette,
            seasonalOptIn: homeConfig?.seasonalOptIn || false
          },
          joinedAt: member.joinedAt.toISOString(),
          role: member.role,
          isActive
        }
      })
      .filter((member): member is HomeMember => member !== null)

    return {
      props: {
        ringName: ring.name,
        ringSlug: ring.slug,
        ringDescription: ring.description,
        members,
        memberCount: ring.memberCount,
        isRingMember
      }
    }

  } catch (error) {
    console.error('Ring neighborhood SSR error:', error)
    return { notFound: true }
  } finally {
    await db.$disconnect()
  }
  */
}