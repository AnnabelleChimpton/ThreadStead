/**
 * Property Presets - Quick styling combinations for components
 */

import React, { useState } from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  category: 'colors' | 'typography' | 'layout' | 'effects';
  icon: string;
  props: Record<string, any>;
  compatibleTypes?: string[]; // If specified, only show for these component types
}

const STYLE_PRESETS: StylePreset[] = [
  // Color presets
  {
    id: 'primary-blue',
    name: 'Primary Blue',
    description: 'Blue color scheme with white text',
    category: 'colors',
    icon: '🔵',
    props: {
      backgroundColor: '#3b82f6',
      textColor: '#ffffff',
      borderColor: '#2563eb',
    },
  },
  {
    id: 'success-green',
    name: 'Success Green',
    description: 'Green success styling',
    category: 'colors',
    icon: '🟢',
    props: {
      backgroundColor: '#10b981',
      textColor: '#ffffff',
      borderColor: '#059669',
    },
  },
  {
    id: 'warning-yellow',
    name: 'Warning Yellow',
    description: 'Yellow warning styling',
    category: 'colors',
    icon: '🟡',
    props: {
      backgroundColor: '#f59e0b',
      textColor: '#ffffff',
      borderColor: '#d97706',
    },
  },
  {
    id: 'danger-red',
    name: 'Danger Red',
    description: 'Red danger styling',
    category: 'colors',
    icon: '🔴',
    props: {
      backgroundColor: '#ef4444',
      textColor: '#ffffff',
      borderColor: '#dc2626',
    },
  },
  {
    id: 'neutral-gray',
    name: 'Neutral Gray',
    description: 'Subtle gray styling',
    category: 'colors',
    icon: '⚪',
    props: {
      backgroundColor: '#6b7280',
      textColor: '#ffffff',
      borderColor: '#4b5563',
    },
  },

  // Typography presets
  {
    id: 'heading-large',
    name: 'Large Heading',
    description: 'Bold large heading style',
    category: 'typography',
    icon: '📝',
    props: {
      fontSize: '32px',
      fontWeight: 'bold',
      textAlign: 'left',
    },
    compatibleTypes: ['DisplayName', 'Bio'],
  },
  {
    id: 'heading-medium',
    name: 'Medium Heading',
    description: 'Medium heading style',
    category: 'typography',
    icon: '📄',
    props: {
      fontSize: '24px',
      fontWeight: '600',
      textAlign: 'left',
    },
    compatibleTypes: ['DisplayName', 'Bio'],
  },
  {
    id: 'body-text',
    name: 'Body Text',
    description: 'Regular body text',
    category: 'typography',
    icon: '📰',
    props: {
      fontSize: '16px',
      fontWeight: 'normal',
      textAlign: 'left',
    },
    compatibleTypes: ['Bio', 'BlogPosts'],
  },
  {
    id: 'small-text',
    name: 'Small Text',
    description: 'Small supporting text',
    category: 'typography',
    icon: '🔤',
    props: {
      fontSize: '14px',
      fontWeight: 'normal',
      textAlign: 'left',
    },
  },

  // Layout presets
  {
    id: 'card-style',
    name: 'Card Style',
    description: 'Card with shadow and padding',
    category: 'layout',
    icon: '🎴',
    props: {
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      borderWidth: '1px',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
  },
  {
    id: 'button-style',
    name: 'Button Style',
    description: 'Interactive button styling',
    category: 'layout',
    icon: '🔘',
    props: {
      backgroundColor: '#3b82f6',
      textColor: '#ffffff',
      borderRadius: '6px',
      padding: '8px 16px',
      fontWeight: '500',
      cursor: 'pointer',
    },
    compatibleTypes: ['FollowButton'],
  },
  {
    id: 'rounded-corners',
    name: 'Rounded Corners',
    description: 'Soft rounded corners',
    category: 'layout',
    icon: '🔲',
    props: {
      borderRadius: '12px',
    },
  },

  // Effects presets
  {
    id: 'subtle-shadow',
    name: 'Subtle Shadow',
    description: 'Light drop shadow',
    category: 'effects',
    icon: '💫',
    props: {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
  },
  {
    id: 'medium-shadow',
    name: 'Medium Shadow',
    description: 'Medium drop shadow',
    category: 'effects',
    icon: '🌟',
    props: {
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
  },
  {
    id: 'large-shadow',
    name: 'Large Shadow',
    description: 'Prominent drop shadow',
    category: 'effects',
    icon: '✨',
    props: {
      boxShadow: '0 10px 15px rgba(0, 0, 0, 0.1)',
    },
  },
];

interface PropertyPresetsProps {
  selectedComponent: ComponentItem | null;
  onApplyPreset: (props: Record<string, any>) => void;
  className?: string;
}

export default function PropertyPresets({
  selectedComponent,
  onApplyPreset,
  className = '',
}: PropertyPresetsProps) {
  const [activeCategory, setActiveCategory] = useState<string>('colors');
  const [copiedStyle, setCopiedStyle] = useState<Record<string, any> | null>(null);

  if (!selectedComponent) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <div className="text-gray-400 mb-2">🎨</div>
        <p className="text-sm">Select a component to see style presets</p>
      </div>
    );
  }

  // Filter presets by component compatibility
  const availablePresets = STYLE_PRESETS.filter(preset => {
    if (!preset.compatibleTypes) return true; // Show for all components
    return preset.compatibleTypes.includes(selectedComponent.type);
  });

  const categories = [
    { id: 'colors', name: 'Colors', icon: '🎨' },
    { id: 'typography', name: 'Text', icon: '📝' },
    { id: 'layout', name: 'Layout', icon: '📐' },
    { id: 'effects', name: 'Effects', icon: '✨' },
  ];

  const filteredPresets = availablePresets.filter(preset => preset.category === activeCategory);

  const handleCopyStyle = () => {
    if (selectedComponent && selectedComponent.props) {
      // Copy relevant style properties
      const styleProps = {
        backgroundColor: selectedComponent.props.backgroundColor,
        textColor: selectedComponent.props.textColor,
        borderColor: selectedComponent.props.borderColor,
        fontSize: selectedComponent.props.fontSize,
        fontWeight: selectedComponent.props.fontWeight,
        textAlign: selectedComponent.props.textAlign,
        borderRadius: selectedComponent.props.borderRadius,
        padding: selectedComponent.props.padding,
        boxShadow: selectedComponent.props.boxShadow,
      };

      // Filter out undefined values
      const cleanedProps = Object.fromEntries(
        Object.entries(styleProps).filter(([_, value]) => value !== undefined)
      );

      setCopiedStyle(cleanedProps);
    }
  };

  const handlePasteStyle = () => {
    if (copiedStyle) {
      onApplyPreset(copiedStyle);
    }
  };

  return (
    <div className={`bg-white ${className}`}>
      {/* Header with copy/paste */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-sm">Quick Styles</h3>
          <div className="flex gap-1">
            <button
              onClick={handleCopyStyle}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              title="Copy current styling"
            >
              📋 Copy
            </button>
            <button
              onClick={handlePasteStyle}
              disabled={!copiedStyle}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                copiedStyle
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title="Paste copied styling"
            >
              📄 Paste
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                activeCategory === category.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Presets grid */}
      <div className="p-3">
        {filteredPresets.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <div className="text-gray-400 mb-2">😔</div>
            <p className="text-sm">No {activeCategory} presets available for {selectedComponent.type}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => onApplyPreset(preset.props)}
                className="p-2 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group text-left"
                title={preset.description}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{preset.icon}</span>
                  <span className="font-medium text-sm text-gray-900 truncate">{preset.name}</span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{preset.description}</p>

                {/* Preview of main properties */}
                {preset.category === 'colors' && (
                  <div className="flex gap-1 mt-2">
                    {preset.props.backgroundColor && (
                      <div
                        className="w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: preset.props.backgroundColor }}
                      />
                    )}
                    {preset.props.textColor && (
                      <div
                        className="w-4 h-4 rounded border border-gray-300"
                        style={{ backgroundColor: preset.props.textColor }}
                      />
                    )}
                  </div>
                )}

                {preset.category === 'typography' && (
                  <div className="mt-1 text-xs text-gray-600" style={{
                    fontSize: preset.props.fontSize || '12px',
                    fontWeight: preset.props.fontWeight || 'normal'
                  }}>
                    Aa
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick access to common combinations */}
      <div className="p-3 border-t border-gray-200">
        <h4 className="font-medium text-xs text-gray-700 mb-2">Quick Actions</h4>
        <div className="flex gap-1">
          <button
            onClick={() => onApplyPreset({ backgroundColor: '', textColor: '', borderColor: '' })}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            title="Clear all colors"
          >
            🧹 Clear Colors
          </button>
          <button
            onClick={() => onApplyPreset({ fontSize: '16px', fontWeight: 'normal' })}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            title="Reset typography"
          >
            📝 Reset Text
          </button>
        </div>
      </div>
    </div>
  );
}