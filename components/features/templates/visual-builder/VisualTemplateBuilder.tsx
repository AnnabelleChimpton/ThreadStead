/**
 * VISUAL_BUILDER_PROGRESS: Main Visual Template Builder Component - Simplified Pixel Homes Pattern
 * Phase 1: Visual Builder Foundation - Direct State Management
 */

import React, { useState, useCallback } from 'react';
import { useCanvasState } from '@/hooks/useCanvasState';
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import {
  getOptimalSpan,
  getCurrentBreakpoint,
  GRID_BREAKPOINTS,
  type GridBreakpoint
} from '@/lib/templates/visual-builder/grid-utils';

// Component imports
import ComponentPalette from './ComponentPalette';
import CanvasRenderer from './CanvasRenderer';

interface VisualTemplateBuilderProps {
  initialTemplate?: string;
  onTemplateChange?: (html: string) => void;
  residentData?: ResidentData;
  className?: string;
}

/**
 * Main Visual Template Builder component - simplified like pixel homes
 */
export default function VisualTemplateBuilder({
  initialTemplate = '',
  onTemplateChange,
  residentData = {
    owner: { id: 'demo', handle: 'demo', displayName: 'Demo User' },
    viewer: { id: 'demo' },
    posts: [],
    guestbook: []
  },
  className = '',
}: VisualTemplateBuilderProps) {
  // Simplified canvas state management
  const canvasState = useCanvasState();
  const [showProperties, setShowProperties] = useState(false);
  const [showComponentPalette, setShowComponentPalette] = useState(true);

  // Breakpoint preview controls
  const [previewBreakpoint, setPreviewBreakpoint] = useState<string | null>(null);
  const currentBreakpoint = getCurrentBreakpoint();
  const effectiveBreakpoint = previewBreakpoint || currentBreakpoint.name;

  const {
    placedComponents,
    selectedComponentIds,
    gridConfig,
    positioningMode,
    setPositioningMode,
    setGridConfig,
    undo,
    redo,
    canUndo,
    canRedo,
    resetCanvas,
    removeSelected,
  } = canvasState;

  // Generate HTML for template output with enhanced responsive grid and auto-spanning
  const generateHTML = useCallback(() => {
    if (placedComponents.length === 0) {
      return '<div class="template-empty">No components placed</div>';
    }

    // Get current breakpoint for responsive sizing
    const currentBreakpoint = getCurrentBreakpoint();

    // Separate components by positioning mode
    const absoluteComponents = placedComponents.filter(c => c.positioningMode === 'absolute');
    const gridComponents = placedComponents.filter(c => c.positioningMode === 'grid');

    // Generate absolute positioned components (unchanged)
    const absoluteHTML = absoluteComponents.map(component => {

      const props = component.props || {};
      const propsString = Object.entries(props)
        .map(([key, value]) => `${key}="${String(value)}"`)
        .join(' ');

      const positionData = JSON.stringify({
        x: component.position.x,
        y: component.position.y,
        positioning: 'absolute'
      });

      return `<${component.type} ${propsString} data-position="${component.position.x},${component.position.y}" data-pixel-position='${positionData}' data-positioning-mode="absolute" />`;
    }).join('\n  ');

    // Generate grid positioned components with smart spanning
    const gridHTML = gridComponents.map(component => {

      const props = component.props || {};
      const propsString = Object.entries(props)
        .map(([key, value]) => `${key}="${String(value)}"`)
        .join(' ');

      // Use auto-spanning if component doesn't have manual span set
      let finalSpan = component.gridPosition?.span;
      if (!finalSpan || finalSpan === 1) {
        finalSpan = getOptimalSpan(component.type, currentBreakpoint.name, currentBreakpoint.columns);
      }

      const gridPos = {
        column: component.gridPosition?.column || 1,
        row: component.gridPosition?.row || 1,
        span: finalSpan
      };

      // Enhanced grid data with responsive information
      const gridData = JSON.stringify({
        column: gridPos.column,
        row: gridPos.row,
        span: gridPos.span,
        positioning: 'grid',
        breakpoint: currentBreakpoint.name,
        autoSpan: !component.gridPosition?.span || component.gridPosition.span === 1
      });

      return `<${component.type} ${propsString} data-grid-column="${gridPos.column}" data-grid-row="${gridPos.row}" data-grid-span="${gridPos.span}" data-grid-position='${gridData}' data-positioning-mode="grid" />`;
    }).join('\n  ');

    // Combine all components
    const allComponents = [absoluteHTML, gridHTML].filter(html => html.length > 0).join('\n  ');

    // Generate responsive container styling
    if (gridComponents.length > 0) {
      // Use responsive grid system
      const containerStyle = `width: 100%; max-width: 100vw; min-height: 100vh; display: grid; grid-template-columns: repeat(${currentBreakpoint.columns}, 1fr); gap: ${currentBreakpoint.gap}px; padding: ${currentBreakpoint.containerPadding}px; box-sizing: border-box;`;

      const finalHTML = `<div class="template-container grid-container responsive-grid" style="${containerStyle}">\n  ${allComponents}\n</div>`;
      return finalHTML;
    } else {
      // Absolute positioning container
      const containerStyle = `width: 100%; max-width: 100vw; min-height: 100vh; position: relative;`;
      const finalHTML = `<div class="template-container relative" style="${containerStyle}">\n  ${allComponents}\n</div>`;
      return finalHTML;
    }
  }, [placedComponents, gridConfig]);


  // Call template change callback when components change
  React.useEffect(() => {
    if (onTemplateChange) {
      const html = generateHTML();
      onTemplateChange(html);
    }
  }, [placedComponents, onTemplateChange, generateHTML]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            event.preventDefault();
            if (event.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            event.preventDefault();
            redo();
            break;
        }
      }

      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedComponentIds.size > 0) {
            event.preventDefault();
            removeSelected();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, removeSelected, selectedComponentIds.size]);

  return (
    <div className={`flex flex-col bg-gray-50 ${className}`} style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Compact top toolbar */}
      <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Visual Template Builder</h2>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Simplified Edition
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Statistics */}
          <div className="text-sm text-gray-600 mr-4">
            {placedComponents.length} component{placedComponents.length !== 1 ? 's' : ''}
            {selectedComponentIds.size > 0 && (
              <span className="text-blue-600 ml-2">
                ({selectedComponentIds.size} selected)
              </span>
            )}
          </div>

          {/* Grid/Positioning controls */}
          <div className="flex items-center gap-2 mr-4 border-r border-gray-200 pr-4">
            <span className="text-sm text-gray-600">Mode:</span>
            <button
              onClick={() => setPositioningMode('absolute')}
              className={`px-3 py-1 text-sm border rounded ${
                positioningMode === 'absolute'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              title="Absolute positioning (pixel-perfect)"
            >
              🎯 Absolute
            </button>
            <button
              onClick={() => {
                setPositioningMode('grid');
                setGridConfig({ enabled: true, showGrid: true });
              }}
              className={`px-3 py-1 text-sm border rounded ${
                positioningMode === 'grid'
                  ? 'bg-green-500 text-white border-green-500'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              title="Grid positioning (responsive)"
            >
              📐 Grid
            </button>
            {positioningMode === 'grid' && (
              <>
                <button
                  onClick={() => setGridConfig({ showGrid: !gridConfig.showGrid })}
                  className={`px-2 py-1 text-xs border rounded ${
                    gridConfig.showGrid
                      ? 'bg-gray-200 text-gray-700 border-gray-300'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                  title="Toggle grid visibility"
                >
                  {gridConfig.showGrid ? '👁️' : '👁️‍🗨️'}
                </button>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {(() => {
                    const breakpoint = getCurrentBreakpoint();
                    return `${breakpoint.name}: ${breakpoint.columns}cols`;
                  })()}
                </div>
              </>
            )}
          </div>

          {/* Breakpoint Preview Controls */}
          <div className="flex items-center gap-2 mr-4 border-r border-gray-200 pr-4">
            <span className="text-sm text-gray-600">Preview:</span>
            {GRID_BREAKPOINTS.map(bp => (
              <button
                key={bp.name}
                onClick={() => setPreviewBreakpoint(previewBreakpoint === bp.name ? null : bp.name)}
                className={`px-2 py-1 text-xs border rounded transition-colors ${
                  (previewBreakpoint === bp.name) || (!previewBreakpoint && bp.name === currentBreakpoint.name)
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
                title={`Preview ${bp.name} (${bp.columns} columns, ${bp.minWidth}px+)`}
              >
                {bp.name === 'mobile' ? '📱' : bp.name === 'tablet' ? '📱' : '💻'} {bp.name}
              </button>
            ))}
            {previewBreakpoint && (
              <button
                onClick={() => setPreviewBreakpoint(null)}
                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 border border-gray-300 rounded hover:bg-gray-300"
                title="Reset to current screen size"
              >
                ↻
              </button>
            )}
          </div>

          {/* History controls */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>

          <button
            onClick={redo}
            disabled={!canRedo}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            ↷ Redo
          </button>

          {/* Actions */}
          <button
            onClick={removeSelected}
            disabled={selectedComponentIds.size === 0}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete Selected (Del)"
          >
            🗑️ Delete
          </button>

          <button
            onClick={resetCanvas}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            title="Clear Canvas"
          >
            🔄 Reset
          </button>

          <button
            onClick={() => setShowProperties(!showProperties)}
            className={`px-3 py-1 text-sm border rounded transition-colors ${
              showProperties
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            ⚙️ Properties
          </button>

          <button
            onClick={() => setShowComponentPalette(!showComponentPalette)}
            className={`px-3 py-1 text-sm border rounded transition-colors ${
              showComponentPalette
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
            title="Toggle component palette"
          >
            🧩 {showComponentPalette ? 'Hide' : 'Show'} Components
          </button>
        </div>
      </div>

      {/* Main content area - maximize vertical space */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Canvas area with proper scrolling */}
        <div className="flex-1 bg-gray-100 p-4" style={{ height: '100%', overflow: 'auto' }}>
          <div className="flex justify-center">
            <CanvasRenderer
              canvasState={canvasState}
              residentData={residentData}
              className="shadow-lg rounded-lg"
              previewBreakpoint={previewBreakpoint}
            />
          </div>
        </div>

        {/* Properties panel (optional) */}
        {showProperties && (
          <div className="w-80 bg-white border-l border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Properties</h3>
            {selectedComponentIds.size === 0 ? (
              <p className="text-gray-500 text-sm">Select a component to edit its properties</p>
            ) : selectedComponentIds.size === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Component Type
                  </label>
                  <div className="text-sm text-gray-600">
                    {Array.from(selectedComponentIds).map(id => {
                      const component = placedComponents.find(c => c.id === id);
                      return component?.type || 'Unknown';
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <div className="text-sm text-gray-600">
                    {Array.from(selectedComponentIds).map(id => {
                      const component = placedComponents.find(c => c.id === id);
                      return component ? `x: ${component.position.x}, y: ${component.position.y}` : 'Unknown';
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                Multiple components selected ({selectedComponentIds.size})
              </p>
            )}
          </div>
        )}
      </div>

      {/* Collapsible component palette */}
      {showComponentPalette && (
        <ComponentPalette
          canvasState={canvasState}
          className="h-48 flex-shrink-0"
        />
      )}

      {/* Compact status bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-1">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>Ready for component placement</span>
            {placedComponents.length > 0 && (
              <span>• Drag components to reposition • Click to select</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>Simplified Builder v1.0</span>
            <div className="w-2 h-2 bg-green-500 rounded-full" title="System Ready" />
          </div>
        </div>
      </div>
    </div>
  );
}