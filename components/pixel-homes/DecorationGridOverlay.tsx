import React from 'react'
import { generateGridLines, DecorationGridConfig, DEFAULT_DECORATION_GRID } from '@/lib/pixel-homes/decoration-grid-utils'

interface DecorationGridOverlayProps {
  config?: DecorationGridConfig;
  visible?: boolean;
  className?: string;
  opacity?: number;
  color?: string;
  majorLineInterval?: number; // Every Nth line is emphasized
}

export default function DecorationGridOverlay({
  config = DEFAULT_DECORATION_GRID,
  visible = true,
  className = '',
  opacity = 0.3,
  color = '#6B7280',
  majorLineInterval = 5
}: DecorationGridOverlayProps) {
  if (!visible || !config.showGrid) {
    return null;
  }

  const { verticalLines, horizontalLines } = generateGridLines(config);

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 1 }}
    >
      <svg
        width={config.canvasWidth}
        height={config.canvasHeight}
        className="w-full h-full"
        style={{ opacity }}
      >
        <defs>
          {/* Pattern for fine grid lines */}
          <pattern id="decorationGrid" width={config.cellSize} height={config.cellSize} patternUnits="userSpaceOnUse">
            <path
              d={`M ${config.cellSize} 0 L 0 0 0 ${config.cellSize}`}
              fill="none"
              stroke={color}
              strokeWidth="0.5"
              opacity="0.4"
            />
          </pattern>

          {/* Pattern for major grid lines */}
          <pattern
            id="decorationGridMajor"
            width={config.cellSize * majorLineInterval}
            height={config.cellSize * majorLineInterval}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${config.cellSize * majorLineInterval} 0 L 0 0 0 ${config.cellSize * majorLineInterval}`}
              fill="none"
              stroke={color}
              strokeWidth="1"
              opacity="0.7"
            />
          </pattern>
        </defs>

        {/* Fine grid background */}
        <rect
          width={config.canvasWidth}
          height={config.canvasHeight}
          fill="url(#decorationGrid)"
        />

        {/* Major grid lines */}
        <rect
          width={config.canvasWidth}
          height={config.canvasHeight}
          fill="url(#decorationGridMajor)"
        />

        {/* Grid cell indicators at intersections */}
        {majorLineInterval > 1 && verticalLines
          .filter((_, index) => index % majorLineInterval === 0)
          .map(vLine =>
            horizontalLines
              .filter((_, index) => index % majorLineInterval === 0)
              .map(hLine => (
                <circle
                  key={`intersection-${vLine.x}-${hLine.y}`}
                  cx={vLine.x}
                  cy={hLine.y}
                  r="1.5"
                  fill={color}
                  opacity="0.6"
                />
              ))
          )
        }

        {/* Grid dimension labels (corner) */}
        <text
          x="8"
          y="20"
          fontSize="10"
          fill={color}
          opacity="0.8"
          fontFamily="monospace"
        >
          {Math.floor(config.canvasWidth / config.cellSize)}×{Math.floor(config.canvasHeight / config.cellSize)} grid
        </text>

        {/* Cell size indicator */}
        <text
          x="8"
          y="35"
          fontSize="9"
          fill={color}
          opacity="0.6"
          fontFamily="monospace"
        >
          {config.cellSize}px cells
        </text>
      </svg>

      {/* Grid toggle hint */}
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
        Grid: {config.cellSize}px
      </div>
    </div>
  );
}

// Preset grid configurations for different use cases
export const GRID_PRESETS = {
  fine: {
    ...DEFAULT_DECORATION_GRID,
    cellSize: 10,
    snapDistance: 5
  },
  standard: DEFAULT_DECORATION_GRID,
  coarse: {
    ...DEFAULT_DECORATION_GRID,
    cellSize: 40,
    snapDistance: 20
  }
} as const;

// Grid overlay with animation effects
export function AnimatedDecorationGridOverlay({
  config = DEFAULT_DECORATION_GRID,
  visible = true,
  className = '',
  animationDuration = 300
}: DecorationGridOverlayProps & { animationDuration?: number }) {
  return (
    <div
      className={`transition-opacity duration-${animationDuration} ${visible ? 'opacity-100' : 'opacity-0'} ${className}`}
    >
      <DecorationGridOverlay
        config={config}
        visible={visible}
        className="transition-all duration-200 ease-in-out"
      />
    </div>
  );
}

// Enhanced grid overlay with magnetic zones visualization
export function MagneticGridOverlay({
  config = DEFAULT_DECORATION_GRID,
  visible = true,
  mousePosition,
  className = ''
}: DecorationGridOverlayProps & { mousePosition?: { x: number; y: number } }) {
  const { verticalLines, horizontalLines } = generateGridLines(config);

  if (!visible || !config.showGrid) {
    return null;
  }

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} style={{ zIndex: 1 }}>
      <DecorationGridOverlay
        config={config}
        visible={visible}
        opacity={0.2}
        color="#6B7280"
      />

      {/* Magnetic zones around mouse */}
      {mousePosition && config.magneticSnapping && (
        <svg
          width={config.canvasWidth}
          height={config.canvasHeight}
          className="w-full h-full absolute inset-0"
        >
          {/* Nearest grid points */}
          {verticalLines
            .filter(vLine => Math.abs(vLine.x - mousePosition.x) <= config.snapDistance * 2)
            .map(vLine =>
              horizontalLines
                .filter(hLine => Math.abs(hLine.y - mousePosition.y) <= config.snapDistance * 2)
                .map(hLine => {
                  const distance = Math.sqrt(
                    Math.pow(vLine.x - mousePosition.x, 2) +
                    Math.pow(hLine.y - mousePosition.y, 2)
                  );

                  if (distance <= config.snapDistance) {
                    return (
                      <circle
                        key={`magnetic-${vLine.x}-${hLine.y}`}
                        cx={vLine.x}
                        cy={hLine.y}
                        r={config.snapDistance}
                        fill="rgba(59, 130, 246, 0.1)"
                        stroke="rgba(59, 130, 246, 0.4)"
                        strokeWidth="1"
                        className="animate-pulse"
                      />
                    );
                  }
                  return null;
                })
            )
          }
        </svg>
      )}
    </div>
  );
}