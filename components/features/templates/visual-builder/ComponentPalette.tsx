/**
 * VISUAL_BUILDER_PROGRESS: Component Palette - Simplified Pixel Homes Pattern
 * Phase 1: Visual Builder Foundation - Native HTML5 Drag/Drop
 */

import React, { useState, useMemo } from 'react';
import type { ComponentItem, UseCanvasStateResult } from '@/hooks/useCanvasState';
import { componentRegistry, type ComponentRegistration } from '@/lib/templates/core/template-registry';

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

// Component icons mapping for visual palette
const COMPONENT_ICONS: Record<string, string> = {
  // Basic components
  'DisplayName': '👤',
  'Bio': '📝',
  'ProfilePhoto': '🖼️',
  'ProfileHero': '🎭',
  'ProfileHeader': '📋',
  'UserImage': '🖼️',
  'UserAccount': '👤',

  // Contact & Social
  'ContactCard': '📇',
  'ContactMethod': '📞',
  'MutualFriends': '👥',
  'FriendBadge': '🏷️',
  'FriendDisplay': '👥',
  'FollowButton': '➕',
  'WebsiteDisplay': '🌐',

  // Layout containers
  'FlexContainer': '📦',
  'GridLayout': '⬜',
  'SplitLayout': '📱',
  'CenteredBox': '🎯',
  'Tabs': '📂',
  'Tab': '📄',

  // Media & Content
  'MediaGrid': '🖼️',
  'ImageCarousel': '🎠',
  'CarouselImage': '🖼️',
  'BlogPosts': '📰',
  'Guestbook': '📖',

  // Interactive
  'NotificationBell': '🔔',
  'NotificationCenter': '📬',
  'FloatingBadge': '🏷️',
  'RevealBox': '🎁',

  // Decorative & Effects
  'StickyNote': '📝',
  'NeonBorder': '✨',
  'RetroTerminal': '💻',
  'PolaroidFrame': '📸',
  'GradientBox': '🌈',
  'RetroCard': '🎴',

  // Text Effects
  'WaveText': '🌊',
  'GlitchText': '⚡',

  // Data Visualization
  'ProgressTracker': '📊',
  'ProgressItem': '📈',
  'SkillChart': '🎯',
  'Skill': '⭐',
  'ProfileBadges': '🏆',

  // Navigation
  'Breadcrumb': '🍞',
  'SiteBranding': '🏷️',

  // Conditional
  'Show': '👁️',
  'Choose': '🤔',
  'When': '❓',
  'Otherwise': '🔄',
  'IfOwner': '🔒',
  'IfVisitor': '👀',
};

// Component category mapping based on functionality
const COMPONENT_CATEGORIES: Record<string, string> = {
  // Basic Profile Components
  'DisplayName': 'Profile',
  'Bio': 'Profile',
  'ProfilePhoto': 'Profile',
  'ProfileHero': 'Profile',
  'ProfileHeader': 'Profile',
  'UserImage': 'Profile',
  'UserAccount': 'Profile',
  'ProfileBadges': 'Profile',

  // Contact & Social
  'ContactCard': 'Contact',
  'ContactMethod': 'Contact',
  'MutualFriends': 'Social',
  'FriendBadge': 'Social',
  'FriendDisplay': 'Social',
  'FollowButton': 'Social',
  'WebsiteDisplay': 'Contact',

  // Layout & Structure
  'FlexContainer': 'Layout',
  'GridLayout': 'Layout',
  'SplitLayout': 'Layout',
  'CenteredBox': 'Layout',
  'Tabs': 'Layout',
  'Tab': 'Layout',

  // Media & Content
  'MediaGrid': 'Media',
  'ImageCarousel': 'Media',
  'CarouselImage': 'Media',
  'BlogPosts': 'Content',
  'Guestbook': 'Content',

  // Interactive Elements
  'NotificationBell': 'Interactive',
  'NotificationCenter': 'Interactive',
  'FloatingBadge': 'Interactive',
  'RevealBox': 'Interactive',

  // Visual Effects
  'StickyNote': 'Effects',
  'NeonBorder': 'Effects',
  'RetroTerminal': 'Effects',
  'PolaroidFrame': 'Effects',
  'GradientBox': 'Effects',
  'RetroCard': 'Effects',
  'WaveText': 'Effects',
  'GlitchText': 'Effects',

  // Data & Analytics
  'ProgressTracker': 'Data',
  'ProgressItem': 'Data',
  'SkillChart': 'Data',
  'Skill': 'Data',

  // Navigation
  'Breadcrumb': 'Navigation',
  'SiteBranding': 'Navigation',

  // Conditional Rendering
  'Show': 'Conditional',
  'Choose': 'Conditional',
  'When': 'Conditional',
  'Otherwise': 'Conditional',
  'IfOwner': 'Conditional',
  'IfVisitor': 'Conditional',
};

// Generate component list from registry
function getAvailableComponents(): PaletteComponent[] {
  const registrations = componentRegistry.getAllRegistrations();
  const components: PaletteComponent[] = [];

  for (const [name, registration] of registrations) {
    // Skip child components that should only be added through parent components
    if (registration.relationship?.type === 'child') {
      continue;
    }

    components.push({
      type: name,
      name: name.replace(/([A-Z])/g, ' $1').trim(), // Convert CamelCase to readable name
      description: `${name} component`,
      icon: COMPONENT_ICONS[name] || '🔧',
      category: COMPONENT_CATEGORIES[name] || 'Other'
    });
  }

  return components.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Component palette with native HTML5 drag and drop like pixel homes
 */
export default function ComponentPalette({
  canvasState,
  className = '',
}: ComponentPaletteProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const { startDrag, endDrag } = canvasState;

  // Get components from registry
  const availableComponents = useMemo(() => getAvailableComponents(), []);

  // Group components by category
  const categories = useMemo(() => {
    const cats = new Set(['All']);
    availableComponents.forEach(comp => cats.add(comp.category));
    return Array.from(cats).sort();
  }, [availableComponents]);

  // Filter components by category
  const filteredComponents = useMemo(() => {
    if (selectedCategory === 'All') {
      return availableComponents;
    }
    return availableComponents.filter(comp => comp.category === selectedCategory);
  }, [selectedCategory, availableComponents]);

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