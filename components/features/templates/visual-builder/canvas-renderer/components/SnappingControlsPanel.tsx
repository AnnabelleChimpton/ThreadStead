/**
 * Snapping controls panel for the canvas
 * Provides controls for component snapping, guides, and keyboard shortcuts info
 */

import React from 'react';

interface SnappingControlsPanelProps {
  snapConfig: {
    componentSnapping: boolean;
    showGuides: boolean;
  };
  setSnapConfig: React.Dispatch<React.SetStateAction<{
    componentSnapping: boolean;
    showGuides: boolean;
  }>>;
  selectedComponentIds: Set<string>;
}

export default function SnappingControlsPanel({
  snapConfig,
  setSnapConfig,
  selectedComponentIds,
}: SnappingControlsPanelProps) {
  return (
    <div className="absolute top-4 left-4 bg-white bg-opacity-95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-sm border">
      <div className="flex items-center gap-3">
        <span className="text-gray-600 font-medium text-xs">TOOLS:</span>

        {/* Component snapping toggle */}
        <button
          onClick={() => setSnapConfig(prev => ({ ...prev, componentSnapping: !prev.componentSnapping }))}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            snapConfig.componentSnapping
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}
          title="Toggle component snapping (Alt+C)"
        >
          <span>🧲</span>
          <span>Comp</span>
        </button>

        {/* Guides visibility toggle */}
        <button
          onClick={() => setSnapConfig(prev => ({ ...prev, showGuides: !prev.showGuides }))}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
            snapConfig.showGuides
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}
          title="Toggle alignment guides (Alt+H)"
        >
          <span>📏</span>
          <span>Guides</span>
        </button>
      </div>

      {/* Multi-select and keyboard shortcuts info */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-1">SELECTION:</div>
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Ctrl+Click</span>
            <span className="text-gray-500">Multi-select</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Drag</span>
            <span className="text-gray-500">Rectangle select</span>
          </div>
        </div>
      </div>

      {/* Sizing behavior legend */}
      {selectedComponentIds.size > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1">SIZING BEHAVIORS:</div>
          <div className="flex gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs">📐</div>
              <span className="text-gray-600">Fixed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs">📏</div>
              <span className="text-gray-600">Expands</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">⚖️</div>
              <span className="text-gray-600">Smart</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
