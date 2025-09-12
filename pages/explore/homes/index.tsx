import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Layout from '../../../components/ui/layout/Layout'
import ExploreHomesGrid from '../../../components/pixel-homes/ExploreHomesGrid'
import { HouseTemplate, ColorPalette } from '../../../components/pixel-homes/HouseSVG'
import { db } from '../../../lib/config/database/connection'
import Link from 'next/link'

interface HomeExploreData {
  userId: string
  username: string
  displayName?: string
  avatarUrl?: string
  homeConfig: {
    houseTemplate: HouseTemplate
    palette: ColorPalette
    seasonalOptIn: boolean
  }
  stats: {
    recentVisits: number
    ringMemberships: number
    isActive: boolean
  }
  connections: {
    mutualRings: number
    mutualFriends: number
    isFollowing: boolean
    isFollower: boolean
  }
}

interface ExploreHomesProps {
  homes: HomeExploreData[]
  totalCount: number
  filters: {
    template?: HouseTemplate
    palette?: ColorPalette
    sortBy: 'recent' | 'popular' | 'random' | 'alphabetical'
    showActiveOnly: boolean
  }
  currentUserId?: string
}

export default function ExploreHomes({
  homes,
  totalCount,
  filters,
  currentUserId
}: ExploreHomesProps) {
  const pageTitle = "🏘️ Explore Pixel Homes - ThreadStead Neighborhoods"
  const pageDescription = `Discover ${totalCount} unique pixel homes across ThreadStead. Find cottages, townhouses, lofts, and cabins with different themes and personalities.`

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL}/explore/homes`} />
        
        {/* Home exploration meta tags */}
        <meta name="explore:total-homes" content={totalCount.toString()} />
        <meta name="explore:filter" content={filters.sortBy} />
      </Head>

      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-thread-paper to-thread-cream">
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="bg-thread-paper border border-thread-sage rounded-lg p-8 shadow-sm mb-6">
                <h1 className="text-3xl font-headline font-bold text-thread-pine mb-4">
                  🏘️ Explore ThreadStead Neighborhoods
                </h1>
                
                <p className="text-thread-sage max-w-2xl mx-auto mb-6 leading-relaxed">
                  Discover pixel homes across ThreadStead. Every home tells a story - find connections, 
                  explore different styles, and visit neighbors you might not have met otherwise.
                </p>
                
                {/* Stats Bar */}
                <div className="flex items-center justify-center gap-8 text-sm text-thread-charcoal bg-thread-cream border border-thread-sage rounded-lg py-4 px-6 max-w-2xl mx-auto">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-thread-pine">{totalCount}</span>
                    <span className="text-thread-sage">total homes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-thread-pine">{homes.filter(h => h.stats.isActive).length}</span>
                    <span className="text-thread-sage">active this week</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-thread-pine">{homes.filter(h => h.connections.mutualRings > 0).length}</span>
                    <span className="text-thread-sage">connected to you</span>
                  </div>
                </div>
              </div>

              {/* Navigation Pills */}
              <div className="bg-thread-paper border border-thread-sage rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-headline font-medium text-thread-pine mb-4">Browse by Category</h2>
                <div className="flex justify-center">
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/explore/homes"
                      className="px-4 py-2 bg-thread-sage text-thread-paper rounded-md text-sm font-medium hover:bg-thread-pine transition-colors shadow-sm"
                    >
                      🌍 All Homes
                    </Link>
                    <Link
                      href="/explore/homes/recent"
                      className="px-4 py-2 bg-thread-paper border border-thread-sage text-thread-sage rounded-md text-sm font-medium hover:bg-thread-sage hover:text-thread-paper transition-colors"
                    >
                      ⚡ Recently Updated
                    </Link>
                    <Link
                      href="/explore/homes/popular"
                      className="px-4 py-2 bg-thread-paper border border-thread-sage text-thread-sage rounded-md text-sm font-medium hover:bg-thread-sage hover:text-thread-paper transition-colors"
                    >
                      🔥 Popular This Week
                    </Link>
                    {currentUserId && (
                      <>
                        <Link
                          href={`/neighborhood/mutual-friends/${currentUserId}`}
                          className="px-4 py-2 bg-thread-paper border border-thread-sage text-thread-sage rounded-md text-sm font-medium hover:bg-thread-sage hover:text-thread-paper transition-colors"
                        >
                          👥 Mutual Friends
                        </Link>
                        <Link
                          href={`/neighborhood/following/${currentUserId}`}
                          className="px-4 py-2 bg-thread-paper border border-thread-sage text-thread-sage rounded-md text-sm font-medium hover:bg-thread-sage hover:text-thread-paper transition-colors"
                        >
                          ➡️ People I Follow
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Explore Grid */}
            <div className="bg-thread-paper border border-thread-sage rounded-lg p-6 shadow-sm">
              <ExploreHomesGrid 
                homes={homes} 
                filters={filters}
                currentUserId={currentUserId}
              />
            </div>

            {/* Discovery Tips */}
            <div className="mt-8">
              <div className="bg-thread-paper border border-thread-sage rounded-lg p-8 shadow-sm">
                <h3 className="text-lg font-headline font-medium text-thread-pine text-center mb-6">
                  💡 Discovery Tips
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  <div className="text-center p-4 bg-thread-cream rounded-lg border border-thread-sage">
                    <div className="text-2xl mb-3">🎨</div>
                    <div className="font-medium text-thread-pine mb-2">Explore by Style</div>
                    <div className="text-sm text-thread-sage leading-relaxed">
                      Filter by house templates or color palettes to find homes that match your aesthetic
                    </div>
                  </div>
                  <div className="text-center p-4 bg-thread-cream rounded-lg border border-thread-sage">
                    <div className="text-2xl mb-3">🔗</div>
                    <div className="font-medium text-thread-pine mb-2">Find Connections</div>
                    <div className="text-sm text-thread-sage leading-relaxed">
                      Discover mutual friends, ThreadRing members, or people in your extended network
                    </div>
                  </div>
                  <div className="text-center p-4 bg-thread-cream rounded-lg border border-thread-sage">
                    <div className="text-2xl mb-3">⚡</div>
                    <div className="font-medium text-thread-pine mb-2">Stay Current</div>
                    <div className="text-sm text-thread-sage leading-relaxed">
                      Visit recently updated homes or popular destinations to see what&apos;s trending
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Random Discovery */}
            <div className="mt-8 text-center">
              <div className="bg-thread-paper border border-thread-sage rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-headline font-medium text-thread-pine mb-4">
                  🎲 Feeling Adventurous?
                </h3>
                <p className="text-thread-sage mb-4 max-w-md mx-auto">
                  Let serendipity guide you to unexpected connections and interesting homes
                </p>
                <Link
                  href="/explore/homes?random=true"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-thread-sage text-thread-paper rounded-md font-medium hover:bg-thread-pine transition-colors shadow-sm"
                >
                  🎲 Random Home Adventure
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Redirect to new unified neighborhood route
  const { template, palette, sort = 'recent', activeOnly = 'false', random } = context.query
  
  // Build redirect URL with query params
  let redirectPath = '/neighborhood/explore/all'
  
  if (sort === 'recent') redirectPath = '/neighborhood/explore/recent'
  else if (sort === 'popular') redirectPath = '/neighborhood/explore/popular'  
  else if (sort === 'random' || random === 'true') redirectPath = '/neighborhood/explore/random'
  
  // Add query params if they exist
  const queryParams = new URLSearchParams()
  if (template) queryParams.set('template', template as string)
  if (palette) queryParams.set('palette', palette as string)
  if (activeOnly === 'true') queryParams.set('activeOnly', 'true')
  
  const queryString = queryParams.toString()
  const finalRedirect = queryString ? `${redirectPath}?${queryString}` : redirectPath
  
  return {
    redirect: {
      destination: finalRedirect,
      permanent: true
    }
  }

}