/**
 * Smart Alignment System - Magnetic guides and auto-alignment for components
 */

import React, { useMemo } from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';

export interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  source: 'edge' | 'center' | 'grid';
  componentId?: string;
  strength: number; // 0-1, how strongly it should attract
}

export interface AlignmentResult {
  x: number;
  y: number;
  guides: AlignmentGuide[];
  snapped: boolean;
}

interface SmartAlignmentProps {
  components: ComponentItem[];
  draggedComponent: ComponentItem | null;
  targetPosition: { x: number; y: number };
  canvasWidth: number;
  snapDistance?: number;
  showGuides?: boolean;
}

const SNAP_DISTANCE = 8;
const GUIDE_COLORS = {
  edge: '#ef4444', // red
  center: '#3b82f6', // blue
  grid: '#10b981', // green
};

/**
 * Calculate alignment guides for a component at target position
 */
export function calculateAlignmentGuides(
  targetComponent: ComponentItem,
  targetPosition: { x: number; y: number },
  otherComponents: ComponentItem[],
  canvasWidth: number,
  snapDistance: number = SNAP_DISTANCE
): AlignmentResult {
  const guides: AlignmentGuide[] = [];
  let finalX = targetPosition.x;
  let finalY = targetPosition.y;
  let snapped = false;

  // Assume component dimensions (could be enhanced with actual measurements)
  const targetWidth = 200; // Default width
  const targetHeight = 100; // Default height
  const targetCenterX = targetPosition.x + targetWidth / 2;
  const targetCenterY = targetPosition.y + targetHeight / 2;
  const targetRight = targetPosition.x + targetWidth;
  const targetBottom = targetPosition.y + targetHeight;

  // Check alignment with other components
  for (const component of otherComponents) {
    if (component.id === targetComponent.id) continue;

    const compWidth = 200; // Default width
    const compHeight = 100; // Default height
    const compX = component.position?.x || 0;
    const compY = component.position?.y || 0;
    const compCenterX = compX + compWidth / 2;
    const compCenterY = compY + compHeight / 2;
    const compRight = compX + compWidth;
    const compBottom = compY + compHeight;

    // Vertical alignment guides
    const verticalAlignments = [
      { pos: compX, type: 'edge', strength: 0.9 }, // Left edge
      { pos: compCenterX, type: 'center', strength: 0.8 }, // Center
      { pos: compRight, type: 'edge', strength: 0.9 }, // Right edge
    ];

    for (const align of verticalAlignments) {
      const distance = Math.abs(targetPosition.x - align.pos);
      if (distance <= snapDistance) {
        guides.push({
          type: 'vertical',
          position: align.pos,
          source: align.type as 'edge' | 'center',
          componentId: component.id,
          strength: align.strength * (1 - distance / snapDistance),
        });
        if (distance < snapDistance / 2) {
          finalX = align.pos;
          snapped = true;
        }
      }

      // Also check center alignment
      const centerDistance = Math.abs(targetCenterX - align.pos);
      if (centerDistance <= snapDistance) {
        guides.push({
          type: 'vertical',
          position: align.pos,
          source: 'center',
          componentId: component.id,
          strength: 0.8 * (1 - centerDistance / snapDistance),
        });
        if (centerDistance < snapDistance / 2) {
          finalX = align.pos - targetWidth / 2;
          snapped = true;
        }
      }

      // Check right edge alignment
      const rightDistance = Math.abs(targetRight - align.pos);
      if (rightDistance <= snapDistance) {
        guides.push({
          type: 'vertical',
          position: align.pos,
          source: 'edge',
          componentId: component.id,
          strength: 0.9 * (1 - rightDistance / snapDistance),
        });
        if (rightDistance < snapDistance / 2) {
          finalX = align.pos - targetWidth;
          snapped = true;
        }
      }
    }

    // Horizontal alignment guides
    const horizontalAlignments = [
      { pos: compY, type: 'edge', strength: 0.9 }, // Top edge
      { pos: compCenterY, type: 'center', strength: 0.8 }, // Center
      { pos: compBottom, type: 'edge', strength: 0.9 }, // Bottom edge
    ];

    for (const align of horizontalAlignments) {
      const distance = Math.abs(targetPosition.y - align.pos);
      if (distance <= snapDistance) {
        guides.push({
          type: 'horizontal',
          position: align.pos,
          source: align.type as 'edge' | 'center',
          componentId: component.id,
          strength: align.strength * (1 - distance / snapDistance),
        });
        if (distance < snapDistance / 2) {
          finalY = align.pos;
          snapped = true;
        }
      }

      // Also check center alignment
      const centerDistance = Math.abs(targetCenterY - align.pos);
      if (centerDistance <= snapDistance) {
        guides.push({
          type: 'horizontal',
          position: align.pos,
          source: 'center',
          componentId: component.id,
          strength: 0.8 * (1 - centerDistance / snapDistance),
        });
        if (centerDistance < snapDistance / 2) {
          finalY = align.pos - targetHeight / 2;
          snapped = true;
        }
      }

      // Check bottom edge alignment
      const bottomDistance = Math.abs(targetBottom - align.pos);
      if (bottomDistance <= snapDistance) {
        guides.push({
          type: 'horizontal',
          position: align.pos,
          source: 'edge',
          componentId: component.id,
          strength: 0.9 * (1 - bottomDistance / snapDistance),
        });
        if (bottomDistance < snapDistance / 2) {
          finalY = align.pos - targetHeight;
          snapped = true;
        }
      }
    }
  }

  // Add canvas edge guides
  const canvasHeight = 600; // Default height, could be dynamic
  const canvasEdges = [
    { type: 'vertical' as const, pos: 0, source: 'edge' as const },
    { type: 'vertical' as const, pos: canvasWidth / 2, source: 'center' as const },
    { type: 'vertical' as const, pos: canvasWidth, source: 'edge' as const },
    { type: 'horizontal' as const, pos: 0, source: 'edge' as const },
    { type: 'horizontal' as const, pos: canvasHeight / 2, source: 'center' as const },
    { type: 'horizontal' as const, pos: canvasHeight, source: 'edge' as const },
  ];

  for (const edge of canvasEdges) {
    const targetPos = edge.type === 'vertical' ? targetPosition.x : targetPosition.y;
    const distance = Math.abs(targetPos - edge.pos);

    if (distance <= snapDistance) {
      guides.push({
        type: edge.type,
        position: edge.pos,
        source: edge.source,
        strength: 0.7 * (1 - distance / snapDistance),
      });

      if (distance < snapDistance / 2) {
        if (edge.type === 'vertical') {
          finalX = edge.pos;
        } else {
          finalY = edge.pos;
        }
        snapped = true;
      }
    }
  }

  return {
    x: finalX,
    y: finalY,
    guides: guides.sort((a, b) => b.strength - a.strength).slice(0, 6), // Keep only strongest guides
    snapped,
  };
}

/**
 * Visual alignment guides component
 */
export default function SmartAlignment({
  components,
  draggedComponent,
  targetPosition,
  canvasWidth,
  snapDistance = SNAP_DISTANCE,
  showGuides = true,
}: SmartAlignmentProps) {
  const alignmentResult = useMemo(() => {
    if (!draggedComponent || !showGuides) {
      return { x: targetPosition.x, y: targetPosition.y, guides: [], snapped: false };
    }

    const otherComponents = components.filter(c => c.id !== draggedComponent.id);
    return calculateAlignmentGuides(
      draggedComponent,
      targetPosition,
      otherComponents,
      canvasWidth,
      snapDistance
    );
  }, [draggedComponent, targetPosition, components, canvasWidth, snapDistance, showGuides]);

  if (!showGuides || alignmentResult.guides.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 999 }}>
      {alignmentResult.guides.map((guide, index) => {
        const color = GUIDE_COLORS[guide.source];
        const opacity = Math.max(0.3, guide.strength);

        if (guide.type === 'vertical') {
          return (
            <div
              key={`v-${index}`}
              className="absolute animate-pulse"
              style={{
                left: guide.position,
                top: 0,
                bottom: 0,
                width: '1px',
                backgroundColor: color,
                opacity,
                boxShadow: `0 0 4px ${color}`,
              }}
            />
          );
        } else {
          return (
            <div
              key={`h-${index}`}
              className="absolute animate-pulse"
              style={{
                top: guide.position,
                left: 0,
                right: 0,
                height: '1px',
                backgroundColor: color,
                opacity,
                boxShadow: `0 0 4px ${color}`,
              }}
            />
          );
        }
      })}

      {/* Snap feedback indicator */}
      {alignmentResult.snapped && (
        <div
          className="absolute bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg animate-bounce"
          style={{
            left: targetPosition.x,
            top: targetPosition.y - 30,
            zIndex: 1000,
          }}
        >
          🧲 Snapped
        </div>
      )}
    </div>
  );
}

/**
 * Hook for using smart alignment in drag operations
 */
export function useSmartAlignment(
  components: ComponentItem[],
  snapDistance: number = SNAP_DISTANCE
) {
  const getAlignedPosition = useMemo(() => {
    return (
      draggedComponent: ComponentItem,
      targetPosition: { x: number; y: number },
      canvasWidth: number
    ): AlignmentResult => {
      const otherComponents = components.filter(c => c.id !== draggedComponent.id);
      return calculateAlignmentGuides(
        draggedComponent,
        targetPosition,
        otherComponents,
        canvasWidth,
        snapDistance
      );
    };
  }, [components, snapDistance]);

  return { getAlignedPosition };
}