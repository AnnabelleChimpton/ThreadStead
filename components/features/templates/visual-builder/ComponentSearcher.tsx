/**
 * ComponentSearcher - Search-first component picker with smart suggestions
 * Replaces the disjointed component palette with intuitive search and discovery
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { ComponentItem, UseCanvasStateResult } from '@/hooks/useCanvasState';
import { componentRegistry } from '@/lib/templates/core/template-registry';

interface ComponentSearcherProps {
  canvasState: UseCanvasStateResult;
  className?: string;
}

interface ComponentSuggestion {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tags: string[];
  popularity: number;
  isRegistered: boolean;
}

// Enhanced component data with better categorization and search terms
const COMPONENT_DATA: Record<string, Omit<ComponentSuggestion, 'type' | 'isRegistered'>> = {
  // Text & Content
  'TextElement': {
    name: 'Text',
    description: 'Plain text content',
    icon: '📝',
    category: 'Text',
    tags: ['text', 'content', 'paragraph', 'words'],
    popularity: 95
  },
  'Heading': {
    name: 'Heading',
    description: 'Title or section header',
    icon: '📄',
    category: 'Text',
    tags: ['heading', 'title', 'header', 'h1', 'h2', 'h3'],
    popularity: 90
  },
  'Paragraph': {
    name: 'Paragraph',
    description: 'Formatted text paragraph',
    icon: '📃',
    category: 'Text',
    tags: ['paragraph', 'text', 'content', 'body'],
    popularity: 85
  },

  // Profile Components
  'DisplayName': {
    name: 'Display Name',
    description: 'User\'s display name',
    icon: '👤',
    category: 'Profile',
    tags: ['name', 'user', 'profile', 'identity'],
    popularity: 88
  },
  'Bio': {
    name: 'Bio',
    description: 'User biography text',
    icon: '📋',
    category: 'Profile',
    tags: ['bio', 'about', 'description', 'profile'],
    popularity: 75
  },
  'ProfilePhoto': {
    name: 'Profile Photo',
    description: 'User\'s profile picture',
    icon: '🖼️',
    category: 'Profile',
    tags: ['photo', 'image', 'avatar', 'picture', 'profile'],
    popularity: 92
  },
  'ProfileHero': {
    name: 'Profile Hero',
    description: 'Large profile banner section',
    icon: '🎭',
    category: 'Profile',
    tags: ['hero', 'banner', 'header', 'cover'],
    popularity: 70
  },

  // Layout & Structure
  'FlexContainer': {
    name: 'Flex Container',
    description: 'Flexible layout container',
    icon: '📦',
    category: 'Layout',
    tags: ['flex', 'layout', 'container', 'responsive'],
    popularity: 80
  },
  'GridLayout': {
    name: 'Grid Layout',
    description: 'CSS Grid layout system',
    icon: '⬜',
    category: 'Layout',
    tags: ['grid', 'layout', 'columns', 'responsive'],
    popularity: 75
  },
  'CenteredBox': {
    name: 'Centered Box',
    description: 'Center-aligned container',
    icon: '🎯',
    category: 'Layout',
    tags: ['center', 'box', 'container', 'align'],
    popularity: 65
  },

  // Interactive & Social
  'FollowButton': {
    name: 'Follow Button',
    description: 'Social follow/unfollow button',
    icon: '➕',
    category: 'Interactive',
    tags: ['follow', 'button', 'social', 'action'],
    popularity: 60
  },
  'ContactCard': {
    name: 'Contact Card',
    description: 'Contact information display',
    icon: '📇',
    category: 'Contact',
    tags: ['contact', 'card', 'info', 'details'],
    popularity: 70
  },
  'WebsiteDisplay': {
    name: 'Website Link',
    description: 'Website URL display',
    icon: '🌐',
    category: 'Contact',
    tags: ['website', 'link', 'url', 'web'],
    popularity: 55
  },

  // Media & Visual
  'MediaGrid': {
    name: 'Media Grid',
    description: 'Grid of images or media',
    icon: '🖼️',
    category: 'Media',
    tags: ['media', 'grid', 'images', 'gallery'],
    popularity: 68
  },
  'ImageCarousel': {
    name: 'Image Carousel',
    description: 'Scrollable image slider',
    icon: '🎠',
    category: 'Media',
    tags: ['carousel', 'slider', 'images', 'gallery'],
    popularity: 62
  },

  // Effects & Styling
  'GradientBox': {
    name: 'Gradient Box',
    description: 'Container with gradient background',
    icon: '🌈',
    category: 'Effects',
    tags: ['gradient', 'background', 'color', 'effect'],
    popularity: 58
  },
  'NeonBorder': {
    name: 'Neon Border',
    description: 'Glowing neon border effect',
    icon: '✨',
    category: 'Effects',
    tags: ['neon', 'glow', 'border', 'effect'],
    popularity: 45
  },
  'RetroCard': {
    name: 'Retro Card',
    description: 'Vintage-styled card container',
    icon: '🎴',
    category: 'Effects',
    tags: ['retro', 'vintage', 'card', 'style'],
    popularity: 40
  },
  'CRTMonitor': {
    name: 'CRT Monitor',
    description: 'Retro computer monitor with scanlines',
    icon: '📺',
    category: 'Effects',
    tags: ['retro', 'monitor', 'terminal', 'computer', 'crt', 'vintage'],
    popularity: 65
  },
  'NeonSign': {
    name: 'Neon Sign',
    description: 'Animated neon text with authentic glow',
    icon: '💡',
    category: 'Effects',
    tags: ['neon', 'sign', 'glow', 'light', 'retro', 'text'],
    popularity: 70
  },
  'ArcadeButton': {
    name: 'Arcade Button',
    description: 'Chunky retro button with 3D styling',
    icon: '🔴',
    category: 'Interactive',
    tags: ['arcade', 'button', 'retro', 'game', '3d', 'click'],
    popularity: 75
  },
  'PixelArtFrame': {
    name: 'Pixel Art Frame',
    description: '8-bit style borders and containers',
    icon: '🖼️',
    category: 'Layout',
    tags: ['pixel', '8bit', 'frame', 'retro', 'border', 'container'],
    popularity: 60
  },
  'RetroGrid': {
    name: 'Retro Grid',
    description: 'Synthwave/outrun grid backgrounds',
    icon: '🌐',
    category: 'Effects',
    tags: ['synthwave', 'outrun', 'grid', 'background', 'retro', '80s'],
    popularity: 65
  },
};

/**
 * Search-first component picker with intelligent suggestions
 */
export default function ComponentSearcher({
  canvasState,
  className = '',
}: ComponentSearcherProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [recentComponents, setRecentComponents] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { startDrag, endDrag } = canvasState;

  // Get all available components with enhanced data
  const availableComponents = useMemo(() => {
    const registrations = componentRegistry.getAllRegistrations();
    const components: ComponentSuggestion[] = [];

    for (const [type] of registrations) {
      // Skip child components that should only be added through parent components
      const registration = componentRegistry.get(type);
      if (registration?.relationship?.type === 'child') {
        continue;
      }

      const componentData = COMPONENT_DATA[type];
      if (componentData) {
        components.push({
          type,
          isRegistered: true,
          ...componentData,
        });
      } else {
        // Fallback for components not in our enhanced data
        components.push({
          type,
          name: type.replace(/([A-Z])/g, ' $1').trim(),
          description: `${type} component`,
          icon: '🔧',
          category: 'Other',
          tags: [type.toLowerCase()],
          popularity: 30,
          isRegistered: true,
        });
      }
    }

    return components.sort((a, b) => b.popularity - a.popularity);
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(['All']);
    availableComponents.forEach(comp => cats.add(comp.category));
    return Array.from(cats).sort();
  }, [availableComponents]);

  // Filter and search components
  const filteredComponents = useMemo(() => {
    let filtered = availableComponents;

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(comp => comp.category === selectedCategory);
    }

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(comp => {
        return (
          comp.name.toLowerCase().includes(search) ||
          comp.description.toLowerCase().includes(search) ||
          comp.tags.some(tag => tag.includes(search)) ||
          comp.type.toLowerCase().includes(search)
        );
      });

      // Sort by relevance when searching
      filtered = filtered.sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().includes(search) ? 2 : 0;
        const aDescMatch = a.description.toLowerCase().includes(search) ? 1 : 0;
        const bNameMatch = b.name.toLowerCase().includes(search) ? 2 : 0;
        const bDescMatch = b.description.toLowerCase().includes(search) ? 1 : 0;

        const aScore = aNameMatch + aDescMatch + a.popularity / 100;
        const bScore = bNameMatch + bDescMatch + b.popularity / 100;

        return bScore - aScore;
      });
    }

    return filtered;
  }, [availableComponents, selectedCategory, searchTerm]);


  const handleDragEnd = () => {
    endDrag();
  };

  // Focus search on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Ultra-simple drag component - minimal DOM for ghost image creation
  const ComponentCard = ({ component, isRecent = false }: { component: ComponentSuggestion; isRecent?: boolean }) => {
    return (
      <div
        className={`
          p-3 m-1 border rounded text-center transition-all duration-200 ease-out
          ${component.isRegistered
            ? 'border-gray-300 bg-white cursor-grab hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100 hover:-translate-y-1 hover:scale-105'
            : 'border-red-300 bg-red-50 opacity-50 cursor-not-allowed'
          }
        `}
        draggable={component.isRegistered}
        onDragStart={(e) => {
          e.dataTransfer.setData('application/json', JSON.stringify({
            id: '',
            type: component.type,
            position: { x: 0, y: 0 },
            positioningMode: 'grid',
            props: {},
          }));
          e.dataTransfer.effectAllowed = 'copy';
        }}
        onDragEnd={handleDragEnd}
        title={component.isRegistered ? `Drag ${component.name} to canvas` : `${component.name} not available`}
      >
        <div className="text-2xl mb-1">{component.icon}</div>
        <div className="text-xs text-gray-700">{component.name}</div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Search header */}
      <div style={{
        padding: '24px',
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{ marginBottom: '20px' }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#6b7280',
          }}>
            Search and add components to build your template
          </p>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search components... (text, profile, layout, etc.)"
            style={{
              width: '100%',
              padding: '12px 16px 12px 48px',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '16px',
              background: '#fafafa',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor = '#3b82f6';
              (e.target as HTMLInputElement).style.background = 'white';
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor = '#e5e7eb';
              (e.target as HTMLInputElement).style.background = '#fafafa';
            }}
          />
          <div style={{
            position: 'absolute',
            left: '16px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '20px',
            color: '#9ca3af',
          }}>
            🔍
          </div>
        </div>

        {/* Category filters */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: selectedCategory === category ? '#3b82f6' : '#f3f4f6',
                color: selectedCategory === category ? 'white' : '#6b7280',
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== category) {
                  (e.target as HTMLButtonElement).style.background = '#e5e7eb';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== category) {
                  (e.target as HTMLButtonElement).style.background = '#f3f4f6';
                }
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
      }}>
        {/* Recent components */}
        {recentComponents.length > 0 && !searchTerm && selectedCategory === 'All' && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              🕒 Recently Used
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '12px',
            }}>
              {recentComponents.slice(0, 4).map((componentType) => {
                const component = availableComponents.find(c => c.type === componentType);
                return component ? (
                  <ComponentCard key={componentType} component={component} isRecent />
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Results header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151',
          }}>
            {searchTerm ? `Search Results (${filteredComponents.length})` :
             selectedCategory === 'All' ? 'All Components' : `${selectedCategory} Components`}
          </h3>

          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                padding: '4px 8px',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#6b7280',
                cursor: 'pointer',
              }}
            >
              Clear search
            </button>
          )}
        </div>

        {/* Component grid */}
        {filteredComponents.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {filteredComponents.map((component) => (
              <ComponentCard key={component.type} component={component} />
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: '#6b7280',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#374151',
            }}>
              No components found
            </h3>
            <p style={{
              margin: 0,
              fontSize: '14px',
              lineHeight: 1.5,
            }}>
              {searchTerm ?
                `No components match "${searchTerm}". Try a different search term.` :
                `No components available in the ${selectedCategory} category.`}
            </p>
          </div>
        )}
      </div>

      {/* Help footer */}
      <div style={{
        padding: '16px 24px',
        background: '#f9fafb',
        borderTop: '1px solid #e5e7eb',
        fontSize: '13px',
        color: '#6b7280',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}>
          <span>💡</span>
          <span>Drag any component to your canvas to add it</span>
        </div>
      </div>
    </div>
  );
}