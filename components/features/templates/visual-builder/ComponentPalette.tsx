/**
 * VISUAL_BUILDER_PROGRESS: Component Palette - Simplified Pixel Homes Pattern
 * Phase 1: Visual Builder Foundation - Native HTML5 Drag/Drop
 */

import React, { useState, useMemo } from 'react';
import type { ComponentItem, UseCanvasStateResult } from '@/hooks/useCanvasState';
import { componentRegistry } from '@/lib/templates/core/template-registry';

interface ComponentPaletteProps {
  canvasState: UseCanvasStateResult;
  className?: string;
}

interface PaletteComponent {
  type: string;
  name: string;
  description?: string;
  icon: string;
  category: string;
}

// Available components for the palette
const AVAILABLE_COMPONENTS: PaletteComponent[] = [
  { type: 'DisplayName', name: 'Display Name', description: 'User display name', icon: '👤', category: 'Basic' },
  { type: 'Bio', name: 'Bio', description: 'User biography', icon: '📝', category: 'Basic' },
  { type: 'ProfilePhoto', name: 'Profile Photo', description: 'User profile picture', icon: '🖼️', category: 'Basic' },
  { type: 'ContactCard', name: 'Contact Card', description: 'Contact information', icon: '📇', category: 'Basic' },
  { type: 'StickyNote', name: 'Sticky Note', description: 'Decorative note', icon: '📝', category: 'Decorative' },
  { type: 'NeonBorder', name: 'Neon Border', description: 'Glowing border effect', icon: '✨', category: 'Effects' },
  { type: 'PolaroidFrame', name: 'Polaroid Frame', description: 'Photo frame style', icon: '📸', category: 'Effects' },
  { type: 'FloatingBadge', name: 'Floating Badge', description: 'Status badge', icon: '🏷️', category: 'Interactive' },
  { type: 'NotificationBell', name: 'Notification Bell', description: 'Bell notification', icon: '🔔', category: 'Interactive' },
];

/**
 * Component palette with native HTML5 drag and drop like pixel homes
 */
export default function ComponentPalette({
  canvasState,
  className = '',
}: ComponentPaletteProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const { startDrag, endDrag } = canvasState;

  // Group components by category
  const categories = useMemo(() => {
    const cats = new Set(['All']);
    AVAILABLE_COMPONENTS.forEach(comp => cats.add(comp.category));
    return Array.from(cats);
  }, []);

  // Filter components by category
  const filteredComponents = useMemo(() => {
    if (selectedCategory === 'All') {
      return AVAILABLE_COMPONENTS;
    }
    return AVAILABLE_COMPONENTS.filter(comp => comp.category === selectedCategory);
  }, [selectedCategory]);

  // Handle drag start like pixel homes
  const handleDragStart = (component: PaletteComponent, event: React.DragEvent) => {

    const componentItem: ComponentItem = {
      id: '', // Will be generated when placed
      type: component.type,
      position: { x: 0, y: 0 }, // Will be set when dropped
      positioningMode: 'grid', // Default to grid mode since it's now the default
      props: {},
    };

    // Set drag data for HTML5 drag and drop
    event.dataTransfer.setData('application/json', JSON.stringify(componentItem));
    event.dataTransfer.effectAllowed = 'copy';

    startDrag(componentItem);
  };

  const handleDragEnd = () => {
    endDrag();
  };

  return (
    <div className={`bg-white border-t border-gray-200 ${className}`}>
      {/* Category tabs */}
      <div className="flex border-b border-gray-200 px-4">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`py-3 px-4 text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Component grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredComponents.map(component => {
            const componentRegistration = componentRegistry.get(component.type);
            const isRegistered = !!componentRegistration;

            return (
              <div
                key={component.type}
                className={`group relative p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                  isRegistered
                    ? 'border-gray-200 hover:border-blue-500 hover:shadow-md cursor-grab active:cursor-grabbing hover:scale-105'
                    : 'border-red-200 bg-red-50 cursor-not-allowed opacity-50'
                }`}
                draggable={isRegistered}
                onDragStart={(e) => isRegistered && handleDragStart(component, e)}
                onDragEnd={handleDragEnd}
                title={isRegistered ? `Drag ${component.name} to canvas` : `${component.name} not available`}
              >
                <div className="flex flex-col items-center space-y-2">
                  {/* Icon */}
                  <div className="text-2xl group-hover:scale-110 transition-transform">
                    {component.icon}
                  </div>

                  {/* Name */}
                  <div className="text-xs font-medium text-gray-700 leading-tight">
                    {component.name}
                  </div>

                  {/* Registration status indicator */}
                  {!isRegistered && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                         title="Component not registered" />
                  )}

                  {/* Hover effect */}
                  {isRegistered && (
                    <div className="absolute inset-0 bg-blue-50 rounded-lg opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredComponents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📦</div>
            <p>No components available in this category</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>Drag components from the palette onto the canvas to add them</span>
        </div>
      </div>
    </div>
  );
}