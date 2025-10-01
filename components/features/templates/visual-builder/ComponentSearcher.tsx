/**
 * ComponentSearcher - Search-first component picker with smart suggestions
 * Replaces the disjointed component palette with intuitive search and discovery
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { ComponentItem, UseCanvasStateResult } from '@/hooks/useCanvasState';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import { ComponentThumbnailGenerator } from './ComponentThumbnailGenerator';

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
    description: 'CSS Grid layout system (legacy)',
    icon: '⬜',
    category: 'Layout',
    tags: ['grid', 'layout', 'columns', 'responsive'],
    popularity: 60
  },
  'Grid': {
    name: 'CSS Grid',
    description: 'Standard CSS Grid with native properties',
    icon: '▦',
    category: 'Layout',
    tags: ['grid', 'layout', 'css', 'columns', 'rows', 'standardized'],
    popularity: 85
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
  'VHSTape': {
    name: 'VHS Tape',
    description: 'Video content with vintage VHS labeling',
    icon: '📼',
    category: 'Media',
    tags: ['vhs', 'tape', 'video', 'vintage', 'retro', 'cassette', '80s', 'nostalgia'],
    popularity: 65
  },
  'CassetteTape': {
    name: 'Cassette Tape',
    description: 'Audio content with vintage cassette labeling',
    icon: '📼',
    category: 'Media',
    tags: ['cassette', 'tape', 'audio', 'vintage', 'retro', 'music', '80s', 'nostalgia', 'mix'],
    popularity: 64
  },
  'RetroTV': {
    name: 'Retro TV',
    description: 'Old television set container',
    icon: '📺',
    category: 'Layout',
    tags: ['tv', 'television', 'retro', 'crt', 'vintage', 'container', 'frame', '80s'],
    popularity: 63
  },
  'Boombox': {
    name: 'Boombox',
    description: '80s-style music player UI',
    icon: '📻',
    category: 'Media',
    tags: ['boombox', 'radio', 'music', 'player', '80s', 'retro', 'stereo', 'cassette', 'equalizer'],
    popularity: 62
  },
  'MatrixRain': {
    name: 'Matrix Rain',
    description: 'Falling code effect background',
    icon: '🌧️',
    category: 'Effects',
    tags: ['matrix', 'rain', 'code', 'falling', 'background', 'digital', 'cyber', 'effect', 'animation'],
    popularity: 61
  },
  'CustomHTML': {
    name: 'Custom HTML',
    description: 'Insert raw HTML code with full styling control',
    icon: '💻',
    category: 'Advanced',
    tags: ['html', 'custom', 'code', 'raw', 'advanced', 'developer', 'markup'],
    popularity: 75
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('vb-component-favorites');
      if (savedFavorites) {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      }
    } catch (error) {
      console.warn('Failed to load component favorites:', error);
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: Set<string>) => {
    try {
      localStorage.setItem('vb-component-favorites', JSON.stringify(Array.from(newFavorites)));
      setFavorites(newFavorites);
    } catch (error) {
      console.warn('Failed to save component favorites:', error);
    }
  };

  // Toggle component favorite status
  const toggleFavorite = (componentType: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(componentType)) {
      newFavorites.delete(componentType);
    } else {
      newFavorites.add(componentType);
    }
    saveFavorites(newFavorites);
  };

  const { startDrag, endDrag, addComponent } = canvasState;

  // Handle component click - special case for Custom HTML
  const handleComponentClick = (component: ComponentSuggestion) => {
    if (component.type === 'CustomHTML') {
      // Create Custom HTML component immediately with placeholder content
      const customHTMLComponent: ComponentItem = {
        id: `custom_html_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'CustomHTMLElement',
        position: { x: 100, y: 100 },
        positioningMode: 'grid',
        publicProps: {
          content: '<div>Double-click to edit HTML content</div>',
          tagName: 'div',
          className: '',
        },
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      };

      addComponent(customHTMLComponent);

      // Add to recent components
      const newRecent = [component.type, ...recentComponents.filter(id => id !== component.type)].slice(0, 8);
      setRecentComponents(newRecent);
      localStorage.setItem('vb-recent-components', JSON.stringify(newRecent));

      return;
    }
    // For other components, this will be handled by drag/drop
  };

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

  // Enhanced component card with grid/list views and favorites
  const ComponentCard = ({ component, isRecent = false }: { component: ComponentSuggestion; isRecent?: boolean }) => {
    const isAvailable = component.isRegistered;
    const isFavorite = favorites.has(component.type);

    if (viewMode === 'grid') {
      // Grid view: Ultra-compact thumbnail layout
      return (
        <div
          className={`
            p-2 border rounded text-center transition-all duration-200 relative
            ${isRecent ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300' : 'bg-white'}
            ${isAvailable
              ? component.type === 'CustomHTML'
                ? 'border-gray-200 cursor-pointer hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5'
                : 'border-gray-200 cursor-grab hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5'
              : 'border-red-200 bg-red-50 opacity-50 cursor-not-allowed'
            }
          `}
          style={{ minHeight: '100px' }}
          draggable={isAvailable && component.type !== 'CustomHTML'}
          onClick={() => handleComponentClick(component)}
          onDragStart={(e) => {
            if (!isAvailable) return;
            e.dataTransfer.setData('application/json', JSON.stringify({
              id: `${component.type}_${Date.now()}`,
              type: component.type,
              // Position is determined by drop coordinates in handleDrop, not hardcoded here
              positioningMode: 'absolute',
              props: {},
            }));
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onDragEnd={handleDragEnd}
          title={`${component.name} - ${component.description}`}
        >
          {/* Favorite star */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(component.type);
            }}
            className={`
              absolute top-1 right-1 text-xs transition-opacity duration-200 bg-none border-none cursor-pointer p-0.5 rounded
              ${isFavorite ? 'opacity-100' : 'opacity-30 hover:opacity-100'}
            `}
          >
            {isFavorite ? '⭐' : '☆'}
          </button>

          {/* Component thumbnail */}
          <div className="mb-1 flex justify-center">
            <ComponentThumbnailGenerator componentType={component.type} size="small" />
          </div>

          {/* Component name */}
          <div className="text-xs font-medium text-gray-700 leading-tight">
            {component.name}
          </div>
        </div>
      );
    }

    // List view: Compact detailed layout
    return (
      <div
        className={`
          p-3 border rounded transition-all duration-200 relative
          ${isRecent ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300' : 'bg-white'}
          ${isAvailable
            ? component.type === 'CustomHTML'
              ? 'border-gray-200 cursor-pointer hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5'
              : 'border-gray-200 cursor-grab hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5'
            : 'border-red-200 bg-red-50 opacity-50 cursor-not-allowed'
          }
        `}
        draggable={isAvailable && component.type !== 'CustomHTML'}
        onClick={() => handleComponentClick(component)}
        onDragStart={(e) => {
          if (!isAvailable) return;
          e.dataTransfer.setData('application/json', JSON.stringify({
            id: `${component.type}_${Date.now()}`,
            type: component.type,
            // Position is determined by drop coordinates in handleDrop, not hardcoded here
            positioningMode: 'absolute',
            props: {},
          }));
          e.dataTransfer.effectAllowed = 'copy';
        }}
        onDragEnd={handleDragEnd}
        title={`${component.name} - ${component.description}`}
      >
        {/* Favorite star */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(component.type);
          }}
          className={`
            absolute top-3 right-3 text-base transition-opacity duration-200 bg-none border-none cursor-pointer p-1 rounded
            ${isFavorite ? 'opacity-100' : 'opacity-30 hover:opacity-100'}
          `}
        >
          {isFavorite ? '⭐' : '☆'}
        </button>

        <div className="flex items-center gap-3">
          {/* Icon or thumbnail */}
          <div className="text-2xl">{component.icon}</div>

          {/* Component info */}
          <div className="flex-1">
            <div className="font-semibold text-sm text-gray-800 mb-1">
              {component.name}
            </div>
            <div className="text-xs text-gray-600 leading-relaxed">
              {component.description}
            </div>
            <div className="mt-1 flex gap-1 flex-wrap">
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                {component.category}
              </span>
              {component.type === 'CustomHTML' && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                  Click to add
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Compact search header */}
      <div style={{
        padding: '12px',
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      }}>
        {/* Search input with inline view toggle */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          marginBottom: searchTerm || selectedCategory !== 'All' ? '8px' : '0'
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search components..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
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
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '16px',
              color: '#9ca3af',
            }}>
              🔍
            </div>
          </div>

          {/* Compact view toggle */}
          <div style={{
            display: 'flex',
            gap: '2px',
            background: '#f3f4f6',
            borderRadius: '6px',
            padding: '2px',
          }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '4px 6px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: viewMode === 'list' ? '#3b82f6' : 'transparent',
                color: viewMode === 'list' ? 'white' : '#6b7280',
              }}
              title="List view"
            >
              📝
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '4px 6px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: viewMode === 'grid' ? '#3b82f6' : 'transparent',
                color: viewMode === 'grid' ? 'white' : '#6b7280',
              }}
              title="Grid view"
            >
              ⊞
            </button>
          </div>
        </div>

        {/* Category filters - only show when searching or non-All selected */}
        {(searchTerm || selectedCategory !== 'All') && (
          <div style={{
            display: 'flex',
            gap: '4px',
            flexWrap: 'wrap',
          }}>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  padding: '3px 8px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
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
        )}
      </div>

      {/* Compact content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
      }}>
        {/* Favorites section */}
        {favorites.size > 0 && !searchTerm && selectedCategory === 'All' && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              ⭐ Favorites
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: viewMode === 'grid'
                ? 'repeat(auto-fill, minmax(120px, 1fr))'
                : 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: viewMode === 'grid' ? '8px' : '12px',
            }}>
              {Array.from(favorites).slice(0, 8).map((componentType) => {
                const component = availableComponents.find(c => c.type === componentType);
                return component ? (
                  <ComponentCard key={componentType} component={component} isRecent />
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Recent components */}
        {recentComponents.length > 0 && !searchTerm && selectedCategory === 'All' && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              🕒 Recent
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: viewMode === 'grid'
                ? 'repeat(auto-fill, minmax(120px, 1fr))'
                : 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: viewMode === 'grid' ? '8px' : '12px',
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

        {/* Compact results header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
          }}>
            {searchTerm ? `🔍 Results (${filteredComponents.length})` :
             selectedCategory === 'All' ? 'All Components' : `📂 ${selectedCategory} (${filteredComponents.length})`}
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
            gridTemplateColumns: viewMode === 'grid'
              ? 'repeat(auto-fill, minmax(120px, 1fr))'
              : 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: viewMode === 'grid' ? '8px' : '12px',
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