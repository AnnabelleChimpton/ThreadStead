import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { WidgetProps, WidgetConfig } from '../types/widget';
import { HouseTemplate, ColorPalette, HouseCustomizations } from '../../pixel-homes/HouseSVG';
import EnhancedHouseCanvas from '../../pixel-homes/EnhancedHouseCanvas';
import HouseDetailsPopup from '../../pixel-homes/HouseDetailsPopup';

const pixelHomesNeighborhoodConfig: WidgetConfig = {
  id: 'pixel-homes-neighborhood',
  title: 'Random Neighbors',
  description: 'Discover random pixel homes in your community',
  category: 'community',
  size: 'medium',
  requiresAuth: false,
  defaultEnabled: true,
  refreshInterval: 0 // Manual refresh only via the shuffle button
};

interface DecorationItem {
  id: string;
  decorationId: string;
  type: 'plant' | 'path' | 'feature' | 'seasonal';
  zone: 'front_yard' | 'house_facade' | 'background';
  position: { x: number; y: number; layer?: number };
  variant?: string;
  size?: 'small' | 'medium' | 'large';
  renderSvg?: string | null;
  name: string;
  data?: any; // Custom data for decorations (e.g. sign text)
  pngUrl?: string; // URL for PNG asset
}

interface HomeDecoration {
  id: string;
  decorationType: 'plant' | 'path' | 'feature' | 'seasonal';
  decorationId: string;
  variant?: string;
  size?: 'small' | 'medium' | 'large';
  x: number;
  y: number;
  layer: number;
  renderSvg?: string | null;
  data?: any; // Custom data for decorations (e.g. sign text)
}

interface AtmosphereSettings {
  sky: 'sunny' | 'cloudy' | 'sunset' | 'night';
  weather: 'clear' | 'light_rain' | 'light_snow';
  timeOfDay: 'morning' | 'midday' | 'evening' | 'night';
}

interface PixelHome {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  homeConfig: {
    houseTemplate: HouseTemplate;
    palette: ColorPalette;
    seasonalOptIn: boolean;
    houseCustomizations?: HouseCustomizations;
    atmosphere?: AtmosphereSettings;
    hasDecorations?: boolean;
    decorationCount?: number;
    decorations?: DecorationItem[];
    homeDecorations?: HomeDecoration[];
    terrain?: Record<string, string>;
  };
  stats: {
    recentVisits: number;
    ringMemberships: number;
    isActive: boolean;
  };
}

interface PixelHomesData {
  home: PixelHome;
}

function PixelHomesNeighborhoodWidget({
  data,
  isLoading,
  error,
  onRefresh
}: WidgetProps & { data?: PixelHomesData }) {
  const [showDetails, setShowDetails] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('afternoon');

  // Determine time of day for parallax background
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) setTimeOfDay('morning');
    else if (hour >= 12 && hour < 17) setTimeOfDay('afternoon');
    else if (hour >= 17 && hour < 20) setTimeOfDay('evening');
    else setTimeOfDay('night');
  }, []);

  const handleShuffle = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Prevent opening details when clicking shuffle
    if (!onRefresh) return;

    setIsShuffling(true);
    try {
      await onRefresh();
    } finally {
      setIsShuffling(false);
    }
  };

  // Sky gradient based on time of day
  const skyGradients = {
    morning: 'from-blue-200 via-blue-100 to-yellow-50',
    afternoon: 'from-blue-400 via-blue-200 to-blue-100',
    evening: 'from-purple-400 via-pink-300 to-orange-200',
    night: 'from-indigo-900 via-blue-900 to-blue-800',
  };

  // Celestial body (sun/moon)
  const CelestialBody = () => {
    const isNight = timeOfDay === 'night' || timeOfDay === 'evening';
    return (
      <div className="absolute top-8 right-8 text-4xl transform scale-75 sm:scale-100">
        {isNight ? <PixelIcon name="moon" size={32} className="text-yellow-200" /> : <PixelIcon name="sun" size={32} className="text-yellow-400" />}
      </div>
    );
  };

  if (isLoading && !data) {
    return (
      <div className="text-center py-8">
        <div className="w-full h-48 mx-auto bg-gray-200 rounded-lg animate-pulse mb-4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-2"><PixelIcon name="home" size={32} /></div>
        <p className="text-sm mb-3">Unable to load neighborhood</p>
        {onRefresh && (
          <button
            onClick={handleShuffle}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (!data || !data.home) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-2"><PixelIcon name="home" size={32} /></div>
        <p className="text-sm mb-3">No homes to explore</p>
        <div className="mt-2">
          <Link
            href="/explore/homes"
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            Browse all homes →
          </Link>
        </div>
      </div>
    );
  }

  const { home } = data;

  return (
    <div className="space-y-4">
      {/* Card View Container */}
      <div
        className="relative w-full h-[300px] sm:h-[350px] rounded-lg overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-all border border-gray-200"
        onClick={() => setShowDetails(true)}
      >
        {/* Sky Background */}
        <div className={`absolute top-0 left-0 right-0 h-[60%] bg-gradient-to-b ${skyGradients[timeOfDay]} z-0`}>
          <CelestialBody />
          <div className="absolute top-12 left-8 opacity-60"><PixelIcon name="cloud" size={24} className="text-white" /></div>
          <div className="absolute top-20 right-20 opacity-50"><PixelIcon name="cloud" size={20} className="text-white" /></div>
        </div>

        {/* Ground Layer */}
        <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-b from-green-600 via-green-500 to-green-700 z-10">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)]"></div>
          </div>
        </div>

        {/* House Container */}
        <div className="absolute inset-0 z-20 flex items-end justify-center pb-20 pointer-events-none">
          <div className="transform scale-75 sm:scale-90 origin-bottom">
            <EnhancedHouseCanvas
              template={home.homeConfig.houseTemplate}
              palette={home.homeConfig.palette}
              houseCustomizations={home.homeConfig.houseCustomizations}
              atmosphere={(home.homeConfig.atmosphere || { sky: 'sunny', weather: 'clear', timeOfDay: 'midday' }) as any}
              decorations={home.homeConfig.decorations || []}
              terrain={home.homeConfig.terrain}
            />
          </div>
        </div>

        {/* User Info Overlay - Bottom Gradient */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 pt-12 z-30 text-white">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {home.avatarUrl && (
                  <img
                    src={home.avatarUrl}
                    alt={home.username}
                    className="w-6 h-6 rounded-full border border-white/50"
                  />
                )}
                <span className="font-bold text-lg shadow-black/50 drop-shadow-md">{home.displayName || home.username}</span>
              </div>

              {home.homeConfig.houseCustomizations?.houseTitle && (
                <div className="text-sm text-green-200 font-medium mb-2 drop-shadow-md">
                  &quot;{home.homeConfig.houseCustomizations.houseTitle}&quot;
                </div>
              )}

              <div className="flex gap-3 text-xs text-white/80">
                {home.stats.recentVisits > 0 && (
                  <span className="flex items-center gap-1"><PixelIcon name="users" size={12} /> {home.stats.recentVisits} visits</span>
                )}
                {home.homeConfig.hasDecorations && (
                  <span className="flex items-center gap-1"><PixelIcon name="paint-bucket" size={12} /> Decorated</span>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-xs font-bold border border-white/40 transition-colors">
                View
              </span>
            </div>
          </div>
        </div>

        {/* Shuffle Button - Top Right */}
        <button
          onClick={handleShuffle}
          disabled={isShuffling}
          className="absolute top-3 right-3 z-40 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-transparent hover:border-yellow-400 text-gray-700 transition-all transform hover:scale-105"
          title="Find another random home"
        >
          <span className={`${isShuffling ? 'animate-spin' : ''}`}>
            <PixelIcon name="zap" size={16} />
          </span>
        </button>
      </div>

      {/* House Details Popup */}
      {showDetails && (
        <HouseDetailsPopup
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          member={{
            userId: home.userId,
            username: home.username,
            displayName: home.displayName,
            avatarUrl: home.avatarUrl,
            homeConfig: {
              ...home.homeConfig,
              decorations: home.homeConfig.decorations?.map(dec => ({
                id: dec.id,
                decorationType: dec.type,
                decorationId: dec.decorationId,
                variant: dec.variant,
                size: dec.size,
                x: dec.position.x,
                y: dec.position.y,
                layer: dec.position.layer || 10,
                data: dec.data,
                renderSvg: dec.renderSvg
              })),
              terrain: home.homeConfig.terrain
            },
            stats: home.stats,
            connections: {
              mutualRings: 0,
              mutualFriends: 0,
              isFollowing: false,
              isFollower: false
            }
          }}
        />
      )}
    </div>
  );
}

// Helper function to transform DecorationItem to HomeDecoration
const transformDecorations = (decorations: DecorationItem[]): HomeDecoration[] => {
  return decorations.map(decoration => {

    const result = {
      id: decoration.id,
      decorationType: decoration.type,
      decorationId: decoration.decorationId, // Use base decorationId for matching hardcoded SVGs
      variant: decoration.variant,
      size: decoration.size,
      x: decoration.position.x,
      y: decoration.position.y,
      layer: decoration.position.layer || 10,
      renderSvg: decoration.renderSvg,
      pngUrl: decoration.pngUrl || undefined
    };

    return result;
  });
};

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

export const pixelHomesNeighborhoodWidget = {
  config: pixelHomesNeighborhoodConfig,
  component: PixelHomesNeighborhoodWidget as React.ComponentType<WidgetProps & { data?: any }>,
  fetchData: async () => {
    try {
      // Get a random user with home configuration
      const response = await fetch('/api/directory?limit=100&sortBy=recent');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      const users = data.users || [];

      if (users.length === 0) {
        throw new Error('No users found');
      }

      // Pick a random user
      const randomUser = users[Math.floor(Math.random() * users.length)];

      // Fetch both home config and decorations in parallel
      const [homeResponse, decorationsResponse] = await Promise.all([
        fetch(`/api/home/${randomUser.username}`),
        fetch(`/api/home/decorations/load?username=${randomUser.username}`)
      ]);

      if (!homeResponse.ok) {
        // If home config fails, create a basic one
        return {
          home: {
            userId: randomUser.id,
            username: randomUser.username,
            displayName: randomUser.displayName,
            avatarUrl: randomUser.avatarUrl,
            homeConfig: {
              houseTemplate: 'cottage_v1' as HouseTemplate,
              palette: 'thread_sage' as ColorPalette,
              seasonalOptIn: false,
              hasDecorations: false,
              decorations: [],
              homeDecorations: []
            },
            stats: {
              recentVisits: randomUser.followerCount || 0,
              ringMemberships: 0,
              isActive: true
            }
          }
        };
      }

      const homeData = await homeResponse.json();

      // Try to get decorations, but don't fail if it doesn't work
      // Try to get decorations and terrain
      let decorations: DecorationItem[] = [];
      let terrain: Record<string, string> = {};

      if (decorationsResponse.ok) {
        try {
          const decorationsData = await decorationsResponse.json();
          decorations = (decorationsData.decorations || []).map((d: any) => ({
            ...d,
            name: d.decorationId,
            pngUrl: d.pngUrl || undefined
          }));
          if (decorationsData.terrain) {
            terrain = decorationsData.terrain;
          }
        } catch (error) {
          console.warn('Failed to parse decorations data:', error);
        }
      }

      // Sanitize atmosphere data
      const atmosphere: AtmosphereSettings = {
        sky: (['sunny', 'cloudy', 'sunset', 'night'].includes(homeData.homeConfig?.atmosphere?.sky))
          ? homeData.homeConfig.atmosphere.sky
          : 'sunny',
        weather: (['clear', 'light_rain', 'light_snow'].includes(homeData.homeConfig?.atmosphere?.weather))
          ? homeData.homeConfig.atmosphere.weather
          : 'clear',
        timeOfDay: (['morning', 'midday', 'evening', 'night'].includes(homeData.homeConfig?.atmosphere?.timeOfDay))
          ? homeData.homeConfig.atmosphere.timeOfDay
          : 'midday'
      };

      return {
        home: {
          userId: randomUser.id,
          username: randomUser.username,
          displayName: randomUser.displayName,
          avatarUrl: randomUser.avatarUrl,
          homeConfig: {
            ...homeData.homeConfig,
            houseCustomizations: sanitizeCustomizations(homeData.homeConfig?.houseCustomizations),
            atmosphere,
            hasDecorations: decorations.length > 0,
            decorationCount: decorations.length,
            decorations,
            homeDecorations: transformDecorations(decorations),
            terrain
          },
          stats: {
            recentVisits: randomUser.followerCount || 0,
            ringMemberships: 0, // We don't have this data from directory API
            isActive: true
          }
        }
      };
    } catch (error) {
      console.error('Error fetching random home:', error);
      throw error;
    }
  }
};
