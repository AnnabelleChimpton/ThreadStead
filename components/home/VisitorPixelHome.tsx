import { useState, useEffect } from 'react';
import Link from 'next/link';
import EnhancedHouseCanvas from '../pixel-homes/EnhancedHouseCanvas';
import { HouseTemplate, ColorPalette, HouseCustomizations } from '../pixel-homes/HouseSVG';
import { PixelIcon } from '@/components/ui/PixelIcon';

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
  const [currentStyleIndex, setCurrentStyleIndex] = useState(0);

  // Define multiple demo configurations to cycle through
  const demoStyles = [
    {
      template: 'cottage_v1' as HouseTemplate,
      palette: 'thread_sage' as ColorPalette,
      customizations: {
        windowStyle: 'default',
        doorStyle: 'default',
        roofTrim: 'scalloped',
        houseTitle: 'Cozy Cottage',
        houseDescription: 'A warm, inviting space for gardening enthusiasts.',
        houseBoardText: '~cozy~',
      } as HouseCustomizations,
      decorations: [
        { id: 'd1', type: 'plant', zone: 'front_yard', position: { x: 80, y: 280, layer: 8 }, variant: 'red', size: 'medium' },
        { id: 'd2', type: 'feature', zone: 'front_yard', position: { x: 380, y: 290, layer: 8 }, variant: 'classic', size: 'small' },
      ],
      terrain: { '5,18': 'dirt_path', '6,18': 'dirt_path', '7,18': 'dirt_path' }
    },
    {
      template: 'modern_v1' as HouseTemplate,
      palette: 'thread_sunset' as ColorPalette,
      customizations: {
        windowStyle: 'round',
        doorStyle: 'arched',
        roofTrim: 'default',
        houseTitle: 'Modern Retreat',
        houseDescription: 'Sleek lines and sunset vibes for the digital nomad.',
        houseBoardText: '~cool~',
      } as HouseCustomizations,
      decorations: [
        { id: 'd3', type: 'plant', zone: 'front_yard', position: { x: 100, y: 280, layer: 8 }, variant: 'blue', size: 'large' },
      ],
      terrain: {}
    },
    {
      template: 'castle_v1' as HouseTemplate,
      palette: 'thread_royal' as ColorPalette,
      customizations: {
        windowStyle: 'arched',
        doorStyle: 'double',
        roofTrim: 'ornate',
        houseTitle: 'Pixel Keep',
        houseDescription: 'A fortress of solitude (and cool retro games).',
        houseBoardText: '~epic~',
      } as HouseCustomizations,
      decorations: [
        { id: 'd4', type: 'feature', zone: 'front_yard', position: { x: 240, y: 290, layer: 8 }, variant: 'stone', size: 'medium' },
      ],
      terrain: { '10,18': 'stone_path', '11,18': 'stone_path' }
    }
  ] as Array<{
    template: HouseTemplate;
    palette: ColorPalette;
    customizations: HouseCustomizations;
    decorations: any[];
    terrain?: Record<string, string>;
  }>;

  const currentStyle = demoStyles[currentStyleIndex];

  // Atmosphere settings based on day/night toggle
  const atmosphere = {
    sky: isNight ? ('night' as const) : ('sunny' as const),
    weather: 'clear' as const,
    timeOfDay: isNight ? ('night' as const) : ('midday' as const),
  };

  const cycleStyle = () => {
    setCurrentStyleIndex((prev) => (prev + 1) % demoStyles.length);
  };

  return (
    <div className="bg-gradient-to-b from-blue-200 to-green-200 rounded-lg p-4 sm:p-6 min-h-[300px] sm:min-h-[350px] relative overflow-hidden border-2 border-black shadow-[4px_4px_0_#000]">
      {/* Explainer Text */}
      <div className="text-center mb-4 pb-3 border-b border-white/30 relative z-10">
        <p className="text-sm text-gray-800 font-medium mb-1">
          Your pixel home is <strong>YOUR space</strong> on the web
        </p>
        <p className="text-xs text-gray-700">
          Like GeoCities, but modern. Decorate it, customize it, make it yours.
        </p>
      </div>

      {/* Demo House Display */}
      <div className="w-full max-w-md mx-auto flex justify-center mb-4 relative z-10">
        <div className="transform scale-90 sm:scale-75 origin-center transition-all duration-500 ease-in-out">
          <EnhancedHouseCanvas
            key={currentStyleIndex} // Force re-render on style change for animation effect
            template={currentStyle.template}
            palette={currentStyle.palette}
            decorations={currentStyle.decorations as any[]}
            houseCustomizations={currentStyle.customizations}
            atmosphere={atmosphere}
            terrain={currentStyle.terrain}
          />
        </div>
      </div>

      {/* House Description */}
      <div className="text-center mb-4 relative z-10">
        <div className="text-lg font-bold text-[#2E4B3F] mb-1 drop-shadow-sm">
          {currentStyle.customizations.houseTitle}
        </div>
        <div className="text-sm text-gray-700 max-w-md mx-auto italic">
          &quot;{currentStyle.customizations.houseDescription}&quot;
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3 mb-6 relative z-10">
        <button
          onClick={() => setIsNight(!isNight)}
          className="px-3 py-1.5 bg-white border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] hover:translate-y-[-1px] transition-all rounded text-xs font-bold flex items-center gap-2"
        >
          <span>{isNight ? '☀️ Day' : '🌙 Night'}</span>
        </button>
        <button
          onClick={cycleStyle}
          className="px-3 py-1.5 bg-[#FFD700] border-2 border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] hover:translate-y-[-1px] transition-all rounded text-xs font-bold flex items-center gap-2"
        >
          <PixelIcon name="reload" size={12} />
          <span>Randomize Style</span>
        </button>
      </div>

      {/* CTA - Create Your Own */}
      <div className="text-center relative z-10">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 border-2 border-black shadow-[4px_4px_0_#000] hover:shadow-[5px_5px_0_#000] text-sm font-black transition-all transform hover:-translate-y-0.5 rounded-full"
        >
          <PixelIcon name="home" /> Create This Home
        </Link>
        <div className="mt-2 text-xs text-gray-600 font-medium">
          (It&apos;s free and takes 30 seconds!)
        </div>
      </div>
    </div>
  );
}

