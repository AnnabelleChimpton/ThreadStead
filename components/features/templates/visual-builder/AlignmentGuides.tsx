/**
 * Alignment Guides Component
 * Renders visual guides and snap indicators during component positioning
 */

import React from 'react';
import type { AlignmentGuide, SnapPoint } from '@/lib/templates/visual-builder/snapping-utils';

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
  snapPoints: SnapPoint[];
  isVisible: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Renders alignment guides and snap indicators
 */
export default function AlignmentGuides({
  guides,
  snapPoints,
  isVisible,
  canvasWidth,
  canvasHeight
}: AlignmentGuidesProps) {
  if (!isVisible) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-50"
      width={canvasWidth}
      height={canvasHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'visible'
      }}
    >
      {/* Alignment guides */}
      {guides.map(guide => (
        <line
          key={guide.id}
          x1={guide.type === 'vertical' ? guide.position : guide.start}
          y1={guide.type === 'vertical' ? guide.start : guide.position}
          x2={guide.type === 'vertical' ? guide.position : guide.end}
          y2={guide.type === 'vertical' ? guide.end : guide.position}
          stroke={getGuideColor(guide.strength)}
          strokeWidth={getGuideWidth(guide.strength)}
          strokeDasharray={getGuideDashArray(guide.strength)}
          opacity={0.8}
        />
      ))}

      {/* Enhanced snap points indicators with magnetic zones */}
      {snapPoints.map((point, index) => (
        <g key={`snap-${index}`}>
          {point.x !== undefined && (
            <>
              {/* Magnetic zone indicator (if magnetic pull exists) */}
              {point.magneticPull && point.magneticPull > 0 && (
                <circle
                  cx={point.x}
                  cy={point.y || canvasHeight / 2}
                  r={12}
                  fill={getSnapPointColor(point.type)}
                  opacity={0.1 + (point.magneticPull * 0.2)}
                  stroke={getSnapPointColor(point.type)}
                  strokeWidth={1}
                  strokeOpacity={0.3}
                />
              )}

              {/* Main snap point */}
              <circle
                cx={point.x}
                cy={point.y || canvasHeight / 2}
                r={point.priority && point.priority > 7 ? 5 : 4}
                fill={getSnapPointColor(point.type)}
                stroke="white"
                strokeWidth={1}
                opacity={0.9}
              />

              {/* Spacing indicator */}
              {point.spacing && (
                <text
                  x={point.x + 8}
                  y={(point.y || canvasHeight / 2) - 8}
                  fontSize="10"
                  fill={getSnapPointColor(point.type)}
                  opacity={0.8}
                >
                  {point.spacing.value}px
                </text>
              )}
            </>
          )}
          {point.y !== undefined && point.x === undefined && (
            <>
              {/* Magnetic zone indicator (if magnetic pull exists) */}
              {point.magneticPull && point.magneticPull > 0 && (
                <circle
                  cx={canvasWidth / 2}
                  cy={point.y}
                  r={12}
                  fill={getSnapPointColor(point.type)}
                  opacity={0.1 + (point.magneticPull * 0.2)}
                  stroke={getSnapPointColor(point.type)}
                  strokeWidth={1}
                  strokeOpacity={0.3}
                />
              )}

              {/* Main snap point */}
              <circle
                cx={canvasWidth / 2}
                cy={point.y}
                r={point.priority && point.priority > 7 ? 5 : 4}
                fill={getSnapPointColor(point.type)}
                stroke="white"
                strokeWidth={1}
                opacity={0.9}
              />

              {/* Spacing indicator */}
              {point.spacing && (
                <text
                  x={(canvasWidth / 2) + 8}
                  y={point.y - 8}
                  fontSize="10"
                  fill={getSnapPointColor(point.type)}
                  opacity={0.8}
                >
                  {point.spacing.value}px
                </text>
              )}
            </>
          )}
        </g>
      ))}

      <defs>
        {/* Gradient for strong guides */}
        <linearGradient id="strongGuide" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#3B82F6" stopOpacity="1" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.8" />
        </linearGradient>

        {/* Gradient for medium guides */}
        <linearGradient id="mediumGuide" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#10B981" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Get guide color based on strength
 */
function getGuideColor(strength: 'strong' | 'medium' | 'weak'): string {
  switch (strength) {
    case 'strong':
      return '#3B82F6'; // Blue - edge alignment
    case 'medium':
      return '#10B981'; // Green - center alignment
    case 'weak':
      return '#6B7280'; // Gray - weak alignment
    default:
      return '#6B7280';
  }
}

/**
 * Get guide width based on strength
 */
function getGuideWidth(strength: 'strong' | 'medium' | 'weak'): number {
  switch (strength) {
    case 'strong':
      return 2;
    case 'medium':
      return 1.5;
    case 'weak':
      return 1;
    default:
      return 1;
  }
}

/**
 * Get guide dash array based on strength
 */
function getGuideDashArray(strength: 'strong' | 'medium' | 'weak'): string {
  switch (strength) {
    case 'strong':
      return '4,2'; // Solid with small gaps
    case 'medium':
      return '3,3'; // Medium dashes
    case 'weak':
      return '2,4'; // Small dashes with larger gaps
    default:
      return '2,4';
  }
}

/**
 * Get snap point color based on type
 * PHASE 4.3: Added 'css-grid' type for CSS Grid snapping
 */
function getSnapPointColor(type: 'edge' | 'center' | 'grid' | 'spacing' | 'css-grid'): string {
  switch (type) {
    case 'edge':
      return '#3B82F6'; // Blue for edge snaps
    case 'center':
      return '#10B981'; // Green for center snaps
    case 'grid':
      return '#8B5CF6'; // Purple for grid snaps
    case 'css-grid':
      return '#22C55E'; // Green for CSS Grid snaps (Phase 4.3)
    case 'spacing':
      return '#F59E0B'; // Orange for spacing snaps
    default:
      return '#6B7280';
  }
}

/**
 * Hook for managing alignment guides state
 */
export function useAlignmentGuides() {
  const [guides, setGuides] = React.useState<AlignmentGuide[]>([]);
  const [snapPoints, setSnapPoints] = React.useState<SnapPoint[]>([]);
  const [isVisible, setIsVisible] = React.useState(false);

  const showGuides = React.useCallback((newGuides: AlignmentGuide[], newSnapPoints: SnapPoint[]) => {
    setGuides(newGuides);
    setSnapPoints(newSnapPoints);
    setIsVisible(true);
  }, []);

  const hideGuides = React.useCallback(() => {
    setIsVisible(false);
    // Keep guides in state briefly for smooth transitions
    setTimeout(() => {
      setGuides([]);
      setSnapPoints([]);
    }, 100);
  }, []);

  const updateGuides = React.useCallback((newGuides: AlignmentGuide[], newSnapPoints: SnapPoint[]) => {
    setGuides(newGuides);
    setSnapPoints(newSnapPoints);
  }, []);

  return {
    guides,
    snapPoints,
    isVisible,
    showGuides,
    hideGuides,
    updateGuides,
  };
}