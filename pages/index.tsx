import Layout from "../components/ui/layout/Layout";
import CustomPageLayout from "../components/ui/layout/CustomPageLayout";
import Head from "next/head";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/auth/server";
import Link from "next/link";
import { WidgetContainer } from "@/components/widgets";
import { useDefaultWidgets, useWidgets } from "@/hooks/useWidgets";
import { useState, useEffect } from "react";
import EnhancedHouseCanvas from "../components/pixel-homes/EnhancedHouseCanvas";
import { HouseTemplate, ColorPalette, HouseCustomizations } from "../components/pixel-homes/HouseSVG";
import DiscoverPageSearch from "../components/features/search/DiscoverPageSearch";
import { useRouter } from "next/router";
import { contentMetadataGenerator } from "@/lib/utils/metadata/content-metadata";
import VisitorPixelHome from "@/components/home/VisitorPixelHome";

const db = new PrismaClient();

interface HomeProps {
  siteConfig: SiteConfig;
  pageType: 'custom' | 'landing' | 'homepage' | 'unified';
  user?: {
    id: string;
    did: string;
    role: string;
    primaryHandle: string | null;
  };
  customPage?: {
    id: string;
    slug: string;
    title: string;
    content: string;
    hideNavbar: boolean;
    createdAt: string;
    updatedAt: string;
  };
  customLandingPageSlug?: string;
}

interface UserHomeConfig {
  houseTemplate: string;
  palette: string;
  bookSkin?: string;
  seasonalOptIn: boolean;
  preferPixelHome: boolean;
  atmosphere?: {
    sky: string;
    weather: string;
    timeOfDay: string;
  };
  houseCustomizations?: any;
}

// Simple card component for homepage (avoids thread-module min-width issues)
function SimpleCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-3 sm:p-4 mb-3 sm:mb-4 w-full max-w-full overflow-hidden">
      {title && <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-[#2E4B3F] px-1">{title}</h3>}
      {children}
    </div>
  );
}

interface DecorationItem {
  id: string;
  type: 'plant' | 'path' | 'feature' | 'seasonal';
  zone: 'front_yard' | 'house_facade' | 'background';
  position: { x: number; y: number; layer?: number };
  variant?: string;
  size?: 'small' | 'medium' | 'large';
}

interface AtmosphereSettings {
  sky: 'sunny' | 'cloudy' | 'sunset' | 'night';
  weather: 'clear' | 'light_rain' | 'light_snow';
  timeOfDay: 'morning' | 'midday' | 'evening' | 'night';
}

// Helper function to safely convert API customizations to HouseCustomizations
const sanitizeCustomizations = (customizations: any): HouseCustomizations | undefined => {
  if (!customizations) return undefined;

  const validWindowStyles = ['default', 'round', 'arched', 'bay'] as const;
  const validDoorStyles = ['default', 'arched', 'double', 'cottage'] as const;
  const validRoofTrims = ['default', 'ornate', 'scalloped', 'gabled'] as const;

  return {
    windowStyle: validWindowStyles.includes(customizations.windowStyle)
      ? customizations.windowStyle
      : 'default',
    doorStyle: validDoorStyles.includes(customizations.doorStyle)
      ? customizations.doorStyle
      : 'default',
    roofTrim: validRoofTrims.includes(customizations.roofTrim)
      ? customizations.roofTrim
      : 'default',
    wallColor: typeof customizations.wallColor === 'string' ? customizations.wallColor : undefined,
    roofColor: typeof customizations.roofColor === 'string' ? customizations.roofColor : undefined,
    trimColor: typeof customizations.trimColor === 'string' ? customizations.trimColor : undefined,
    windowColor: typeof customizations.windowColor === 'string' ? customizations.windowColor : undefined,
    detailColor: typeof customizations.detailColor === 'string' ? customizations.detailColor : undefined,
    houseTitle: typeof customizations.houseTitle === 'string' ? customizations.houseTitle : undefined,
    houseDescription: typeof customizations.houseDescription === 'string' ? customizations.houseDescription : undefined,
    houseBoardText: typeof customizations.houseBoardText === 'string' ? customizations.houseBoardText : undefined,
  };
};

// Component to display user's pixel home
function UserPixelHome({ user }: { user: any }) {
  const [homeConfig, setHomeConfig] = useState<UserHomeConfig | null>(null);
  const [decorations, setDecorations] = useState<DecorationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Prevent hydration mismatch by only rendering after client hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !user?.primaryHandle) return;

    const fetchHomeData = async () => {
      try {
        const username = user.primaryHandle.split('@')[0];

        // Fetch both home config and decorations in parallel
        const [homeResponse, decorationsResponse] = await Promise.all([
          fetch(`/api/home/${username}`),
          fetch(`/api/home/decorations/load?username=${username}`)
        ]);

        if (homeResponse.ok) {
          const data = await homeResponse.json();
          setHomeConfig(data.homeConfig);
        }

        // Try to get decorations, but don't fail if it doesn't work
        if (decorationsResponse.ok) {
          try {
            const decorationsData = await decorationsResponse.json();
            setDecorations(decorationsData.decorations || []);
          } catch (error) {
            console.warn('Failed to parse decorations data:', error);
          }
        }
      } catch (error) {
        console.error('Failed to fetch home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [isClient, user?.primaryHandle]);

  if (loading) {
    return (
      <div className="bg-gradient-to-b from-blue-200 to-green-200 rounded-lg p-4 sm:p-8 text-center min-h-[250px] sm:min-h-[300px] flex items-center justify-center">
        <div className="space-y-3">
          <div className="animate-spin text-2xl">🏠</div>
          <div className="text-gray-600 text-sm sm:text-base">Building your pixel home...</div>
          <div className="text-xs text-gray-500">This might take a moment</div>
        </div>
      </div>
    );
  }

  if (!homeConfig) {
    return (
      <div className="bg-gradient-to-b from-blue-200 to-green-200 rounded-lg p-4 sm:p-8 text-center min-h-[250px] sm:min-h-[300px] flex items-center justify-center">
        <div className="space-y-3 sm:space-y-4">
          <div className="text-4xl sm:text-6xl">🏗️</div>
          <div>
            <p className="text-gray-700 text-sm sm:text-base font-medium mb-2">Your home isn&apos;t ready yet</p>
            <p className="text-gray-600 text-xs sm:text-sm mb-3">Don&apos;t worry, let&apos;s get you set up!</p>
            <Link
              href={`/home/${user?.primaryHandle?.split('@')[0] || 'setup'}`}
              className="inline-block px-3 py-2 bg-yellow-200 hover:bg-yellow-100 border border-black shadow-[2px_2px_0_#000] text-xs sm:text-sm font-medium transition-colors"
            >
              🎨 Customize Your Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Sanitize atmosphere data
  const atmosphere: AtmosphereSettings = {
    sky: (homeConfig.atmosphere && ['sunny', 'cloudy', 'sunset', 'night'].includes(homeConfig.atmosphere.sky as any))
      ? (homeConfig.atmosphere.sky as AtmosphereSettings['sky'])
      : 'sunny',
    weather: (homeConfig.atmosphere && ['clear', 'light_rain', 'light_snow'].includes(homeConfig.atmosphere.weather as any))
      ? (homeConfig.atmosphere.weather as AtmosphereSettings['weather'])
      : 'clear',
    timeOfDay: (homeConfig.atmosphere && ['morning', 'midday', 'evening', 'night'].includes(homeConfig.atmosphere.timeOfDay as any))
      ? (homeConfig.atmosphere.timeOfDay as AtmosphereSettings['timeOfDay'])
      : 'midday'
  };

  return (
    <div className="bg-gradient-to-b from-blue-200 to-green-200 rounded-lg p-2 sm:p-4 min-h-[250px] sm:min-h-[300px] flex items-center justify-center">
      <div className="w-full max-w-md flex justify-center">
        <div
          className="transform scale-90 sm:scale-75 origin-center cursor-pointer hover:scale-95 sm:hover:scale-80 transition-transform duration-200"
          onClick={() => window.location.href = `/resident/${user.primaryHandle?.split('@')[0]}`}
        >
          <EnhancedHouseCanvas
            template={homeConfig.houseTemplate as HouseTemplate}
            palette={homeConfig.palette as ColorPalette}
            houseCustomizations={sanitizeCustomizations(homeConfig.houseCustomizations)}
            atmosphere={atmosphere}
            decorations={decorations}
          />
        </div>
      </div>
    </div>
  );
}

function LandingPage({ siteConfig }: { siteConfig: SiteConfig }) {
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
        <link rel="canonical" href={process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'} />
        <meta name="robots" content="index, follow" />

        {/* OpenGraph meta tags */}
        <meta property="og:title" content={homepageMetadata.title} />
        <meta property="og:description" content={homepageMetadata.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'} />
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

function PersonalizedHomepage({ siteConfig, user, customLandingPageSlug }: { siteConfig: SiteConfig; user?: any; customLandingPageSlug?: string }) {
  const router = useRouter();

  // Generate metadata for personalized homepage
  const homepageMetadata = contentMetadataGenerator.generateHomepageMetadata(siteConfig);

  // Search state for enhanced search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTab, setSearchTab] = useState<'all' | 'indie' | 'site' | 'web'>('all');
  const [searchType, setSearchType] = useState<'all' | 'threadrings' | 'users' | 'posts'>('all');
  const [indieOnly, setIndieOnly] = useState(false);
  const [privacyOnly, setPrivacyOnly] = useState(false);
  const [noTrackers, setNoTrackers] = useState(false);
  const [includeUnvalidated, setIncludeUnvalidated] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Navigate to discover-enhanced with search params
    const params = new URLSearchParams({
      q: searchQuery,
      tab: searchTab,
      type: searchType,
      ...(indieOnly && { indie: 'true' }),
      ...(privacyOnly && { privacy: 'true' }),
      ...(noTrackers && { noTrackers: 'true' }),
      ...(includeUnvalidated && { includeUnvalidated: 'true' })
    });

    router.push(`/discover?${params.toString()}`);
  };

  // Load ALL available widgets for that classic early internet portal feel
  const { widgets } = useWidgets({
    user
  });

  // Distribute widgets as evenly as possible across three columns
  const totalWidgets = widgets.length;
  const basePerColumn = Math.floor(totalWidgets / 3);
  const remainder = totalWidgets % 3;

  // Calculate exact number of widgets per column for maximum even distribution
  const leftCount = basePerColumn + (remainder > 0 ? 1 : 0);
  const centerCount = basePerColumn + (remainder > 1 ? 1 : 0);
  const rightCount = basePerColumn;

  const leftWidgets = widgets.slice(0, leftCount);
  const centerWidgets = widgets.slice(leftCount, leftCount + centerCount);
  const rightWidgets = widgets.slice(leftCount + centerCount);

  return (
    <>
      <Head>
        <title>{homepageMetadata.title}</title>
        <meta name="description" content={homepageMetadata.description} />
        {homepageMetadata.keywords && (
          <meta name="keywords" content={homepageMetadata.keywords.join(', ')} />
        )}
        <link rel="canonical" href={process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'} />
        <meta name="robots" content="index, follow" />

        {/* OpenGraph meta tags */}
        <meta property="og:title" content={homepageMetadata.title} />
        <meta property="og:description" content={homepageMetadata.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'} />
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

      <Layout siteConfig={siteConfig} fullWidth={true}>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Hero Statement */}
        {!user && (
          <div className="mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-yellow-100 via-orange-50 to-pink-100 border-2 border-black rounded-lg shadow-[4px_4px_0_#000] p-6 sm:p-8 text-center">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#2E4B3F] mb-3 px-2">
                The internet doesn&apos;t have to suck
              </h1>
              <p className="text-sm sm:text-base text-gray-800 max-w-3xl mx-auto px-4 font-medium">
                Build your pixel home, join communities you care about, and connect with real people. No algorithms deciding what you see. <strong>Your page, your way.</strong>
              </p>
            </div>
          </div>
        )}

        <div className="text-center mb-6 sm:mb-8">
          {/* Quick Action Buttons - PROMINENT AND CLEAR */}
          <div className="flex flex-wrap justify-center gap-3 mb-4">
            <Link
              href="/feed"
              className="flex items-center gap-2 px-4 py-2 bg-green-200 hover:bg-green-100 border-2 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] font-medium text-sm sm:text-base transition-all transform hover:-translate-y-0.5"
            >
              <span className="text-lg">📰</span>
              <span>Browse Feed</span>
            </Link>

            {user?.primaryHandle && (
              <Link
                href={`/resident/${user.primaryHandle.split('@')[0]}`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-200 hover:bg-blue-100 border-2 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] font-medium text-sm sm:text-base transition-all transform hover:-translate-y-0.5"
              >
                <span className="text-lg">👤</span>
                <span>My Profile</span>
              </Link>
            )}

            {user ? (
              <Link
                href="/post/new"
                className="flex items-center gap-2 px-4 py-2 bg-yellow-200 hover:bg-yellow-100 border-2 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] font-medium text-sm sm:text-base transition-all transform hover:-translate-y-0.5"
              >
                <span className="text-lg">✍️</span>
                <span>Create Post</span>
              </Link>
            ) : (
              <Link
                href={customLandingPageSlug ? `/page/${customLandingPageSlug}` : "/landing"}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-200 hover:bg-yellow-100 border-2 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] font-medium text-sm sm:text-base transition-all transform hover:-translate-y-0.5"
              >
                <span className="text-lg">📖</span>
                <span>Request Beta Access</span>
              </Link>
            )}

            <Link
              href="/neighborhood/explore/all"
              className="flex items-center gap-2 px-4 py-2 bg-purple-200 hover:bg-purple-100 border-2 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] font-medium text-sm sm:text-base transition-all transform hover:-translate-y-0.5"
            >
              <span className="text-lg">🏘️</span>
              <span>Explore Homes</span>
            </Link>

            <Link
              href="/help/faq"
              className="flex items-center gap-2 px-4 py-2 bg-orange-200 hover:bg-orange-100 border-2 border-black shadow-[3px_3px_0_#000] hover:shadow-[4px_4px_0_#000] font-medium text-sm sm:text-base transition-all transform hover:-translate-y-0.5"
            >
              <span className="text-lg">❓</span>
              <span>FAQ</span>
            </Link>
          </div>
        </div>

        {/* Enhanced Global Search Bar */}
        {!user && (
          <div className="text-center mb-3">
            <p className="text-xs sm:text-sm text-gray-600">
              🔍 Search the indie web, not the corporate web. Filter by privacy, no trackers, and human-made sites.
            </p>
          </div>
        )}
        <DiscoverPageSearch
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchTab={searchTab}
          setSearchTab={setSearchTab}
          searchType={searchType}
          setSearchType={setSearchType}
          indieOnly={indieOnly}
          setIndieOnly={setIndieOnly}
          privacyOnly={privacyOnly}
          setPrivacyOnly={setPrivacyOnly}
          noTrackers={noTrackers}
          setNoTrackers={setNoTrackers}
          includeUnvalidated={includeUnvalidated}
          setIncludeUnvalidated={setIncludeUnvalidated}
          onSearch={handleSearch}
          loading={searchLoading}
          extSearchEnabled={true}
          showCommunityHelper={false}
          className="mb-6 sm:mb-8"
        />

        {/* Main Grid Layout - Mobile-First Responsive */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">

          {/* Center - Pixel Home (First on mobile for prominence) */}
          <div className="lg:col-span-6 lg:order-2">
            <SimpleCard title={user ? "Your Pixel Home" : "Demo Pixel Home"}>
              {user ? (
                <>
                  <UserPixelHome user={user} />
                  <div className="text-center mt-3 text-xs text-gray-500">
                    <span>💡 Click your home to visit your profile page</span>
                  </div>
                </>
              ) : (
                <VisitorPixelHome />
              )}
            </SimpleCard>

            {/* Additional center widgets for that portal feel */}
            {centerWidgets.length > 0 && (
              <WidgetContainer
                widgets={centerWidgets}
                user={user}
                layout="stack"
                maxColumns={1}
              />
            )}
          </div>

          {/* Left Sidebar - Widgets (Second on mobile) */}
          <div className="lg:col-span-3 lg:order-1 space-y-4">
            <WidgetContainer
              widgets={leftWidgets}
              user={user}
              layout="stack"
              maxColumns={1}
            />
          </div>

          {/* Right Sidebar - Widgets (Third on mobile) */}
          <div className="lg:col-span-3 lg:order-3 space-y-4">
            <WidgetContainer
              widgets={rightWidgets}
              user={user}
              layout="stack"
              maxColumns={1}
            />
          </div>
        </div>
      </div>
    </Layout>
    </>
  );
}

function UnifiedHomepage({ siteConfig }: { siteConfig: SiteConfig }) {
  // Generate metadata for unified homepage
  const homepageMetadata = contentMetadataGenerator.generateHomepageMetadata(siteConfig);

  return (
    <>
      <Head>
        <title>{homepageMetadata.title}</title>
        <meta name="description" content={homepageMetadata.description} />
        {homepageMetadata.keywords && (
          <meta name="keywords" content={homepageMetadata.keywords.join(', ')} />
        )}
        <link rel="canonical" href={process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'} />
        <meta name="robots" content="index, follow" />

        {/* OpenGraph meta tags */}
        <meta property="og:title" content={homepageMetadata.title} />
        <meta property="og:description" content={homepageMetadata.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'} />
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
            <h1 className="text-xl sm:text-2xl font-bold mb-4 px-2">{siteConfig.welcome_message}</h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-700 mb-4 px-2">
              <strong>ThreadRings are themed communities you can join — like modern WebRings or clubhouses — where posts live in your profile but also appear in shared Ring feeds.</strong>
            </p>
            <p className="text-sm sm:text-base text-gray-600 mb-6 px-2">{siteConfig.site_description}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 px-2">
              <Link
                href="/getting-started"
                className="border border-black px-4 sm:px-6 py-2 sm:py-3 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] inline-block text-base sm:text-lg font-medium transition-colors"
              >
                Learn More
              </Link>
              <Link
                href="/feed"
                className="border border-black px-4 sm:px-6 py-2 sm:py-3 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] inline-block text-base sm:text-lg font-medium transition-colors"
              >
                Enter Community
              </Link>
            </div>
          </div>
        </SimpleCard>

        <SimpleCard title="What are ThreadRings?">
          <div className="space-y-4">
            <p className="text-sm sm:text-base text-gray-700 px-1">
              ThreadRings bring back the spirit of the early web&apos;s WebRings — interconnected communities organized around shared interests.
              Each Ring is a themed community where members can share posts, have discussions, and build connections.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="border border-gray-300 p-3 bg-blue-50 rounded">
                <h3 className="font-bold mb-1 text-sm sm:text-base">🏠 Your Content Lives with You</h3>
                <p className="text-xs sm:text-sm text-gray-600">Posts belong to your profile but also appear in Ring feeds you&apos;ve joined</p>
              </div>
              <div className="border border-gray-300 p-3 bg-green-50 rounded">
                <h3 className="font-bold mb-1 text-sm sm:text-base">🌳 Rich Family Trees</h3>
                <p className="text-xs sm:text-sm text-gray-600">Rings can branch into new communities while maintaining their connections</p>
              </div>
              <div className="border border-gray-300 p-3 bg-purple-50 rounded sm:col-span-2 md:col-span-1">
                <h3 className="font-bold mb-1 text-sm sm:text-base">✨ Community-Focused</h3>
                <p className="text-xs sm:text-sm text-gray-600">Each Ring has its own culture, rules, and personality shaped by members</p>
              </div>
            </div>
            <div className="text-center pt-4">
              <Link
                href="/threadrings"
                className="border border-black px-4 py-2 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] inline-block font-medium text-sm sm:text-base transition-colors"
              >
                Browse ThreadRings
              </Link>
            </div>
          </div>
        </SimpleCard>
      </div>
    </Layout>
    </>
  );
}

export default function Home({ siteConfig, pageType, user, customPage, customLandingPageSlug }: HomeProps) {
  // Route to appropriate component based on pageType
  switch (pageType) {
    case 'custom':
      return (
        <CustomPageLayout siteConfig={siteConfig} hideNavbar={customPage!.hideNavbar}>
          <div
            className="custom-page-content flex-1"
            dangerouslySetInnerHTML={{ __html: customPage!.content }}
          />
        </CustomPageLayout>
      );
    case 'landing':
      return <LandingPage siteConfig={siteConfig} />;
    case 'homepage':
      return <PersonalizedHomepage siteConfig={siteConfig} user={user} customLandingPageSlug={customLandingPageSlug} />;
    case 'unified':
    default:
      return <UnifiedHomepage siteConfig={siteConfig} />;
  }
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async (context) => {
  const siteConfig = await getSiteConfig();
  const user = await getSessionUser(context.req as any);

  try {
    if (user) {
      // === LOGGED-IN USER LOGIC ===

      // 1. Custom Homepage Override for logged-in users (highest priority)
      const customHomepage = await db.customPage.findFirst({
        where: {
          published: true,
          isHomepage: true,
        },
        select: {
          id: true,
          slug: true,
          title: true,
          content: true,
          hideNavbar: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (customHomepage) {
        return {
          props: {
            siteConfig,
            pageType: 'custom' as const,
            customPage: {
              ...customHomepage,
              createdAt: customHomepage.createdAt.toISOString(),
              updatedAt: customHomepage.updatedAt.toISOString(),
            }
          },
        };
      }

      // 2. Check if default homepage is disabled - redirect to feed if so
      if (siteConfig.disable_default_home === "true") {
        return {
          redirect: {
            destination: "/feed",
            permanent: false,
          },
        };
      }

      // 3. Default: Logged-in user gets personalized homepage
      return {
        props: {
          siteConfig,
          pageType: 'homepage' as const,
          user: {
            id: user.id,
            did: user.did,
            role: user.role,
            primaryHandle: user.primaryHandle,
          }
        },
      };
    } else {
      // === VISITOR LOGIC ===

      // 1. Check if a custom landing page exists (but don't use it to override homepage)
      const customLandingPage = await db.customPage.findFirst({
        where: {
          published: true,
          isLandingPage: true,
        },
        select: {
          slug: true,
        },
      });

      // 2. Check if default landing page is disabled - redirect to feed if so
      if (siteConfig.disable_default_landing === "true") {
        return {
          redirect: {
            destination: "/feed",
            permanent: false,
          },
        };
      }

      // 3. Default: Visitors get unified homepage experience (PersonalizedHomepage without user)
      return {
        props: {
          siteConfig,
          pageType: 'homepage' as const,
          customLandingPageSlug: customLandingPage?.slug,
          // user is undefined, which will trigger visitor mode in PersonalizedHomepage
        },
      };
    }
  } catch (error) {
    console.error("Error fetching homepage:", error);
    // Fallback to unified homepage
    return {
      props: {
        siteConfig,
        pageType: 'unified' as const,
      },
    };
  }
};