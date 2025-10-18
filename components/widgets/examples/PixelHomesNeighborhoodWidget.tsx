import React, { useState } from 'react';
import Link from 'next/link';
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
  type: 'plant' | 'path' | 'feature' | 'seasonal';
  zone: 'front_yard' | 'house_facade' | 'background';
  position: { x: number; y: number; layer?: number };
  variant?: string;
  size?: 'small' | 'medium' | 'large';
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

  const handleShuffle = async () => {
    if (!onRefresh) return;

    setIsShuffling(true);
    try {
      await onRefresh();
    } finally {
      setIsShuffling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg animate-pulse mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-24 mx-auto mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-2">🏘️</div>
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
        <div className="text-4xl mb-2">🏠</div>
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
      {/* House Display */}
      <div className="relative">
        <div
          className="bg-gradient-to-b from-blue-100 to-green-100 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setShowDetails(true)}
        >
          <div className="flex justify-center">
            <div className="w-full h-32 flex items-center justify-center">
              <div className="transform scale-[0.25] origin-center">
                <EnhancedHouseCanvas
                  template={home.homeConfig.houseTemplate}
                  palette={home.homeConfig.palette}
                  houseCustomizations={home.homeConfig.houseCustomizations}
                  atmosphere={home.homeConfig.atmosphere || { sky: 'sunny', weather: 'clear', timeOfDay: 'midday' }}
                  decorations={home.homeConfig.decorations || []}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Shuffle Button */}
        <button
          onClick={handleShuffle}
          disabled={isShuffling}
          className="absolute top-2 right-2 w-8 h-8 bg-white/80 hover:bg-white/90 rounded-full flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
          title="Find another random home"
        >
          <span className={`text-sm ${isShuffling ? 'animate-spin' : ''}`}>
            🎲
          </span>
        </button>
      </div>

      {/* Home Info */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          {home.avatarUrl && (
            <img
              src={home.avatarUrl}
              alt={`${home.displayName || home.username}&apos;s avatar`}
              className="w-6 h-6 rounded-full"
            />
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">
              {home.displayName || home.username}
            </p>
            <p className="text-xs text-gray-500">@{home.username}</p>
          </div>
        </div>

        {/* Home Title */}
        {home.homeConfig.houseCustomizations?.houseTitle && (
          <p className="text-xs font-medium text-gray-700">
            &quot;{home.homeConfig.houseCustomizations.houseTitle}&quot;
          </p>
        )}

        {/* Stats */}
        <div className="flex justify-center space-x-4 text-xs text-gray-500">
          {home.stats.recentVisits > 0 && (
            <span>👥 {home.stats.recentVisits} visits</span>
          )}
          {home.stats.ringMemberships > 0 && (
            <span>🔗 {home.stats.ringMemberships} rings</span>
          )}
          {home.homeConfig.hasDecorations && (
            <span>🎨 Decorated</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-2 pt-2">
          <button
            onClick={() => setShowDetails(true)}
            className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-medium transition-colors"
          >
            View Details
          </button>
          <a
            href={`/home/${home.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-medium transition-colors"
          >
            Visit Home
          </a>
        </div>
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
              decorations: home.homeConfig.homeDecorations
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
  return decorations.map(decoration => ({
    id: decoration.id,
    decorationType: decoration.type,
    decorationId: decoration.id, // Use same ID for decorationId
    variant: decoration.variant,
    size: decoration.size,
    x: decoration.position.x,
    y: decoration.position.y,
    layer: decoration.position.layer || 10
  }));
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
      let decorations: DecorationItem[] = [];
      if (decorationsResponse.ok) {
        try {
          const decorationsData = await decorationsResponse.json();
          decorations = decorationsData.decorations || [];
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
            homeDecorations: transformDecorations(decorations)
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