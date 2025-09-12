import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Layout from '../../../components/ui/layout/Layout'
import NeighborhoodGrid from '../../../components/pixel-homes/NeighborhoodGrid'
import { HouseTemplate, ColorPalette } from '../../../components/pixel-homes/HouseSVG'
import { db } from '../../../lib/config/database/connection'
import Link from 'next/link'

interface MutualFriend {
  userId: string
  username: string
  displayName?: string
  avatarUrl?: string
  homeConfig: {
    houseTemplate: HouseTemplate
    palette: ColorPalette
    seasonalOptIn: boolean
  }
  connectionType: 'mutual_friend' | 'friend_of_friend' | 'mutual_ring'
  mutualConnections: number
  joinedAt: string
  role: string
  isActive: boolean
}

interface MutualFriendsNeighborhoodProps {
  targetUsername: string
  targetDisplayName?: string
  mutualFriends: MutualFriend[]
  friendsOfFriends: MutualFriend[]
  mutualRingMembers: MutualFriend[]
  currentUserIsOwner: boolean
}

export default function MutualFriendsNeighborhood({
  targetUsername,
  targetDisplayName,
  mutualFriends,
  friendsOfFriends,
  mutualRingMembers,
  currentUserIsOwner
}: MutualFriendsNeighborhoodProps) {
  const displayName = targetDisplayName || targetUsername
  const totalConnections = mutualFriends.length + friendsOfFriends.length + mutualRingMembers.length
  
  const pageTitle = currentUserIsOwner 
    ? "🤝 Your Network Neighborhood - Connected Homes"
    : `🤝 ${displayName}'s Network - Mutual Connections`
    
  const pageDescription = currentUserIsOwner
    ? `Explore ${totalConnections} pixel homes in your extended network - mutual friends, friends of friends, and ThreadRing connections.`
    : `Discover ${totalConnections} homes connected to ${displayName} through mutual friends and shared communities.`

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL}/neighborhood/mutual-friends/${targetUsername}`} />
      </Head>

      <Layout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-sm text-thread-sage mb-2">
              <Link href="/neighborhood/explore/all" className="hover:text-thread-pine transition-colors">
                Explore Homes
              </Link>
              <span>→</span>
              <span>Network Connections</span>
            </div>
            
            <h1 className="text-3xl font-headline font-bold text-thread-pine mb-3">
              🤝 {currentUserIsOwner ? 'Your' : `${displayName}'s`} Network Neighborhood
            </h1>
            
            <p className="text-thread-sage max-w-2xl mx-auto mb-6">
              {currentUserIsOwner 
                ? "Discover homes of people in your extended network - friends, friends of friends, and ThreadRing connections."
                : `Explore homes connected to ${displayName} through mutual relationships and shared communities.`
              }
            </p>
            
            {/* Network Stats */}
            <div className="flex items-center justify-center gap-6 text-sm text-thread-charcoal bg-thread-paper border border-thread-sage rounded-lg py-4 px-6 max-w-2xl mx-auto">
              <div className="flex items-center gap-1">
                <span className="font-medium">{mutualFriends.length}</span>
                <span>mutual friends</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">{friendsOfFriends.length}</span>
                <span>friends of friends</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">{mutualRingMembers.length}</span>
                <span>ring connections</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex justify-center mb-8">
            <div className="flex flex-wrap gap-2">
              <button className="px-4 py-2 bg-thread-sage text-thread-paper rounded-full text-sm">
                👥 All Connections
              </button>
              <button className="px-4 py-2 border border-thread-sage text-thread-sage rounded-full text-sm hover:bg-thread-sage hover:text-thread-paper transition-colors">
                🤝 Direct Friends
              </button>
              <button className="px-4 py-2 border border-thread-sage text-thread-sage rounded-full text-sm hover:bg-thread-sage hover:text-thread-paper transition-colors">
                🔗 Ring Members
              </button>
              <button className="px-4 py-2 border border-thread-sage text-thread-sage rounded-full text-sm hover:bg-thread-sage hover:text-thread-paper transition-colors">
                🌐 Extended Network
              </button>
            </div>
          </div>

          {totalConnections === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🏘️</div>
              <div className="text-xl font-headline text-thread-pine mb-2">No network connections found</div>
              <div className="text-thread-sage mb-6">
                {currentUserIsOwner 
                  ? "Start following people and joining ThreadRings to build your network!"
                  : `${displayName} hasn't built their network yet, or you don't share any connections.`
                }
              </div>
              <div className="flex justify-center gap-4">
                <Link
                  href="/neighborhood/explore/all"
                  className="px-4 py-2 bg-thread-sage text-thread-paper rounded-md hover:bg-thread-pine transition-colors"
                >
                  🌍 Explore All Homes
                </Link>
                <Link
                  href="/rings"
                  className="px-4 py-2 border border-thread-sage text-thread-sage rounded-md hover:bg-thread-sage hover:text-thread-paper transition-colors"
                >
                  🔍 Browse ThreadRings
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Mutual Friends Section */}
              {mutualFriends.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-xl font-headline font-medium text-thread-pine mb-4 flex items-center gap-2">
                    🤝 Mutual Friends
                    <span className="text-sm font-normal text-thread-sage">({mutualFriends.length})</span>
                  </h2>
                  <NeighborhoodGrid members={mutualFriends} ringSlug="mutual-friends" />
                </div>
              )}

              {/* Mutual Ring Members Section */}
              {mutualRingMembers.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-xl font-headline font-medium text-thread-pine mb-4 flex items-center gap-2">
                    🔗 Shared ThreadRing Members
                    <span className="text-sm font-normal text-thread-sage">({mutualRingMembers.length})</span>
                  </h2>
                  <NeighborhoodGrid members={mutualRingMembers} ringSlug="mutual-rings" />
                </div>
              )}

              {/* Friends of Friends Section */}
              {friendsOfFriends.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-xl font-headline font-medium text-thread-pine mb-4 flex items-center gap-2">
                    🌐 Extended Network
                    <span className="text-sm font-normal text-thread-sage">({friendsOfFriends.length})</span>
                  </h2>
                  <p className="text-sm text-thread-sage mb-4">
                    People connected through friends and broader network relationships
                  </p>
                  <NeighborhoodGrid members={friendsOfFriends} ringSlug="extended-network" />
                </div>
              )}
            </>
          )}

          {/* Discovery Suggestions */}
          <div className="mt-12 pt-8 border-t border-thread-sage text-center">
            <h3 className="text-lg font-headline font-medium text-thread-pine mb-4">
              🔍 Expand Your Network
            </h3>
            <div className="flex justify-center gap-4">
              <Link
                href="/neighborhood/explore/popular"
                className="px-4 py-2 bg-thread-cream border border-thread-sage text-thread-pine rounded-md hover:bg-thread-sage hover:text-thread-paper transition-colors"
              >
                🔥 Popular Homes
              </Link>
              <Link
                href="/neighborhood/explore/random"
                className="px-4 py-2 bg-thread-cream border border-thread-sage text-thread-pine rounded-md hover:bg-thread-sage hover:text-thread-paper transition-colors"
              >
                🎲 Random Discovery
              </Link>
              <Link
                href="/rings"
                className="px-4 py-2 bg-thread-cream border border-thread-sage text-thread-pine rounded-md hover:bg-thread-sage hover:text-thread-paper transition-colors"
              >
                🏛️ Browse ThreadRings
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { username } = context.query
  
  if (typeof username !== 'string') {
    return { notFound: true }
  }

  try {
    // Get current user
    const { getSessionUser } = await import('../../../lib/auth/server')
    const currentUser = await getSessionUser(context.req as any)
    
    if (!currentUser) {
      return {
        redirect: {
          destination: '/login',
          permanent: false
        }
      }
    }

    // Find target user
    const targetUserHandle = await db.handle.findFirst({
      where: { handle: username.toLowerCase() },
      include: { 
        user: {
          include: {
            profile: { select: { displayName: true } }
          }
        }
      }
    })

    if (!targetUserHandle) {
      return { notFound: true }
    }

    const targetUser = targetUserHandle.user
    const currentUserIsOwner = currentUser.id === targetUser.id

    // Get mutual friends (bidirectional follows)
    const mutualFriendsQuery = await db.follow.findMany({
      where: {
        AND: [
          { followerId: currentUser.id },
          {
            followee: {
              followers: {
                some: { followerId: targetUser.id }
              }
            }
          },
          {
            followee: {
              following: {
                some: { followeeId: targetUser.id }
              }
            }
          }
        ]
      },
      include: {
        followee: {
          include: {
            handles: true,
            profile: { select: { displayName: true, avatarUrl: true } }
          }
        }
      }
    })

    // Get home configs for mutual friends
    const mutualFriendUserIds = mutualFriendsQuery.map(f => f.followee.id)
    const mutualFriendHomeConfigs = await db.userHomeConfig.findMany({
      where: { userId: { in: mutualFriendUserIds } },
      include: {
        user: {
          include: {
            handles: true,
            profile: { select: { displayName: true, avatarUrl: true } }
          }
        }
      }
    })

    // Transform mutual friends data
    const mutualFriends: MutualFriend[] = mutualFriendHomeConfigs
      .filter(config => config.user.handles.length > 0)
      .map(config => ({
        userId: config.user.id,
        username: (config.user.handles.find(h => h.host === 'threadstead.com') || config.user.handles[0]).handle,
        displayName: config.user.profile?.displayName || undefined,
        avatarUrl: config.user.profile?.avatarUrl || undefined,
        homeConfig: {
          houseTemplate: config.houseTemplate as HouseTemplate,
          palette: config.palette as ColorPalette,
          seasonalOptIn: config.seasonalOptIn
        },
        connectionType: 'mutual_friend',
        mutualConnections: 1,
        joinedAt: config.createdAt.toISOString(),
        role: 'member',
        isActive: config.updatedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }))

    // For this demo, we'll use simplified queries
    // In production, you'd want more complex queries for friends-of-friends and mutual ring members
    const friendsOfFriends: MutualFriend[] = []
    const mutualRingMembers: MutualFriend[] = []

    return {
      props: {
        targetUsername: username,
        targetDisplayName: targetUser.profile?.displayName || null,
        mutualFriends,
        friendsOfFriends,
        mutualRingMembers,
        currentUserIsOwner
      }
    }

  } catch (error) {
    console.error('Mutual friends neighborhood SSR error:', error)
    return { notFound: true }
  } finally {
    await db.$disconnect()
  }
}