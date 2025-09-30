/**
 * Template Gallery - Pre-configured template selection for visual builder
 */

import React, { useState } from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  category: 'professional' | 'creative' | 'minimal' | 'social';
  components: ComponentItem[];
  globalSettings?: any;
}

// Pre-configured template presets
const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'professional-1',
    name: 'Professional Profile',
    description: 'Clean and modern professional layout',
    category: 'professional',
    components: [
      {
        id: 'prof-photo-1',
        type: 'ProfilePhoto',
        position: { x: 1, y: 1 },
        positioningMode: 'grid',
        gridPosition: { column: 1, row: 1, span: 2 },
        publicProps: {
          size: 'lg',
          shape: 'circle'
        },
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      },
      {
        id: 'prof-name-1',
        type: 'DisplayName',
        position: { x: 3, y: 1 },
        positioningMode: 'grid',
        gridPosition: { column: 3, row: 1, span: 4 },
        publicProps: {
          as: 'h1',
          fontSize: '32px',
          fontWeight: 'bold'
        },
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      },
      {
        id: 'prof-bio-1',
        type: 'Bio',
        position: { x: 3, y: 2 },
        positioningMode: 'grid',
        gridPosition: { column: 3, row: 2, span: 4 },
        publicProps: {},
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      },
      {
        id: 'prof-follow-1',
        type: 'FollowButton',
        position: { x: 7, y: 1 },
        positioningMode: 'grid',
        gridPosition: { column: 7, row: 1, span: 2 },
        publicProps: {},
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      }
    ]
  },
  {
    id: 'creative-1',
    name: 'Creative Portfolio',
    description: 'Artistic layout with visual emphasis',
    category: 'creative',
    components: [
      {
        id: 'creative-gradient-1',
        type: 'GradientBox',
        position: { x: 1, y: 1 },
        positioningMode: 'grid',
        gridPosition: { column: 1, row: 1, span: 8 },
        publicProps: {
          colors: ['#667eea', '#764ba2'],
          direction: 45,
          children: []
        },
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        },
        children: [
          {
            id: 'creative-photo-1',
            type: 'ProfilePhoto',
            position: { x: 20, y: 20 },
            positioningMode: 'absolute',
            publicProps: {
              size: 'lg',
              shape: 'square'
            },
            visualBuilderState: {
              isSelected: false,
              isLocked: false,
              isHidden: false,
              lastModified: Date.now()
            }
          },
          {
            id: 'creative-name-1',
            type: 'DisplayName',
            position: { x: 20, y: 200 },
            positioningMode: 'absolute',
            publicProps: {
              as: 'h2',
              color: 'white'
            },
            visualBuilderState: {
              isSelected: false,
              isLocked: false,
              isHidden: false,
              lastModified: Date.now()
            }
          }
        ]
      },
      {
        id: 'creative-posts-1',
        type: 'BlogPosts',
        position: { x: 1, y: 2 },
        positioningMode: 'grid',
        gridPosition: { column: 1, row: 2, span: 8 },
        publicProps: {},
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      }
    ]
  },
  {
    id: 'minimal-1',
    name: 'Minimal Design',
    description: 'Simple and clean with focus on content',
    category: 'minimal',
    components: [
      {
        id: 'min-name-1',
        type: 'DisplayName',
        position: { x: 1, y: 1 },
        positioningMode: 'grid',
        gridPosition: { column: 1, row: 1, span: 8 },
        publicProps: {
          as: 'h1',
          fontSize: '48px',
          textAlign: 'center'
        },
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      },
      {
        id: 'min-bio-1',
        type: 'Bio',
        position: { x: 2, y: 2 },
        positioningMode: 'grid',
        gridPosition: { column: 2, row: 2, span: 6 },
        publicProps: {
          textAlign: 'center'
        },
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      },
      {
        id: 'min-photo-1',
        type: 'ProfilePhoto',
        position: { x: 4, y: 3 },
        positioningMode: 'grid',
        gridPosition: { column: 4, row: 3, span: 2 },
        publicProps: {
          size: 'md',
          shape: 'circle'
        },
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      }
    ]
  },
  {
    id: 'social-1',
    name: 'Social Hub',
    description: 'Interactive layout with social features',
    category: 'social',
    components: [
      {
        id: 'social-photo-1',
        type: 'ProfilePhoto',
        position: { x: 1, y: 1 },
        positioningMode: 'grid',
        gridPosition: { column: 1, row: 1, span: 2 },
        publicProps: {
          size: 'md',
          shape: 'circle'
        },
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      },
      {
        id: 'social-name-1',
        type: 'DisplayName',
        position: { x: 3, y: 1 },
        positioningMode: 'grid',
        gridPosition: { column: 3, row: 1, span: 3 },
        publicProps: {},
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      },
      {
        id: 'social-follow-1',
        type: 'FollowButton',
        position: { x: 6, y: 1 },
        positioningMode: 'grid',
        gridPosition: { column: 6, row: 1, span: 2 },
        publicProps: {},
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      },
      {
        id: 'social-friends-1',
        type: 'MutualFriends',
        position: { x: 1, y: 2 },
        positioningMode: 'grid',
        gridPosition: { column: 1, row: 2, span: 4 },
        publicProps: {},
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      },
      {
        id: 'social-guestbook-1',
        type: 'Guestbook',
        position: { x: 5, y: 2 },
        positioningMode: 'grid',
        gridPosition: { column: 5, row: 2, span: 3 },
        publicProps: {},
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      },
      {
        id: 'social-posts-1',
        type: 'BlogPosts',
        position: { x: 1, y: 3 },
        positioningMode: 'grid',
        gridPosition: { column: 1, row: 3, span: 7 },
        publicProps: {},
        visualBuilderState: {
          isSelected: false,
          isLocked: false,
          isHidden: false,
          lastModified: Date.now()
        }
      }
    ]
  }
];

interface TemplateGalleryProps {
  onSelectTemplate: (template: TemplatePreset) => void;
  onClose: () => void;
}

export default function TemplateGallery({ onSelectTemplate, onClose }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const filteredTemplates = TEMPLATE_PRESETS.filter(template =>
    selectedCategory === 'all' || template.category === selectedCategory
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              margin: 0,
              marginBottom: '4px',
            }}>
              Choose a Template
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0,
            }}>
              Start with a pre-configured layout and customize it to your needs
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#f3f4f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            ×
          </button>
        </div>

        {/* Category Filter */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          gap: '12px',
        }}>
          {['all', 'professional', 'creative', 'minimal', 'social'].map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: selectedCategory === category ? '2px solid #3b82f6' : '2px solid transparent',
                backgroundColor: selectedCategory === category ? '#eff6ff' : '#f9fafb',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: selectedCategory === category ? '600' : '500',
                color: selectedCategory === category ? '#3b82f6' : '#6b7280',
                textTransform: 'capitalize',
                transition: 'all 0.2s ease',
              }}
            >
              {category === 'all' ? '🎨 All Templates' :
               category === 'professional' ? '💼 Professional' :
               category === 'creative' ? '🎭 Creative' :
               category === 'minimal' ? '⚪ Minimal' :
               '🌐 Social'}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '20px',
          }}>
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                onMouseEnter={() => setHoveredTemplate(template.id)}
                onMouseLeave={() => setHoveredTemplate(null)}
                style={{
                  borderRadius: '12px',
                  border: hoveredTemplate === template.id ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: hoveredTemplate === template.id ? 'translateY(-2px)' : 'translateY(0)',
                  boxShadow: hoveredTemplate === template.id
                    ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                    : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                }}
              >
                {/* Template Preview */}
                <div style={{
                  height: '150px',
                  backgroundColor: '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Simple visual representation */}
                  <div style={{
                    width: '80%',
                    height: '80%',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    {/* Mock layout based on template components */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                    }}>
                      {template.components.slice(0, 3).map((comp, index) => (
                        <div
                          key={index}
                          style={{
                            width: comp.type === 'ProfilePhoto' ? '24px' : '40px',
                            height: comp.type === 'ProfilePhoto' ? '24px' : '8px',
                            backgroundColor: comp.type === 'ProfilePhoto' ? '#fbbf24' : '#e5e7eb',
                            borderRadius: comp.type === 'ProfilePhoto' ? '50%' : '2px',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px' }} />
                    <div style={{ height: '4px', backgroundColor: '#f3f4f6', borderRadius: '2px', width: '70%' }} />
                  </div>
                </div>

                {/* Template Info */}
                <div style={{
                  padding: '16px',
                  backgroundColor: hoveredTemplate === template.id ? '#f9fafb' : 'white',
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: 0,
                    marginBottom: '4px',
                  }}>
                    {template.name}
                  </h3>
                  <p style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    margin: 0,
                  }}>
                    {template.description}
                  </p>
                  <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#9ca3af',
                  }}>
                    {template.components.length} components
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}