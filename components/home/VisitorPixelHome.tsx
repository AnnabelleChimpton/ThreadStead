import { useState } from 'react';
import Link from 'next/link';
import EnhancedHouseCanvas from '../pixel-homes/EnhancedHouseCanvas';
import { HouseTemplate, ColorPalette, HouseCustomizations } from '../pixel-homes/HouseSVG';

/**
 * VisitorPixelHome - Shows demo pixel home to visitors on unified homepage
 *
 * Features:
 * - Demo cottage with sample decorations
 * - Day/night atmosphere toggle
 * - CTA to create their own home
 * - Based on /home/demo.tsx demo configuration
 */
export default function VisitorPixelHome() {
  // Day/night toggle state
  const [isNight, setIsNight] = useState(false);

  // Hard-coded demo configuration from /home/demo.tsx
  const demoConfig: {
    template: HouseTemplate;
    palette: ColorPalette;
    customizations: HouseCustomizations;
  } = {
    template: 'cottage_v1',
    palette: 'thread_sage',
    customizations: {
      windowStyle: 'default',
      doorStyle: 'default',
      roofTrim: 'scalloped',
      houseTitle: 'Demo Pixel Home',
      houseDescription: 'Welcome to a sample pixel home! Explore, customize, and build your own.',
      houseBoardText: '~demo~',
    },
  };

  // Hard-coded sample decorations
  const demoDecorations = [
    {
      id: 'roses_red_1',
      type: 'plant' as const,
      zone: 'front_yard' as const,
      position: { x: 80, y: 280, layer: 8 },
      variant: 'red',
      size: 'medium' as const,
    },
    {
      id: 'garden_gnome_1',
      type: 'feature' as const,
      zone: 'front_yard' as const,
      position: { x: 380, y: 290, layer: 8 },
      variant: 'classic',
      size: 'small' as const,
    },
  ];

  // Atmosphere settings based on day/night toggle
  const atmosphere = {
    sky: isNight ? ('night' as const) : ('sunny' as const),
    weather: 'clear' as const,
    timeOfDay: isNight ? ('night' as const) : ('midday' as const),
  };

  return (
    <div className="bg-gradient-to-b from-blue-200 to-green-200 rounded-lg p-4 sm:p-6 min-h-[300px] sm:min-h-[350px]">
      {/* Explainer Text */}
      <div className="text-center mb-4 pb-3 border-b border-white/30">
        <p className="text-sm text-gray-800 font-medium mb-1">
          Your pixel home is <strong>YOUR space</strong> on the web
        </p>
        <p className="text-xs text-gray-700">
          Like GeoCities, but modern. Decorate it, customize it, make it yours.
        </p>
        <p className="text-xs text-gray-800 font-semibold italic mt-1">
          Your page, your way.
        </p>
      </div>

      {/* Demo House Display */}
      <div className="w-full max-w-md mx-auto flex justify-center mb-4">
        <div className="transform scale-90 sm:scale-75 origin-center">
          <EnhancedHouseCanvas
            template={demoConfig.template}
            palette={demoConfig.palette}
            decorations={demoDecorations}
            houseCustomizations={demoConfig.customizations}
            atmosphere={atmosphere}
          />
        </div>
      </div>

      {/* House Description */}
      <div className="text-center mb-4">
        <div className="text-lg font-semibold text-[#2E4B3F] mb-1">
          {demoConfig.customizations.houseTitle}
        </div>
        <div className="text-sm text-gray-700 max-w-md mx-auto">
          {demoConfig.customizations.houseDescription}
        </div>
      </div>

      {/* Day/Night Toggle */}
      <div className="flex justify-center mb-4">
        <div className="bg-white border-2 border-gray-300 rounded-lg p-3 shadow-sm">
          <div className="text-xs font-medium text-gray-600 mb-2 text-center">
            Try atmosphere toggle:
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsNight(false)}
              className={`px-4 py-2 rounded text-sm font-medium transition-all duration-300 flex items-center gap-1 ${
                !isNight
                  ? 'bg-[#8AAE92] text-white shadow-md transform -translate-y-0.5'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              <span>☀️</span>
              Day
            </button>
            <button
              onClick={() => setIsNight(true)}
              className={`px-4 py-2 rounded text-sm font-medium transition-all duration-300 flex items-center gap-1 ${
                isNight
                  ? 'bg-[#2E4B3F] text-white shadow-md transform -translate-y-0.5'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              <span>🌙</span>
              Night
            </button>
          </div>
        </div>
      </div>

      {/* CTA - Create Your Own */}
      <div className="text-center">
        <Link
          href="/signup"
          className="inline-block px-6 py-3 bg-yellow-200 hover:bg-yellow-100 border border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] text-sm font-bold transition-all transform hover:-translate-y-0.5"
        >
          🏠 Create Your Own Home
        </Link>
        <div className="mt-2 text-xs text-gray-600">
          Join to customize your pixel home with your own style!
        </div>
      </div>
    </div>
  );
}
