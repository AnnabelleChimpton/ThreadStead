import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface DiscoverHubProps {
  siteConfig: SiteConfig;
}

export default function DiscoverHub({ siteConfig }: DiscoverHubProps) {
  return (
    <>
      <Head>
        <title>HomePageAgain — Discover</title>
        <meta name="description" content="Explore pixel homes in street view, meet neighbors, and discover what's new in our vibrant community." />
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/discover`} />
        <meta name="robots" content="index, follow" />

        <meta property="og:title" content="HomePageAgain — Discover" />
        <meta property="og:description" content="Explore pixel homes in street view, meet neighbors, and discover what's new in our vibrant community." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/discover`} />
      </Head>

      <Layout siteConfig={siteConfig}>
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
          {/* Hero Section */}
          <div className="mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-cyan-100 via-teal-50 to-emerald-100 border-2 border-black rounded-lg shadow-[4px_4px_0_#000] p-6 sm:p-8 text-center">
              <h1 className="text-4xl sm:text-5xl font-bold text-thread-pine mb-4">
                Explore the Neighborhood
              </h1>
              <p className="text-xl sm:text-2xl text-thread-sage max-w-3xl mx-auto mb-3">
                Stroll through pixel homes, meet your neighbors, and discover what makes our community special
              </p>
              <p className="text-base text-gray-600 max-w-2xl mx-auto">
                From immersive street views to random discoveries, find your own path through the neighborhood
              </p>
            </div>
          </div>

          {/* HERO FEATURE: Neighborhoods */}
          <div className="mb-12">
            <div className="bg-gradient-to-br from-thread-cream via-thread-paper to-pink-50 border-2 border-thread-sage rounded-lg shadow-[4px_4px_0_#A18463] p-8 sm:p-10 hover:shadow-[6px_6px_0_#A18463] transition-shadow">
              <div className="text-center mb-8">
                <div className="mb-4 flex justify-center">
                  <PixelIcon name="home" size={48} />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-thread-pine mb-3">
                  Pixel Home Neighborhoods
                </h2>
                <p className="text-lg text-thread-sage max-w-2xl mx-auto mb-6">
                  Experience our unique visual neighborhoods with street, grid, and map views
                </p>
              </div>

              {/* Neighborhood Exploration Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Link
                  href="/neighborhood/explore/all"
                  className="bg-white border-2 border-thread-sage rounded-lg p-5 hover:bg-thread-cream transition-colors shadow-sm hover:shadow-md text-center"
                >
                  <div className="mb-2 flex justify-center">
                    <PixelIcon name="home" size={32} />
                  </div>
                  <div className="font-bold text-thread-pine mb-1">Street View</div>
                  <div className="text-sm text-thread-sage">Immersive stroll</div>
                </Link>

                <Link
                  href="/neighborhood/explore/all"
                  className="bg-white border-2 border-thread-sage rounded-lg p-5 hover:bg-thread-cream transition-colors shadow-sm hover:shadow-md text-center"
                >
                  <div className="text-3xl mb-2">⊞</div>
                  <div className="font-bold text-thread-pine mb-1">Grid View</div>
                  <div className="text-sm text-thread-sage">Browse all homes</div>
                </Link>

                <Link
                  href="/neighborhood/explore/all"
                  className="bg-white border-2 border-thread-sage rounded-lg p-5 hover:bg-thread-cream transition-colors shadow-sm hover:shadow-md text-center"
                >
                  <div className="mb-2 flex justify-center"><PixelIcon name="map" size={32} /></div>
                  <div className="font-bold text-thread-pine mb-1">Map View</div>
                  <div className="text-sm text-thread-sage">Bird&apos;s eye</div>
                </Link>

                <Link
                  href="/neighborhood/explore/random"
                  className="bg-gradient-to-br from-pink-100 to-purple-100 border-2 border-pink-300 rounded-lg p-5 hover:from-pink-200 hover:to-purple-200 transition-colors shadow-sm hover:shadow-md text-center"
                >
                  <div className="mb-2 flex justify-center"><PixelIcon name="dice" size={32} /></div>
                  <div className="font-bold text-thread-pine mb-1">Random</div>
                  <div className="text-sm text-purple-700">Adventure mode!</div>
                </Link>
              </div>

              {/* Primary CTA */}
              <div className="text-center">
                <Link
                  href="/neighborhood/explore/all"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-thread-sage !text-white text-lg font-bold rounded-lg hover:bg-thread-pine transition-colors shadow-md hover:shadow-lg"
                >
                  <PixelIcon name="home" size={16} className="inline-block align-middle" /> Explore Pixel Homes
                </Link>
              </div>
            </div>
          </div>

          {/* Secondary Exploration Modes */}
          <div className="mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-thread-pine mb-6 text-center">
              Other Ways to Discover
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Residents */}
              <Link
                href="/discover/residents"
                className="bg-thread-cream border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463] p-6 hover:shadow-[4px_4px_0_#A18463] transition-shadow"
              >
                <div className="mb-4 flex justify-center">
                  <PixelIcon name="users" size={32} />
                </div>
                <h3 className="text-xl font-bold text-thread-pine mb-2">
                  Meet Residents
                </h3>
                <p className="text-thread-sage mb-4">
                  Discover community members and connect with neighbors
                </p>
                <div className="text-thread-sunset font-medium">
                  Browse Profiles →
                </div>
              </Link>

              {/* Feed */}
              <Link
                href="/discover/feed"
                className="bg-thread-cream border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463] p-6 hover:shadow-[4px_4px_0_#A18463] transition-shadow"
              >
                <div className="mb-4 flex justify-center">
                  <PixelIcon name="article" size={32} />
                </div>
                <h3 className="text-xl font-bold text-thread-pine mb-2">
                  Community Feed
                </h3>
                <p className="text-thread-sage mb-4">
                  See what&apos;s new with latest posts and discussions
                </p>
                <div className="text-thread-sunset font-medium">
                  View Feed →
                </div>
              </Link>

              {/* Search */}
              <Link
                href="/discover/search"
                className="bg-thread-cream border border-thread-sage rounded-lg shadow-[2px_2px_0_#A18463] p-6 hover:shadow-[4px_4px_0_#A18463] transition-shadow"
              >
                <div className="mb-4 flex justify-center">
                  <PixelIcon name="search" size={32} />
                </div>
                <h3 className="text-xl font-bold text-thread-pine mb-2">
                  Search
                </h3>
                <p className="text-thread-sage mb-4">
                  Find specific content across the indie web
                </p>
                <div className="text-thread-sunset font-medium">
                  Start Searching →
                </div>
              </Link>
            </div>
          </div>

          {/* Serendipity Section */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-8 text-center">
            <div className="mb-4 flex justify-center">
              <PixelIcon name="dice" size={48} />
            </div>
            <h3 className="text-2xl font-bold text-thread-pine mb-3">
              Feeling Adventurous?
            </h3>
            <p className="text-lg text-thread-sage mb-6 max-w-2xl mx-auto">
              Let serendipity guide you to unexpected connections and delightful discoveries
            </p>
            <Link
              href="/neighborhood/explore/random"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 !text-white rounded-lg font-bold hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg"
            >
              <PixelIcon name="dice" size={20} /> Random Home Adventure
            </Link>
          </div>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    }
  };
};
