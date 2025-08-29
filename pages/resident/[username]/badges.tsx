// pages/resident/[username]/badges.tsx
import React from 'react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import ProfileLayout from '@/components/layout/ProfileLayout'
import RetroCard from '@/components/layout/RetroCard'
import ThreadRing88x31Badge from '@/components/ThreadRing88x31Badge'
import { db } from '@/lib/db'
import { featureFlags } from '@/lib/feature-flags'
import { getSessionUser } from '@/lib/auth-server'
import { getPublicRingHubClient } from '@/lib/ringhub-client'
import { getUserDID } from '@/lib/server-did-client'

interface BadgeWithThreadRing {
  id: string
  title: string
  subtitle?: string
  imageUrl?: string
  templateId?: string
  backgroundColor: string
  textColor: string
  threadRing: {
    id: string
    name: string
    slug: string
    description?: string
    memberCount: number
    visibility: 'public' | 'unlisted' | 'private'
  }
  userMembership: {
    role: 'member' | 'moderator' | 'curator'
    joinedAt: string
  }
}

interface UserBadgesPageProps {
  username: string
  displayName?: string | null
  badges: BadgeWithThreadRing[]
  totalThreadRings: number
}

export default function UserBadgesPage({ 
  username, 
  displayName, 
  badges, 
  totalThreadRings 
}: UserBadgesPageProps) {
  const title = `${displayName || username}'s ThreadRing Badges`

  return (
    <>
      <Head>
        <title>{title} | ThreadStead</title>
        <meta name="description" content={`View ${displayName || username}'s ThreadRing badge collection`} />
      </Head>

      <ProfileLayout>
        <RetroCard>
          <div className="border-b-2 border-gray-300 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {displayName || username}&apos;s Badge Collection
                </h1>
                <p className="text-gray-600 mt-1">
                  Member of {totalThreadRings} ThreadRing{totalThreadRings !== 1 ? 's' : ''}
                  {badges.length > 0 && ` • ${badges.length} badge${badges.length !== 1 ? 's' : ''} displayed`}
                </p>
              </div>
              <Link 
                href={`/resident/${username}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                ← Back to Profile
              </Link>
            </div>
          </div>

          <div className="p-6">
            {badges.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏷️</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">No badges to display</h2>
                <p className="text-gray-600">
                  {username} hasn&apos;t selected any badges to display publicly, or they&apos;re not a member of any ThreadRings with badges yet.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Badge Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{badges.length}</div>
                    <div className="text-sm text-blue-800">Badges Displayed</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {badges.filter(b => b.userMembership.role === 'curator').length}
                    </div>
                    <div className="text-sm text-green-800">Curated ThreadRings</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {badges.filter(b => b.userMembership.role === 'moderator').length}
                    </div>
                    <div className="text-sm text-purple-800">Moderated ThreadRings</div>
                  </div>
                </div>

                {/* Badge Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {badges.map((badge) => (
                    <div 
                      key={badge.id}
                      className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
                    >
                      {/* Badge Display */}
                      <div className="flex justify-center mb-4">
                        <ThreadRing88x31Badge
                          title={badge.title}
                          subtitle={badge.subtitle}
                          imageUrl={badge.imageUrl}
                          templateId={badge.templateId}
                          backgroundColor={badge.backgroundColor}
                          textColor={badge.textColor}
                          className="transform hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* ThreadRing Info */}
                      <div className="text-center space-y-3">
                        <Link 
                          href={`/tr/${badge.threadRing.slug}`}
                          className="block group"
                        >
                          <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                            {badge.threadRing.name}
                          </h3>
                          {badge.threadRing.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {badge.threadRing.description}
                            </p>
                          )}
                        </Link>

                        {/* Membership Info */}
                        <div className="pt-3 border-t border-gray-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Role:</span>
                            <span className={`font-medium px-2 py-1 rounded text-xs ${
                              badge.userMembership.role === 'curator' 
                                ? 'bg-blue-100 text-blue-800'
                                : badge.userMembership.role === 'moderator'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {badge.userMembership.role}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-2">
                            <span className="text-gray-500">Joined:</span>
                            <span className="text-gray-700">
                              {new Date(badge.userMembership.joinedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm mt-2">
                            <span className="text-gray-500">Members:</span>
                            <span className="text-gray-700">{badge.threadRing.memberCount}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Note */}
                <div className="text-center text-sm text-gray-500 mt-8 pt-6 border-t border-gray-200">
                  These badges represent ThreadRing communities that {displayName || username} is a member of.
                  <br />
                  Badge display preferences can be configured in profile settings.
                </div>
              </div>
            )}
          </div>
        </RetroCard>
      </ProfileLayout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<UserBadgesPageProps> = async ({ params, req }) => {
  // Get current user to check if they're an admin
  const currentUser = await getSessionUser(req as any)
  
  // ThreadRings are now always enabled

  const usernameParam = Array.isArray(params?.username) ? params.username[0] : String(params?.username || "")
  
  if (!usernameParam) {
    return { notFound: true }
  }

  try {
    // Find user by handle
    const handle = await db.handle.findFirst({
      where: { 
        handle: usernameParam.toLowerCase(),
        host: process.env.SITE_HANDLE_DOMAIN || 'HomePageAgain'
      },
      include: { 
        user: {
          include: {
            profile: {
              select: {
                displayName: true,
                badgePreferences: true
              }
            }
          }
        }
      }
    })

    if (!handle?.user) {
      return { notFound: true }
    }

    const userId = handle.user.id
    const displayName = handle.user.profile?.displayName || null

    // Use Ring Hub if enabled
    if (featureFlags.ringhub()) {
      try {
        // Get user's DID for Ring Hub lookup
        const userDID = await getUserDID(userId)
        if (userDID) {
          const publicClient = getPublicRingHubClient()
          if (publicClient) {
            // Fetch badges from Ring Hub
            const ringHubBadges = await publicClient.getActorBadges(userDID, {
              status: 'active',
              limit: 100 // Get all active badges
            })

            // Fetch all unique rings to get their current badge designs
            const uniqueRingSlugs = [...new Set(ringHubBadges.badges.map(b => b.ring.slug))]
            const ringDataMap = new Map<string, any>()
            
            // Fetch ring data in parallel for all unique rings
            const ringFetchPromises = uniqueRingSlugs.map(async slug => {
              try {
                const ring = await publicClient.getRing(slug)
                if (ring) {
                  ringDataMap.set(slug, ring)
                }
              } catch (error) {
                // Silently continue if ring data fetch fails
              }
            })
            
            await Promise.all(ringFetchPromises)

            // Transform Ring Hub badges to our expected format
            const transformedBadges: BadgeWithThreadRing[] = ringHubBadges.badges.map(badge => {
              const ring = ringDataMap.get(badge.ring.slug)
              const achievement = badge.badge.credentialSubject?.achievement
              return {
                id: badge.ring.slug,
                title: ring?.name || achievement?.name || badge.ring.name,
                subtitle: badge.membership.role !== 'member' ? (badge.membership.role.toLowerCase() === 'owner' ? 'curator' : badge.membership.role.toLowerCase()) : undefined,
                // Use the ring's current badge URL if available, fallback to achievement image
                imageUrl: ring?.badgeImageUrl || ring?.badgeImageHighResUrl || achievement?.image,
                templateId: undefined, // Not available from Ring Hub
                backgroundColor: '#4A90E2', // Default color
                textColor: '#FFFFFF', // Default color
                threadRing: {
                  id: badge.ring.slug,
                  name: badge.ring.name,
                  slug: badge.ring.slug,
                  description: ring?.description || achievement?.description,
                  memberCount: ring?.memberCount || 0,
                  visibility: badge.ring.visibility.toLowerCase() as 'public' | 'unlisted' | 'private'
                },
                userMembership: {
                  role: (badge.membership.role.toLowerCase() === 'owner' ? 'curator' : badge.membership.role.toLowerCase()) as 'member' | 'moderator' | 'curator',
                  joinedAt: badge.membership.joinedAt
                }
              }
            })

            return {
              props: {
                username: usernameParam,
                displayName,
                badges: transformedBadges,
                totalThreadRings: transformedBadges.length // Use badge count as approximation
              }
            }
          }
        }
      } catch (error) {
        console.error('Ring Hub badges fetch failed in SSR:', error)
        // Return empty badges if Ring Hub fails
        return {
          props: {
            username: usernameParam,
            displayName,
            badges: [],
            totalThreadRings: 0
          }
        }
      }
    }

    // No Ring Hub enabled, return empty
    return {
      props: {
        username: usernameParam,
        displayName,
        badges: [],
        totalThreadRings: 0
      }
    }
  } catch (error) {
    console.error('Error fetching user badges:', error)
    return { notFound: true }
  }
}