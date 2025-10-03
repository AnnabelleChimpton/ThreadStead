/**
 * Empty canvas message displayed when no components are placed
 */

import React from 'react';

export default function EmptyCanvasMessage() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4 opacity-60">🎨</div>
        <h3 className="text-xl font-semibold mb-2 text-gray-600">Start Creating</h3>
        <p className="text-gray-500 mb-4">
          Open the component palette to add your first component, or switch to code mode to edit HTML directly.
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span>🧩</span>
            <span>Components panel</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-2">
            <span>💻</span>
            <span>Code mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}
