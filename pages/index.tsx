import Layout from "../components/ui/layout/Layout";
import CustomPageLayout from "../components/ui/layout/CustomPageLayout";
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
    <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-4 mb-4 w-full max-w-full overflow-hidden">
      {title && <h3 className="text-lg font-bold mb-3 text-[#2E4B3F]">{title}</h3>}
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
      <div className="bg-gradient-to-b from-blue-200 to-green-200 rounded-lg p-8 text-center min-h-[300px] flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Loading your home...</div>
      </div>
    );
  }

  if (!homeConfig) {
    return (
      <div className="bg-gradient-to-b from-blue-200 to-green-200 rounded-lg p-8 text-center min-h-[300px] flex items-center justify-center">
        <div className="space-y-4">
          <div className="text-6xl">🏠</div>
          <p className="text-gray-600">Unable to load your home</p>
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
    <div className="bg-gradient-to-b from-blue-200 to-green-200 rounded-lg p-4 min-h-[300px] flex items-center justify-center">
      <div className="w-full max-w-md flex justify-center">
        <div
          className="transform scale-75 origin-center cursor-pointer"
          onClick={() => window.open(`/home/${user.primaryHandle?.split('@')[0]}`, '_blank')}
        >
          <EnhancedHouseCanvas
            template={homeConfig.houseTemplate as HouseTemplate}
            palette={homeConfig.palette as ColorPalette}
            houseCustomizations={sanitizeCustomizations(homeConfig.houseCustomizations)}
            atmosphere={atmosphere}
            decorations={decorations}
            hasUnreadGuestbook={false}
            isPlayingMusic={false}
            isUserOnline={true}
          />
        </div>
      </div>
    </div>
  );
}

function LandingPage({ siteConfig }: { siteConfig: SiteConfig }) {
  return (
    <Layout siteConfig={siteConfig}>
      <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
        <SimpleCard title="Welcome to Threadstead">
          <div className="text-center py-4">
            <h1 className="text-xl sm:text-2xl font-bold mb-4">{siteConfig.welcome_message}</h1>
            <p className="text-base sm:text-lg text-gray-700 mb-4">
              <strong>ThreadRings are themed communities you can join — like modern WebRings or clubhouses — where posts live in your profile but also appear in shared Ring feeds.</strong>
            </p>
            <p className="text-gray-600 mb-6">{siteConfig.site_description}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/signup"
                className="border border-black px-6 py-3 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] inline-block text-lg font-medium"
              >
                Join Community
              </Link>
              <Link
                href="/login"
                className="border border-black px-6 py-3 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] inline-block text-lg font-medium"
              >
                Login
              </Link>
            </div>
          </div>
        </SimpleCard>

        <SimpleCard title="What are ThreadRings?">
          <div className="space-y-4">
            <p className="text-gray-700">
              ThreadRings bring back the spirit of the early web&apos;s WebRings — interconnected communities organized around shared interests.
              Each Ring is a themed community where members can share posts, have discussions, and build connections.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-300 p-3 bg-blue-50 rounded">
                <h3 className="font-bold mb-1">🏠 Your Content Lives with You</h3>
                <p className="text-sm text-gray-600">Posts belong to your profile but also appear in Ring feeds you&apos;ve joined</p>
              </div>
              <div className="border border-gray-300 p-3 bg-green-50 rounded">
                <h3 className="font-bold mb-1">🌳 Rich Family Trees</h3>
                <p className="text-sm text-gray-600">Rings can branch into new communities while maintaining their connections</p>
              </div>
              <div className="border border-gray-300 p-3 bg-purple-50 rounded">
                <h3 className="font-bold mb-1">✨ Community-Focused</h3>
                <p className="text-sm text-gray-600">Each Ring has its own culture, rules, and personality shaped by members</p>
              </div>
            </div>
            <div className="text-center pt-4">
              <Link
                href="/threadrings"
                className="border border-black px-4 py-2 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] inline-block font-medium"
              >
                Browse ThreadRings
              </Link>
            </div>
          </div>
        </SimpleCard>

        <SimpleCard title="Community Highlights">
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">Join our growing community of creative individuals</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-green-50 p-3 border border-gray-200 rounded">
                <div className="font-bold text-green-800">Active Members</div>
                <div className="text-gray-600">Building connections daily</div>
              </div>
              <div className="bg-purple-50 p-3 border border-gray-200 rounded">
                <div className="font-bold text-purple-800">ThreadRings</div>
                <div className="text-gray-600">Communities to explore</div>
              </div>
            </div>
          </div>
        </SimpleCard>
      </div>
    </Layout>
  );
}

function PersonalizedHomepage({ siteConfig, user }: { siteConfig: SiteConfig; user: any }) {
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Navigate to discover page with search query
    const searchParams = new URLSearchParams({ q: searchQuery });
    window.location.href = `/discover?${searchParams}`;
  };

  return (
    <Layout siteConfig={siteConfig}>
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2E4B3F] mb-2">
            Welcome home{user?.primaryHandle ? `, ${user.primaryHandle}` : ''}!
          </h1>
          <p className="text-gray-600">
            Your personalized portal to the community • News • Neighbors • Activity
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="bg-[#FCFAF7] border border-[#A18463] rounded-lg shadow-[2px_2px_0_#A18463] p-4 mb-8">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search ThreadRings, users, posts..."
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors shadow-[2px_2px_0_#2563eb]"
            >
              Search
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Find anything in your community • Discover new ThreadRings • Connect with neighbors
          </p>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Sidebar - Widgets */}
          <div className="lg:col-span-3 space-y-4">
            <WidgetContainer
              widgets={leftWidgets}
              user={user}
              layout="stack"
              maxColumns={1}
            />
          </div>

          {/* Center - Pixel Home */}
          <div className="lg:col-span-6">
            <SimpleCard title="Your Pixel Home">
              <UserPixelHome user={user} />
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

          {/* Right Sidebar - Widgets */}
          <div className="lg:col-span-3 space-y-4">
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
  );
}

function UnifiedHomepage({ siteConfig }: { siteConfig: SiteConfig }) {
  return (
    <Layout siteConfig={siteConfig}>
      <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
        <SimpleCard title="Welcome to Threadstead">
          <div className="text-center py-6">
            <h1 className="text-xl sm:text-2xl font-bold mb-4">{siteConfig.welcome_message}</h1>
            <p className="text-base sm:text-lg text-gray-700 mb-4">
              <strong>ThreadRings are themed communities you can join — like modern WebRings or clubhouses — where posts live in your profile but also appear in shared Ring feeds.</strong>
            </p>
            <p className="text-gray-600 mb-6">{siteConfig.site_description}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/getting-started"
                className="border border-black px-6 py-3 bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] inline-block text-lg font-medium"
              >
                Learn More
              </Link>
              <Link
                href="/feed"
                className="border border-black px-6 py-3 bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] inline-block text-lg font-medium"
              >
                Enter Community
              </Link>
            </div>
          </div>
        </SimpleCard>

        <SimpleCard title="What are ThreadRings?">
          <div className="space-y-4">
            <p className="text-gray-700">
              ThreadRings bring back the spirit of the early web&apos;s WebRings — interconnected communities organized around shared interests.
              Each Ring is a themed community where members can share posts, have discussions, and build connections.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-300 p-3 bg-blue-50 rounded">
                <h3 className="font-bold mb-1">🏠 Your Content Lives with You</h3>
                <p className="text-sm text-gray-600">Posts belong to your profile but also appear in Ring feeds you&apos;ve joined</p>
              </div>
              <div className="border border-gray-300 p-3 bg-green-50 rounded">
                <h3 className="font-bold mb-1">🌳 Rich Family Trees</h3>
                <p className="text-sm text-gray-600">Rings can branch into new communities while maintaining their connections</p>
              </div>
              <div className="border border-gray-300 p-3 bg-purple-50 rounded">
                <h3 className="font-bold mb-1">✨ Community-Focused</h3>
                <p className="text-sm text-gray-600">Each Ring has its own culture, rules, and personality shaped by members</p>
              </div>
            </div>
            <div className="text-center pt-4">
              <Link
                href="/threadrings"
                className="border border-black px-4 py-2 bg-blue-200 hover:bg-blue-100 shadow-[2px_2px_0_#000] inline-block font-medium"
              >
                Browse ThreadRings
              </Link>
            </div>
          </div>
        </SimpleCard>
      </div>
    </Layout>
  );
}

export default function Home({ siteConfig, pageType, user, customPage }: HomeProps) {
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
      return <PersonalizedHomepage siteConfig={siteConfig} user={user} />;
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

      // 1. Custom Landing Page Override for visitors (highest priority)
      const customLandingPage = await db.customPage.findFirst({
        where: {
          published: true,
          isLandingPage: true,
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

      if (customLandingPage) {
        return {
          props: {
            siteConfig,
            pageType: 'custom' as const,
            customPage: {
              ...customLandingPage,
              createdAt: customLandingPage.createdAt.toISOString(),
              updatedAt: customLandingPage.updatedAt.toISOString(),
            }
          },
        };
      }

      // 2. Check if default landing page is disabled - redirect to feed if so
      if (siteConfig.disable_default_landing === "true") {
        return {
          redirect: {
            destination: "/feed",
            permanent: false,
          },
        };
      }

      // 3. Default: Visitors get landing page
      return {
        props: {
          siteConfig,
          pageType: 'landing' as const,
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