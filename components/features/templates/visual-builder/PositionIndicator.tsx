/**
 * Position Indicator Component
 * Shows live coordinates and dimensions during drag/resize operations
 */

import React from 'react';

interface PositionData {
  x: number;
  y: number;
  width?: number;
  height?: number;
  isSnapped?: boolean;
  snapInfo?: string;
}

interface PositionIndicatorProps {
  position: PositionData | null;
  isVisible: boolean;
  mode: 'drag' | 'resize';
  mousePosition?: { x: number; y: number };
}

/**
 * Renders live position and dimension information
 */
export default function PositionIndicator({
  position,
  isVisible,
  mode,
  mousePosition
}: PositionIndicatorProps) {
  if (!isVisible || !position) return null;

  // Calculate where to position the indicator
  const indicatorX = mousePosition?.x ? mousePosition.x + 10 : position.x;
  const indicatorY = mousePosition?.y ? mousePosition.y - 40 : position.y - 40;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: indicatorX,
        top: indicatorY,
        transform: 'translateX(10px) translateY(-10px)'
      }}
    >
      <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg border border-gray-700">
        <div className="flex items-center space-x-2">
          {/* Position coordinates */}
          <div className="flex items-center space-x-1">
            <span className="text-blue-300">X:</span>
            <span className={position.isSnapped ? 'text-green-300 font-semibold' : 'text-white'}>
              {Math.round(position.x)}
            </span>
            <span className="text-blue-300">Y:</span>
            <span className={position.isSnapped ? 'text-green-300 font-semibold' : 'text-white'}>
              {Math.round(position.y)}
            </span>
          </div>

          {/* Dimensions (only during resize or when available) */}
          {(mode === 'resize' || (position.width && position.height)) && (
            <>
              <span className="text-gray-500">|</span>
              <div className="flex items-center space-x-1">
                <span className="text-purple-300">W:</span>
                <span className="text-white">{Math.round(position.width || 0)}</span>
                <span className="text-purple-300">H:</span>
                <span className="text-white">{Math.round(position.height || 0)}</span>
              </div>
            </>
          )}

          {/* Snap indicator */}
          {position.isSnapped && (
            <>
              <span className="text-gray-500">|</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-300 text-xs">SNAP</span>
              </div>
            </>
          )}
        </div>

        {/* Snap info */}
        {position.snapInfo && (
          <div className="text-xs text-green-300 mt-1 border-t border-gray-700 pt-1">
            {position.snapInfo}
          </div>
        )}

        {/* Arrow pointing to component */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2">
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing position indicator state
 */
export function usePositionIndicator() {
  const [position, setPosition] = React.useState<PositionData | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [mode, setMode] = React.useState<'drag' | 'resize'>('drag');
  const [mousePosition, setMousePosition] = React.useState<{ x: number; y: number } | undefined>();

  const showPosition = React.useCallback((
    newPosition: PositionData,
    newMode: 'drag' | 'resize' = 'drag',
    mouse?: { x: number; y: number }
  ) => {
    setPosition(newPosition);
    setMode(newMode);
    setMousePosition(mouse);
    setIsVisible(true);
  }, []);

  const updatePosition = React.useCallback((
    newPosition: Partial<PositionData>,
    mouse?: { x: number; y: number }
  ) => {
    setPosition(prev => prev ? { ...prev, ...newPosition } : null);
    if (mouse) setMousePosition(mouse);
  }, []);

  const hidePosition = React.useCallback(() => {
    setIsVisible(false);
    // Clear after animation
    setTimeout(() => {
      setPosition(null);
      setMousePosition(undefined);
    }, 100);
  }, []);

  return {
    position,
    isVisible,
    mode,
    mousePosition,
    showPosition,
    updatePosition,
    hidePosition,
  };
}

/**
 * Distance indicator component for showing spacing between components
 */
interface DistanceIndicatorProps {
  from: { x: number; y: number; width: number; height: number };
  to: { x: number; y: number; width: number; height: number };
  isVisible: boolean;
}

export function DistanceIndicator({ from, to, isVisible }: DistanceIndicatorProps) {
  if (!isVisible) return null;

  // Calculate distance and positioning
  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };

  const distance = Math.sqrt(
    Math.pow(toCenter.x - fromCenter.x, 2) + Math.pow(toCenter.y - fromCenter.y, 2)
  );

  const midpoint = {
    x: (fromCenter.x + toCenter.x) / 2,
    y: (fromCenter.y + toCenter.y) / 2,
  };

  // Calculate horizontal and vertical distances
  const horizontalDistance = Math.abs(toCenter.x - fromCenter.x);
  const verticalDistance = Math.abs(toCenter.y - fromCenter.y);

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-40"
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {/* Distance line */}
      <line
        x1={fromCenter.x}
        y1={fromCenter.y}
        x2={toCenter.x}
        y2={toCenter.y}
        stroke="#F59E0B"
        strokeWidth={1}
        strokeDasharray="3,3"
        opacity={0.8}
      />

      {/* Distance label */}
      <g transform={`translate(${midpoint.x}, ${midpoint.y})`}>
        <rect
          x={-20}
          y={-8}
          width={40}
          height={16}
          fill="#1F2937"
          stroke="#F59E0B"
          strokeWidth={1}
          rx={3}
          opacity={0.9}
        />
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#F59E0B"
          fontSize={10}
          fontWeight="bold"
        >
          {Math.round(distance)}px
        </text>
      </g>

      {/* Horizontal distance indicator */}
      {horizontalDistance > 20 && (
        <g>
          <line
            x1={Math.min(fromCenter.x, toCenter.x)}
            y1={fromCenter.y - 15}
            x2={Math.max(fromCenter.x, toCenter.x)}
            y2={fromCenter.y - 15}
            stroke="#8B5CF6"
            strokeWidth={1}
            opacity={0.6}
          />
          <text
            x={(fromCenter.x + toCenter.x) / 2}
            y={fromCenter.y - 20}
            textAnchor="middle"
            fill="#8B5CF6"
            fontSize={9}
          >
            {Math.round(horizontalDistance)}px
          </text>
        </g>
      )}

      {/* Vertical distance indicator */}
      {verticalDistance > 20 && (
        <g>
          <line
            x1={fromCenter.x - 15}
            y1={Math.min(fromCenter.y, toCenter.y)}
            x2={fromCenter.x - 15}
            y2={Math.max(fromCenter.y, toCenter.y)}
            stroke="#10B981"
            strokeWidth={1}
            opacity={0.6}
          />
          <text
            x={fromCenter.x - 25}
            y={(fromCenter.y + toCenter.y) / 2}
            textAnchor="middle"
            fill="#10B981"
            fontSize={9}
            transform={`rotate(-90, ${fromCenter.x - 25}, ${(fromCenter.y + toCenter.y) / 2})`}
          >
            {Math.round(verticalDistance)}px
          </text>
        </g>
      )}
    </svg>
  );
}