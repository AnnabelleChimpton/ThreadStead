import { getSiteBaseUrl } from '@/lib/config/site-url';
import Layout from "../components/ui/layout/Layout";
import CustomPageLayout from "../components/ui/layout/CustomPageLayout";
import Head from "next/head";
import { getSiteConfig, SiteConfig } from "@/lib/config/site/dynamic";
import { GetServerSideProps } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import Link from "next/link";
import { WidgetContainer, widgetFrameClassName } from "@/components/widgets";
import { useDefaultWidgets, useWidgets } from "@/hooks/useWidgets";
import { useState, useEffect } from "react";
import EnhancedHouseCanvas from "../components/pixel-homes/EnhancedHouseCanvas";
import { HouseTemplate, ColorPalette, HouseCustomizations, AtmosphereSettings } from "../components/pixel-homes/HouseSVG";
import { DecorationItem } from "@/lib/pixel-homes/decoration-data";
import SearchBox from "@/components/features/search/SearchBox";
import { contentMetadataGenerator } from "@/lib/utils/metadata/content-metadata";
import VisitorPixelHome from "@/components/home/VisitorPixelHome";
import { getOgImageUrl } from "@/lib/utils/og-image-url";
import { PixelIcon } from '@/components/ui/PixelIcon';
import CommunityTicker from "@/components/CommunityTicker";
import HomeHero from "@/components/home/HomeHero";
import { serializeJsonLd } from "@/lib/utils/sanitization/json-ld";
import FirstStepsChecklist, { FIRST_STEPS_HIDDEN_COOKIE } from "@/components/features/onboarding/FirstStepsChecklist";
import WelcomeMusicControl from "@/components/features/onboarding/WelcomeMusicControl";
import { getFirstSteps, FirstSteps } from "@/lib/domain/users/first-steps";

interface HomeProps {
  siteConfig: SiteConfig;
  pageType: 'custom' | 'homepage' | 'unified';
  ogImageUrl: string;
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
  userCount?: number;
  // Logged-in newcomers: their first-steps list (null once the account is older)
  firstSteps?: FirstSteps | null;
  // Shown with the list when arriving from signup
  foundersNote?: string | null;
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
  terrain?: Record<string, string>;
}

// Same frame and header as the homepage widgets, so the center column matches
function SimpleCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className={`${widgetFrameClassName} mb-4 w-full max-w-full overflow-hidden`}>
      {title && (
        <div className="widget-header mb-2">
          <h3 className="widget-title font-headline text-base font-bold leading-tight text-nb-ink">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
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
    houseNumber: typeof customizations.houseNumber === 'string' ? customizations.houseNumber : undefined,
    houseNumberStyle: typeof customizations.houseNumberStyle === 'string' ? customizations.houseNumberStyle : undefined,
    welcomeMat: typeof customizations.welcomeMat === 'string' ? customizations.welcomeMat : undefined,
    welcomeMatText: typeof customizations.welcomeMatText === 'string' ? customizations.welcomeMatText : undefined,
    welcomeMatColor: typeof customizations.welcomeMatColor === 'string' ? customizations.welcomeMatColor : undefined,
    chimneyStyle: typeof customizations.chimneyStyle === 'string' ? customizations.chimneyStyle : undefined,
    exteriorLights: typeof customizations.exteriorLights === 'string' ? customizations.exteriorLights : undefined,
    windowTreatments: typeof customizations.windowTreatments === 'string' ? customizations.windowTreatments : undefined,
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

            // Update home config with terrain if available
            if (decorationsData.terrain) {
              setHomeConfig(prev => prev ? ({
                ...prev,
                terrain: decorationsData.terrain
              }) : null);
            }

            setDecorations((decorationsData.decorations || []).map((d: any) => ({
              ...d,
              type: d.type as any,
              zone: d.zone as any,
              name: d.decorationId
            })) as unknown as DecorationItem[]);
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
      <div className="p-4 sm:p-8 text-center min-h-[250px] sm:min-h-[300px] flex items-center justify-center">
        <div className="space-y-2">
          <div className="text-nb-ink text-sm sm:text-base">Building your pixel home...</div>
          <div className="thread-label">This might take a moment</div>
        </div>
      </div>
    );
  }

  if (!homeConfig) {
    return (
      <div className="p-4 sm:p-8 text-center min-h-[250px] sm:min-h-[300px] flex items-center justify-center">
        <div>
          <p className="text-nb-ink text-sm sm:text-base font-medium mb-2">Your home isn&apos;t ready yet</p>
          <p className="text-nb-ink-mid text-xs sm:text-sm mb-3">Don&apos;t worry, let&apos;s get you set up!</p>
          <Link
            href={`/home/${user?.primaryHandle?.split('@')[0] || 'setup'}`}
            className="btn btn--primary inline-block px-3 py-2 text-xs sm:text-sm no-underline bg-thread-cream text-thread-pine border-2 border-thread-sage rounded-md shadow-cozy-sm"
          >
            Customize Your Home
          </Link>
        </div>
      </div>
    );
  }

  // Sanitize atmosphere data
  const atmosphere: AtmosphereSettings = {
    sky: (homeConfig.atmosphere && ['sunny', 'cloudy', 'sunset', 'night'].includes(homeConfig.atmosphere.sky as any))
      ? (homeConfig.atmosphere.sky as AtmosphereSettings['sky'])
      : 'sunny',
    weather: (() => {
      const w = homeConfig.atmosphere?.weather as any;
      if (w === 'light_rain' || w === 'rain') return 'rain';
      if (w === 'light_snow' || w === 'snow') return 'snow';
      return 'clear';
    })(),
    timeOfDay: (homeConfig.atmosphere && ['morning', 'midday', 'evening', 'night'].includes(homeConfig.atmosphere.timeOfDay as any))
      ? (homeConfig.atmosphere.timeOfDay as AtmosphereSettings['timeOfDay'])
      : 'midday'
  };

  return (
    <div className="p-2 sm:p-4 min-h-[250px] sm:min-h-[300px] flex items-center justify-center">
      <div className="w-full max-w-md flex justify-center">
        <div
          className="transform scale-90 sm:scale-75 origin-center cursor-pointer"
          onClick={() => window.location.href = `/resident/${user.primaryHandle?.split('@')[0]}`}
        >
          <EnhancedHouseCanvas
            template={homeConfig.houseTemplate as HouseTemplate}
            palette={homeConfig.palette as ColorPalette}
            houseCustomizations={sanitizeCustomizations(homeConfig.houseCustomizations)}
            atmosphere={atmosphere}
            decorations={decorations}
            terrain={homeConfig.terrain}
          />
        </div>
      </div>
    </div>
  );
}

function PersonalizedHomepage({ siteConfig, user, customLandingPageSlug, ogImageUrl, userCount, firstSteps, foundersNote }: { siteConfig: SiteConfig; user?: any; customLandingPageSlug?: string; ogImageUrl: string; userCount?: number; firstSteps?: FirstSteps | null; foundersNote?: string | null }) {

  // Generate metadata for personalized homepage
  const homepageMetadata = contentMetadataGenerator.generateHomepageMetadata(siteConfig);

  // Load widgets in specified order
  const { widgets: allWidgets } = useDefaultWidgets(user);

  // Filter out FAQ widget for logged-in users
  const widgets = user
    ? allWidgets.filter(w => w.config.id !== 'faq-quick')
    : allWidgets;

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
        <link rel="canonical" href={getSiteBaseUrl()} />
        <meta name="robots" content="index, follow" />

        {/* OpenGraph meta tags */}
        <meta property="og:title" content={homepageMetadata.title} />
        <meta property="og:description" content={homepageMetadata.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={getSiteBaseUrl()} />
        <meta property="og:image" content={`${getSiteBaseUrl()}${ogImageUrl}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={`${siteConfig.site_name} - Your page, your way`} />
        <meta property="og:site_name" content={siteConfig.site_name} />
        <meta property="og:locale" content="en_US" />

        {/* Social media card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={homepageMetadata.title} />
        <meta name="twitter:description" content={homepageMetadata.description} />
        <meta name="twitter:image" content={`${getSiteBaseUrl()}${ogImageUrl}`} />

        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(homepageMetadata.structuredData)
          }}
        />
      </Head>

      <Layout siteConfig={siteConfig} fullWidth={true} homepageLayout={true}>
        <div className="w-full max-w-full sm:max-w-7xl mx-auto px-0 sm:px-4 py-4 sm:py-6">
          {/* Hero Statement */}
          {!user && (
            <HomeHero siteConfig={siteConfig} userCount={userCount} />
          )}

          {/* Quick links - for logged-in users. One primary action, the rest plain links. */}
          {user && (
            <nav aria-label="Quick links" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mb-6 text-sm font-semibold text-nb-ink">
              <Link
                href="/post/new"
                className="btn btn--primary inline-block px-3 py-1.5 no-underline bg-thread-cream text-thread-pine border-2 border-thread-sage rounded-md shadow-cozy-sm"
              >
                <PixelIcon name="edit" size={16} className="inline-block align-[-3px] mr-1.5" />
                <span>Create Post</span>
              </Link>
              <Link href="/feed">Browse Feed</Link>
              <span aria-hidden="true">·</span>
              {user?.primaryHandle && (
                <>
                  <Link href={`/resident/${user.primaryHandle.split('@')[0]}`}>My Profile</Link>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <Link href="/neighborhood/explore/all">Explore Homes</Link>
              <span aria-hidden="true">·</span>
              <Link href="/community">Community</Link>
              <span aria-hidden="true">·</span>
              <Link href="/help/faq">FAQ</Link>
            </nav>
          )}

          {/* Search: a plain box that goes to /search */}
          {!user && (
            <div className="text-center mb-3">
              <p className="text-xs sm:text-sm text-nb-ink">
                Search the indie web, not the corporate web
              </p>
            </div>
          )}
          <SearchBox
            size="lg"
            label="Search ThreadStead"
            className="max-w-3xl mx-auto mb-6 sm:mb-8"
          />

          {/* Community Ticker - Typewriter Style */}
          <CommunityTicker />

          {/* Main Grid Layout - Mobile-First Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">

            {/* Center - Pixel Home (First on mobile for prominence) */}
            <div className="lg:col-span-6 lg:order-2">
              {user?.primaryHandle && firstSteps && (
                <FirstStepsChecklist
                  username={user.primaryHandle.split('@')[0]}
                  steps={firstSteps}
                  foundersNote={foundersNote || undefined}
                />
              )}
              <SimpleCard title={user ? "Your Pixel Home" : "Demo Pixel Home"}>
                {user ? (
                  <>
                    <UserPixelHome user={user} />
                    <div className="text-center mt-2 text-xs text-nb-ink-mid">
                      Click your home to visit your profile page
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
        {user && <WelcomeMusicControl />}
      </Layout>
    </>
  );
}

export default function Home({ siteConfig, pageType, user, customPage, customLandingPageSlug, ogImageUrl, userCount, firstSteps, foundersNote }: HomeProps) {
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
    case 'homepage':
    case 'unified':
    default:
      // 'unified' is the error fallback from getServerSideProps: the visitor homepage
      return <PersonalizedHomepage siteConfig={siteConfig} user={user} customLandingPageSlug={customLandingPageSlug} ogImageUrl={ogImageUrl} userCount={userCount} firstSteps={firstSteps} foundersNote={foundersNote} />;
  }
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async (context) => {
  const siteConfig = await getSiteConfig();
  const user = await getSessionUser(context.req as any);
  const ogImageUrl = getOgImageUrl(); // Get dynamic og:image URL with automatic cache-busting
  const userCount = await db.user.count();

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
            ogImageUrl,
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
      const handle = user.primaryHandle?.split('@')[0];
      const listHidden = !!handle && context.req.cookies?.[FIRST_STEPS_HIDDEN_COOKIE] === handle;
      const firstSteps = listHidden ? null : await getFirstSteps(user.id).catch((err) => {
        console.error('First steps lookup failed:', err);
        return null;
      });
      // Arriving from signup: the founder's note rides along with the list
      const foundersNote = firstSteps && context.query.welcome === '1'
        ? (await db.siteConfig.findUnique({ where: { key: 'founders_note' } }).catch(() => null))?.value || null
        : null;

      return {
        props: {
          siteConfig,
          pageType: 'homepage' as const,
          ogImageUrl,
          firstSteps,
          foundersNote,
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
          ogImageUrl,
          ...(customLandingPage?.slug ? { customLandingPageSlug: customLandingPage.slug } : {}),
          // user is undefined, which will trigger visitor mode in PersonalizedHomepage
          userCount,
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
        ogImageUrl,
        userCount,
      },
    };
  }
};