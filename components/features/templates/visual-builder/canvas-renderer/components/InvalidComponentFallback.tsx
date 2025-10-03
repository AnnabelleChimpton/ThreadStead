/**
 * Fallback components for invalid or unknown component types
 */

import React from 'react';

interface InvalidComponentFallbackProps {
  componentId: string;
  componentType?: string;
  currentPosition: { x: number; y: number };
  onComponentClick: (componentId: string, event: React.MouseEvent) => void;
  onComponentMouseDown: (componentId: string, event: React.MouseEvent) => void;
}

/**
 * Displays when component type is not found in registry
 */
export function UnknownComponentFallback({
  componentId,
  componentType,
  currentPosition,
  onComponentClick,
  onComponentMouseDown,
}: InvalidComponentFallbackProps) {
  return (
    <div
      key={componentId}
      className="absolute bg-red-100 border-2 border-red-500 p-2 text-red-700 text-sm cursor-move"
      style={{
        left: currentPosition.x,
        top: currentPosition.y,
        width: 150,
        height: 80,
        zIndex: 2,
      }}
      onClick={(e) => onComponentClick(componentId, e)}
      onMouseDown={(e) => onComponentMouseDown(componentId, e)}
    >
      <div className="font-bold text-xs">❌ Unknown: {componentType}</div>
      <div className="text-xs">Click to select</div>
    </div>
  );
}

/**
 * Test div for debugging (can be removed in production)
 */
export function TestComponentFallback({
  componentId,
  componentType,
  currentPosition,
  onComponentClick,
  onComponentMouseDown,
}: InvalidComponentFallbackProps) {
  return (
    <div
      key={componentId}
      className="absolute bg-green-100 border-2 border-green-500 p-2 text-green-700 text-sm cursor-move"
      style={{
        left: currentPosition.x,
        top: currentPosition.y,
        width: 150,
        height: 80,
        zIndex: 2,
      }}
      onClick={(e) => onComponentClick(componentId, e)}
      onMouseDown={(e) => onComponentMouseDown(componentId, e)}
    >
      <div className="font-bold text-xs">{componentType || 'Unknown'}</div>
      <div className="text-xs">ID: {componentId?.slice(-6) || 'none'}</div>
      <div className="text-xs">Pos: {currentPosition.x},{currentPosition.y}</div>
      <div className="text-xs">✅ VISIBLE</div>
    </div>
  );
}
