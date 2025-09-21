/**
 * ResizeHandle Component
 * Provides visual handles for resizing components in the visual builder
 */

import React, { useCallback } from 'react';
import type { MeasuredDimensions } from './ResizableComponent';

export type ResizeDirection =
  | 'n' | 's' | 'e' | 'w'           // Edge handles (north, south, east, west)
  | 'ne' | 'nw' | 'se' | 'sw';     // Corner handles

export interface ResizeHandleProps {
  direction: ResizeDirection;
  onResizeStart: (direction: ResizeDirection, event: React.MouseEvent) => void;
  className?: string;
  size?: number;
  measuredDimensions?: MeasuredDimensions;
}

export default function ResizeHandle({
  direction,
  onResizeStart,
  className = '',
  size = 8,
  measuredDimensions
}: ResizeHandleProps) {
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onResizeStart(direction, event);
  }, [direction, onResizeStart]);

  // Calculate position and cursor based on direction
  const getHandleStyles = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      backgroundColor: '#3b82f6',
      border: '2px solid #ffffff',
      borderRadius: '2px',
      zIndex: 30,
      opacity: 1,
      transition: 'all 0.15s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
    };


    // Use measured dimensions for precise positioning when available
    if (measuredDimensions) {
      const { width, height, offsetX, offsetY } = measuredDimensions;

      // Handle positioning based on measured component bounds
      switch (direction) {
        case 'n': // Top edge
          return {
            ...baseStyle,
            left: offsetX + width / 2 - (size * 3) / 2,
            top: offsetY - size / 2,
            width: size * 3,
            height: size,
            cursor: 'ns-resize',
          };
        case 's': // Bottom edge
          return {
            ...baseStyle,
            left: offsetX + width / 2 - (size * 3) / 2,
            top: offsetY + height - size / 2,
            width: size * 3,
            height: size,
            cursor: 'ns-resize',
          };
        case 'e': // Right edge
          return {
            ...baseStyle,
            left: offsetX + width - size / 2,
            top: offsetY + height / 2 - (size * 3) / 2,
            width: size,
            height: size * 3,
            cursor: 'ew-resize',
          };
        case 'w': // Left edge
          return {
            ...baseStyle,
            left: offsetX - size / 2,
            top: offsetY + height / 2 - (size * 3) / 2,
            width: size,
            height: size * 3,
            cursor: 'ew-resize',
          };
        case 'ne': // Top-right corner
          return {
            ...baseStyle,
            left: offsetX + width - size / 2,
            top: offsetY - size / 2,
            width: size,
            height: size,
            cursor: 'ne-resize',
          };
        case 'nw': // Top-left corner
          return {
            ...baseStyle,
            left: offsetX - size / 2,
            top: offsetY - size / 2,
            width: size,
            height: size,
            cursor: 'nw-resize',
          };
        case 'se': // Bottom-right corner
          return {
            ...baseStyle,
            left: offsetX + width - size / 2,
            top: offsetY + height - size / 2,
            width: size,
            height: size,
            cursor: 'se-resize',
          };
        case 'sw': // Bottom-left corner
          return {
            ...baseStyle,
            left: offsetX - size / 2,
            top: offsetY + height - size / 2,
            width: size,
            height: size,
            cursor: 'sw-resize',
          };
        default:
          return baseStyle;
      }
    }

    // Fallback to percentage-based positioning when measured dimensions unavailable
    switch (direction) {
      case 'n': // Top edge
        return {
          ...baseStyle,
          top: -size / 2,
          left: '50%',
          width: size * 3,
          height: size,
          marginLeft: -(size * 3) / 2,
          cursor: 'ns-resize',
        };
      case 's': // Bottom edge
        return {
          ...baseStyle,
          bottom: -size / 2,
          left: '50%',
          width: size * 3,
          height: size,
          marginLeft: -(size * 3) / 2,
          cursor: 'ns-resize',
        };
      case 'e': // Right edge
        return {
          ...baseStyle,
          right: -size / 2,
          top: '50%',
          width: size,
          height: size * 3,
          marginTop: -(size * 3) / 2,
          cursor: 'ew-resize',
        };
      case 'w': // Left edge
        return {
          ...baseStyle,
          left: -size / 2,
          top: '50%',
          width: size,
          height: size * 3,
          marginTop: -(size * 3) / 2,
          cursor: 'ew-resize',
        };
      case 'ne': // Top-right corner
        return {
          ...baseStyle,
          top: -size / 2,
          right: -size / 2,
          width: size,
          height: size,
          cursor: 'ne-resize',
        };
      case 'nw': // Top-left corner
        return {
          ...baseStyle,
          top: -size / 2,
          left: -size / 2,
          width: size,
          height: size,
          cursor: 'nw-resize',
        };
      case 'se': // Bottom-right corner
        return {
          ...baseStyle,
          bottom: -size / 2,
          right: -size / 2,
          width: size,
          height: size,
          cursor: 'se-resize',
        };
      case 'sw': // Bottom-left corner
        return {
          ...baseStyle,
          bottom: -size / 2,
          left: -size / 2,
          width: size,
          height: size,
          cursor: 'sw-resize',
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div
      className={`resize-handle resize-handle-${direction} ${className}`}
      style={getHandleStyles()}
      onMouseDown={handleMouseDown}
      onMouseEnter={(e) => {
        const target = e.target as HTMLElement;
        target.style.backgroundColor = '#1d4ed8';
        target.style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        const target = e.target as HTMLElement;
        target.style.backgroundColor = '#3b82f6';
        target.style.transform = 'scale(1)';
      }}
    />
  );
}

/**
 * ResizeHandles Component
 * Renders all resize handles around a component
 */
export interface ResizeHandlesProps {
  onResizeStart: (direction: ResizeDirection, event: React.MouseEvent) => void;
  enableCorners?: boolean;
  enableEdges?: boolean;
  className?: string;
  size?: number;
  measuredDimensions?: MeasuredDimensions;
}

export function ResizeHandles({
  onResizeStart,
  enableCorners = true,
  enableEdges = true,
  className = '',
  size = 8,
  measuredDimensions
}: ResizeHandlesProps) {
  const directions: ResizeDirection[] = [];

  if (enableEdges) {
    directions.push('n', 's', 'e', 'w');
  }

  if (enableCorners) {
    directions.push('ne', 'nw', 'se', 'sw');
  }

  return (
    <>
      {directions.map((direction) => (
        <ResizeHandle
          key={direction}
          direction={direction}
          onResizeStart={onResizeStart}
          className={className}
          size={size}
          measuredDimensions={measuredDimensions}
        />
      ))}
    </>
  );
}