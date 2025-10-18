import Layout from "../../components/ui/layout/Layout";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import Link from "next/link";
import Head from "next/head";
import { contentMetadataGenerator } from "@/lib/utils/metadata/content-metadata";

interface LandingPageProps {
  siteConfig: SiteConfig;
}

// Simple card component for landing page
function SimpleCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-3 sm:p-4 mb-3 sm:mb-4 w-full max-w-full overflow-hidden">
      {title && <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-[#2E4B3F] px-1">{title}</h3>}
      {children}
    </div>
  );
}

export default function LandingPage({ siteConfig }: LandingPageProps) {
  // Generate metadata for landing page
  const homepageMetadata = contentMetadataGenerator.generateHomepageMetadata(siteConfig);

  return (
    <>
      <Head>
        <title>{homepageMetadata.title}</title>
        <meta name="description" content={homepageMetadata.description} />
        {homepageMetadata.keywords && (
          <meta name="keywords" content={homepageMetadata.keywords.join(', ')} />
        )}
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_BASE_URL}/landing`} />
        <meta name="robots" content="index, follow" />

        {/* OpenGraph meta tags */}
        <meta property="og:title" content={homepageMetadata.title} />
        <meta property="og:description" content={homepageMetadata.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL}/landing`} />
        <meta property="og:site_name" content={siteConfig.site_name} />
        <meta property="og:locale" content="en_US" />

        {/* Social media card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={homepageMetadata.title} />
        <meta name="twitter:description" content={homepageMetadata.description} />

        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(homepageMetadata.structuredData, null, 0)
          }}
        />
      </Head>

      <Layout siteConfig={siteConfig}>
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <SimpleCard title={`Welcome to ${siteConfig.site_name}`}>
          <div className="text-center py-4 sm:py-6">
            <div className="text-4xl sm:text-5xl mb-4">🏘️✨</div>
            <h1 className="text-xl sm:text-2xl font-bold mb-4 px-2">{siteConfig.welcome_message}</h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-700 mb-4 px-2">
              <strong>Create your pixel home, join ThreadRings (themed communities), and connect with creative people in a retro-inspired social platform on {siteConfig.site_name}.</strong>
            </p>
            <p className="text-sm sm:text-base text-gray-600 mb-6 px-2">Build your unique space, discover amazing communities, and share your creativity with the world.</p>

            {/* Single primary CTA */}
            <div className="mb-4">
              <Link
                href="/signup"
                className="border border-black px-6 sm:px-8 py-3 sm:py-4 bg-yellow-200 hover:bg-yellow-100 shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] inline-block text-lg sm:text-xl font-bold transition-all transform hover:-translate-y-0.5"
              >
                🚀 Start Your Journey
              </Link>
            </div>

            {/* Secondary actions - More prominent */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-2 mb-4">
              <Link
                href="/feed"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-black shadow-[2px_2px_0_#000] font-medium text-sm transition-colors"
              >
                <span>👀</span>
                <span>Browse as Guest</span>
              </Link>
              <Link
                href="/getting-started"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-black shadow-[2px_2px_0_#000] font-medium text-sm transition-colors"
              >
                <span>📖</span>
                <span>Learn More</span>
              </Link>
            </div>

            {/* Login link for existing users */}
            <div className="text-sm">
              <span className="text-gray-500">Already a member?</span>{' '}
              <Link
                href="/login"
                className="text-thread-pine hover:text-thread-sunset underline font-medium"
              >
                Sign in here
              </Link>
            </div>
          </div>
        </SimpleCard>

        <SimpleCard title={`How ${siteConfig.site_name} Works`}>
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm sm:text-base text-gray-700 px-1">
                Modern communities inspired by the early web&apos;s <strong>WebRings</strong> — but better!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="border border-gray-300 p-4 bg-blue-50 rounded text-center">
                <div className="text-2xl mb-2">🏠</div>
                <h3 className="font-bold mb-2 text-sm sm:text-base">Create Your Space</h3>
                <p className="text-xs sm:text-sm text-gray-600">Build a unique pixel home and customize your profile</p>
              </div>
              <div className="border border-gray-300 p-4 bg-green-50 rounded text-center">
                <div className="text-2xl mb-2">💍</div>
                <h3 className="font-bold mb-2 text-sm sm:text-base">Join ThreadRings</h3>
                <p className="text-xs sm:text-sm text-gray-600">Find communities around your interests and hobbies</p>
              </div>
              <div className="border border-gray-300 p-4 bg-purple-50 rounded text-center">
                <div className="text-2xl mb-2">✨</div>
                <h3 className="font-bold mb-2 text-sm sm:text-base">Share & Connect</h3>
                <p className="text-xs sm:text-sm text-gray-600">Post content that appears on your profile and in Ring feeds</p>
              </div>
            </div>

            <div className="text-center pt-4">
              <Link
                href="/threadrings"
                className="border border-black px-4 py-2 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] inline-block font-medium text-sm sm:text-base transition-all transform hover:-translate-y-0.5"
              >
                💍 Explore Communities
              </Link>
            </div>
          </div>
        </SimpleCard>

        {/* NEW: Quick Explore Section - Make key features immediately accessible */}
        <SimpleCard title="Explore Right Now">
          <div className="space-y-4">
            <p className="text-sm sm:text-base text-gray-600 text-center px-1 mb-4">
              Jump right in! No account needed to explore.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/home/demo"
                className="flex items-center gap-3 p-4 bg-pink-50 hover:bg-pink-100 border-2 border-pink-300 rounded-lg transition-colors group shadow-sm hover:shadow-md"
              >
                <span className="text-2xl flex-shrink-0">🎨</span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base mb-1 group-hover:text-thread-sunset">Try Pixel Home Demo</h3>
                  <p className="text-xs sm:text-sm text-gray-600">See what you can build - interactive preview!</p>
                </div>
              </Link>

              <Link
                href="/feed"
                className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 border border-gray-300 rounded-lg transition-colors group"
              >
                <span className="text-2xl flex-shrink-0">📰</span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base mb-1 group-hover:text-thread-sunset">Community Feed</h3>
                  <p className="text-xs sm:text-sm text-gray-600">See what everyone is posting and sharing</p>
                </div>
              </Link>

              <Link
                href="/neighborhood/explore/all"
                className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-gray-300 rounded-lg transition-colors group"
              >
                <span className="text-2xl flex-shrink-0">🏘️</span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base mb-1 group-hover:text-thread-sunset">Browse Homes</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Visit member pixel homes and profiles</p>
                </div>
              </Link>

              <Link
                href="/threadrings"
                className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 border border-gray-300 rounded-lg transition-colors group"
              >
                <span className="text-2xl flex-shrink-0">💍</span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base mb-1 group-hover:text-thread-sunset">ThreadRings</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Discover themed communities to join</p>
                </div>
              </Link>

              <Link
                href="/directory"
                className="flex items-center gap-3 p-4 bg-yellow-50 hover:bg-yellow-100 border border-gray-300 rounded-lg transition-colors group"
              >
                <span className="text-2xl flex-shrink-0">📚</span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base mb-1 group-hover:text-thread-sunset">Member Directory</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Find and connect with community members</p>
                </div>
              </Link>
            </div>
          </div>
        </SimpleCard>

        <SimpleCard title="Community Highlights">
          <div className="text-center py-4">
            <p className="text-sm sm:text-base text-gray-600 mb-4 px-1">Join our growing community of creative individuals</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div className="bg-green-50 p-3 border border-gray-200 rounded">
                <div className="font-bold text-green-800 text-sm sm:text-base">Active Members</div>
                <div className="text-gray-600">Building connections daily</div>
              </div>
              <div className="bg-purple-50 p-3 border border-gray-200 rounded">
                <div className="font-bold text-purple-800 text-sm sm:text-base">ThreadRings</div>
                <div className="text-gray-600">Communities to explore</div>
              </div>
            </div>
          </div>
        </SimpleCard>
      </div>
    </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<LandingPageProps> = async () => {
  const siteConfig = await getSiteConfig();

  return {
    props: {
      siteConfig,
    },
  };
};