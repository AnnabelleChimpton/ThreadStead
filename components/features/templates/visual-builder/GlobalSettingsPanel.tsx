/**
 * GlobalSettingsPanel Component
 * Phase 3: Global Settings UI
 *
 * Provides template-wide settings that affect the entire template:
 * - Background color and themes
 * - Global typography settings
 * - Container spacing and layout
 * - Theme presets (Light, Dark, Custom)
 */

import React, { useCallback, useState, useMemo } from 'react';
import type { UseCanvasStateResult } from '@/hooks/useCanvasState';
import { PATTERN_PREVIEWS } from '@/lib/templates/visual-builder/background-patterns';

// Background pattern configuration
export interface BackgroundPattern {
  type: 'none' | 'dots' | 'stripes' | 'checkerboard' | 'stars' | 'hearts' |
        'diamonds' | 'waves' | 'grid' | 'confetti' | 'sparkles' | 'bubbles';
  primaryColor: string;
  secondaryColor?: string;
  size: number; // 0.5 to 3
  opacity: number; // 0 to 1
  rotation?: number; // degrees
  animated?: boolean;
}

// Global settings interface
export interface GlobalSettings {
  background: {
    color: string;
    type: 'solid' | 'gradient' | 'pattern';
    gradient?: {
      colors: string[];
      angle: number;
    };
    pattern?: BackgroundPattern;
  };
  typography: {
    fontFamily: string;
    baseSize: string;
    scale: number;
    textShadow?: string;
    letterSpacing?: string;
  };
  spacing: {
    containerPadding: string;
    sectionSpacing: string;
  };
  theme: 'y2k' | 'vaporwave' | 'geocities' | 'cottagecore' |
         'cyberpunk' | 'bubblegum' | 'space' | 'custom';
  effects?: {
    blur?: number;
    borderRadius?: string;
    boxShadow?: string;
    animation?: 'none' | 'fade' | 'slide' | 'zoom';
  };
}

// Default global settings
export const defaultGlobalSettings: GlobalSettings = {
  background: {
    color: '#ffffff',
    type: 'solid'
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    baseSize: '16px',
    scale: 1.25
  },
  spacing: {
    containerPadding: '24px',
    sectionSpacing: '32px'
  },
  theme: 'custom'
};

// Fun theme presets
export const THEME_PRESETS = {
  y2k: {
    name: '🌐 Y2K Cyber',
    description: 'Chrome gradients and tech vibes',
    settings: {
      background: {
        color: '#e0e0e0',
        type: 'pattern' as const,
        pattern: {
          type: 'stars' as const,
          primaryColor: '#c0c0c0',
          size: 0.8,
          opacity: 0.4,
          animated: true
        }
      },
      typography: {
        fontFamily: '"Courier New", monospace',
        baseSize: '16px',
        scale: 1.25,
        textShadow: '2px 2px 4px rgba(0,255,0,0.3)'
      },
      effects: {
        borderRadius: '0',
        boxShadow: 'inset 0 0 20px rgba(0,255,255,0.2)'
      }
    }
  },
  vaporwave: {
    name: '🌴 Vaporwave',
    description: 'Aesthetic pink and purple vibes',
    settings: {
      background: {
        color: '#ff00ff',
        type: 'gradient' as const,
        gradient: {
          colors: ['#ff00ff', '#00ffff', '#ff00ff'],
          angle: 135
        }
      },
      typography: {
        fontFamily: '"Times New Roman", serif',
        baseSize: '18px',
        scale: 1.333,
        textShadow: '3px 3px 6px rgba(255,0,255,0.5)'
      },
      effects: {
        borderRadius: '20px',
        animation: 'fade' as const
      }
    }
  },
  geocities: {
    name: '🏗️ GeoCities Retro',
    description: 'Classic 90s web energy',
    settings: {
      background: {
        color: '#0000ff',
        type: 'pattern' as const,
        pattern: {
          type: 'checkerboard' as const,
          primaryColor: '#ffff00',
          secondaryColor: '#ff00ff',
          size: 1.5,
          opacity: 0.3
        }
      },
      typography: {
        fontFamily: '"Comic Sans MS", cursive',
        baseSize: '16px',
        scale: 1.2
      }
    }
  },
  cottagecore: {
    name: '🌻 Cottagecore',
    description: 'Soft and cozy pastoral vibes',
    settings: {
      background: {
        color: '#fef5e7',
        type: 'pattern' as const,
        pattern: {
          type: 'hearts' as const,
          primaryColor: '#f8bbd0',
          size: 0.6,
          opacity: 0.2
        }
      },
      typography: {
        fontFamily: 'Georgia, serif',
        baseSize: '17px',
        scale: 1.25,
        letterSpacing: '0.5px'
      },
      effects: {
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(139,69,19,0.1)'
      }
    }
  },
  cyberpunk: {
    name: '⚡ Cyberpunk',
    description: 'Neon noir digital rain',
    settings: {
      background: {
        color: '#000000',
        type: 'pattern' as const,
        pattern: {
          type: 'grid' as const,
          primaryColor: '#00ff00',
          size: 1,
          opacity: 0.2,
          animated: true
        }
      },
      typography: {
        fontFamily: 'Menlo, Monaco, monospace',
        baseSize: '15px',
        scale: 1.414,
        textShadow: '0 0 10px #00ff00'
      },
      effects: {
        borderRadius: '0',
        boxShadow: '0 0 30px rgba(0,255,0,0.3)'
      }
    }
  },
  bubblegum: {
    name: '🍬 Bubblegum Pop',
    description: 'Sweet and playful energy',
    settings: {
      background: {
        color: '#ffb3ba',
        type: 'pattern' as const,
        pattern: {
          type: 'bubbles' as const,
          primaryColor: '#ff69b4',
          secondaryColor: '#ff1493',
          size: 1.2,
          opacity: 0.3,
          animated: true
        }
      },
      typography: {
        fontFamily: '"Helvetica Neue", sans-serif',
        baseSize: '16px',
        scale: 1.25
      },
      effects: {
        borderRadius: '25px',
        boxShadow: '0 8px 32px rgba(255,105,180,0.2)'
      }
    }
  },
  space: {
    name: '🚀 Space Explorer',
    description: 'Cosmic depths and stars',
    settings: {
      background: {
        color: '#0a0e27',
        type: 'pattern' as const,
        pattern: {
          type: 'stars' as const,
          primaryColor: '#ffffff',
          secondaryColor: '#ffd700',
          size: 1,
          opacity: 0.8,
          animated: true
        }
      },
      typography: {
        fontFamily: '"Roboto", sans-serif',
        baseSize: '16px',
        scale: 1.333,
        textShadow: '0 0 20px rgba(100,149,237,0.5)'
      },
      effects: {
        borderRadius: '8px',
        boxShadow: '0 0 50px rgba(100,149,237,0.2)',
        animation: 'zoom' as const
      }
    }
  }
};

interface GlobalSettingsPanelProps {
  canvasState: UseCanvasStateResult;
  onGlobalSettingsChange: (settings: GlobalSettings) => void;
  className?: string;
}

// Font family options
const FONT_FAMILIES = [
  { value: 'system-ui, -apple-system, sans-serif', label: 'System Default' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Georgia (Serif)' },
  { value: '"Helvetica Neue", Arial, sans-serif', label: 'Helvetica (Sans)' },
  { value: 'Menlo, Monaco, "Courier New", monospace', label: 'Monospace' },
  { value: '"Inter", sans-serif', label: 'Inter (Modern)' },
  { value: '"Roboto", sans-serif', label: 'Roboto (Google)' }
];

// Typography scale options
const TYPOGRAPHY_SCALES = [
  { value: 1.125, label: 'Minor Second (1.125)' },
  { value: 1.2, label: 'Minor Third (1.2)' },
  { value: 1.25, label: 'Major Third (1.25)' },
  { value: 1.333, label: 'Perfect Fourth (1.333)' },
  { value: 1.414, label: 'Augmented Fourth (1.414)' },
  { value: 1.5, label: 'Perfect Fifth (1.5)' }
];

// Spacing presets
const SPACING_PRESETS = [
  { containerPadding: '16px', sectionSpacing: '24px', label: 'Compact' },
  { containerPadding: '24px', sectionSpacing: '32px', label: 'Default' },
  { containerPadding: '32px', sectionSpacing: '48px', label: 'Comfortable' },
  { containerPadding: '48px', sectionSpacing: '64px', label: 'Spacious' }
];

/**
 * Global Settings Panel Component
 */
const GlobalSettingsPanel = React.memo(function GlobalSettingsPanel({
  canvasState,
  onGlobalSettingsChange,
  className = ''
}: GlobalSettingsPanelProps) {

  // Get current global settings (with fallback to defaults)
  const globalSettings = React.useMemo(
    () => (canvasState as any).globalSettings || defaultGlobalSettings,
    [(canvasState as any).globalSettings]
  );

  // Handle setting updates
  const updateSetting = useCallback((path: string[], value: any) => {
    const newSettings = { ...globalSettings };

    // Navigate to the nested property and update it
    let current = newSettings as any;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;

    onGlobalSettingsChange(newSettings);
  }, [globalSettings, onGlobalSettingsChange]);

  // Apply theme preset
  const applyThemePreset = useCallback((themeKey: keyof typeof THEME_PRESETS | 'custom') => {
    if (themeKey === 'custom') {
      onGlobalSettingsChange({
        ...globalSettings,
        theme: 'custom'
      });
      return;
    }

    const preset = THEME_PRESETS[themeKey];
    const newSettings: GlobalSettings = {
      ...globalSettings,
      ...preset.settings,
      theme: themeKey,
      spacing: (preset.settings as any).spacing || globalSettings.spacing
    };

    onGlobalSettingsChange(newSettings);
  }, [globalSettings, onGlobalSettingsChange]);

  // Update background pattern
  const updatePattern = useCallback((updates: Partial<BackgroundPattern>) => {
    const currentPattern = globalSettings.background?.pattern || {
      type: 'none' as const,
      primaryColor: '#ff69b4',
      size: 1,
      opacity: 0.3
    };

    const newPattern = {
      ...currentPattern,
      ...updates
    };

    // Create a single atomic update that includes both pattern and type
    const newSettings = { ...globalSettings };
    if (!newSettings.background) {
      newSettings.background = {
        color: '#ffffff',
        type: 'solid'
      };
    }

    newSettings.background.pattern = newPattern;

    // Set background type to pattern if a pattern is selected
    if (updates.type && updates.type !== 'none') {
      newSettings.background.type = 'pattern';
    } else if (updates.type === 'none') {
      newSettings.background.type = 'solid';
    }

    onGlobalSettingsChange(newSettings);
  }, [globalSettings, onGlobalSettingsChange]);

  return (
    <div className={`global-settings-panel ${className}`}>

      {/* Fun Theme Presets */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '12px'
        }}>
          🎭 Fun Theme Presets
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {Object.entries(THEME_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyThemePreset(key as keyof typeof THEME_PRESETS)}
              style={{
                padding: '12px',
                background: globalSettings.theme === key ? '#4f46e5' : '#f3f4f6',
                color: globalSettings.theme === key ? 'white' : '#374151',
                border: '2px solid',
                borderColor: globalSettings.theme === key ? '#4338ca' : '#e5e7eb',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onMouseEnter={e => {
                if (globalSettings.theme !== key) {
                  e.currentTarget.style.background = '#e5e7eb';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }
              }}
              onMouseLeave={e => {
                if (globalSettings.theme !== key) {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                {preset.name}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                {preset.description}
              </div>
            </button>
          ))}
          <button
            onClick={() => applyThemePreset('custom')}
            style={{
              padding: '12px',
              background: globalSettings.theme === 'custom' ? '#4f46e5' : '#f3f4f6',
              color: globalSettings.theme === 'custom' ? 'white' : '#374151',
              border: '2px solid',
              borderColor: globalSettings.theme === 'custom' ? '#4338ca' : '#e5e7eb',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left',
              gridColumn: 'span 2'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
              🎨 Custom Theme
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              Create your own unique style
            </div>
          </button>
        </div>
      </div>

      {/* Background Settings */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '12px'
        }}>
          🖼️ Background Style
        </label>

        {/* Background Type Selector */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {(['solid', 'gradient', 'pattern'] as const).map(type => (
              <button
                key={type}
                onClick={() => updateSetting(['background', 'type'], type)}
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '2px solid',
                  borderColor: globalSettings.background.type === type ? '#4f46e5' : '#e5e7eb',
                  borderRadius: '6px',
                  background: globalSettings.background.type === type ? '#eef2ff' : 'white',
                  color: globalSettings.background.type === type ? '#4f46e5' : '#374151',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {type === 'solid' && '🎨'} {type === 'gradient' && '🌈'} {type === 'pattern' && '🔲'} {type}
              </button>
            ))}
          </div>
        </div>

        {/* Solid Color Controls */}
        {globalSettings.background.type === 'solid' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="color"
              value={globalSettings.background.color}
              onChange={(e) => updateSetting(['background', 'color'], e.target.value)}
              style={{
                width: '40px',
                height: '32px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                padding: '2px'
              }}
            />
            <input
              type="text"
              value={globalSettings.background.color}
              onChange={(e) => updateSetting(['background', 'color'], e.target.value)}
              placeholder="#ffffff"
              style={{
                flex: 1,
                padding: '6px 10px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            />
          </div>
        )}

        {/* Pattern Picker */}
        {globalSettings.background.type === 'pattern' && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '12px'
            }}>
              {PATTERN_PREVIEWS.map(pattern => (
                <button
                  key={pattern.type}
                  onClick={() => updatePattern({ type: pattern.type as BackgroundPattern['type'] })}
                  style={{
                    padding: '8px',
                    border: '2px solid',
                    borderColor: globalSettings.background.pattern?.type === pattern.type ? '#4f46e5' : '#e5e7eb',
                    borderRadius: '8px',
                    background: globalSettings.background.pattern?.type === pattern.type ? '#eef2ff' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s'
                  }}
                  title={pattern.description}
                >
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{pattern.label.split(' ')[0]}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280' }}>
                    {pattern.label.split(' ')[1]}
                  </div>
                </button>
              ))}
            </div>

            {/* Pattern Customization */}
            {globalSettings.background.pattern?.type !== 'none' && (
              <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                    Primary Color
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="color"
                      value={globalSettings.background.pattern?.primaryColor || '#ff69b4'}
                      onChange={(e) => updatePattern({ primaryColor: e.target.value })}
                      style={{ width: '32px', height: '24px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                    />
                    <input
                      type="text"
                      value={globalSettings.background.pattern?.primaryColor || '#ff69b4'}
                      onChange={(e) => updatePattern({ primaryColor: e.target.value })}
                      style={{ flex: 1, padding: '2px 6px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '11px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                      Size
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={globalSettings.background.pattern?.size || 1}
                      onChange={(e) => updatePattern({ size: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                      Opacity
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={globalSettings.background.pattern?.opacity || 0.3}
                      onChange={(e) => updatePattern({ opacity: parseFloat(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px' }}>
                  <input
                    type="checkbox"
                    checked={globalSettings.background.pattern?.animated || false}
                    onChange={(e) => updatePattern({ animated: e.target.checked })}
                  />
                  ✨ Animate pattern
                </label>
              </div>
            )}
          </div>
        )}

        {/* Gradient Controls */}
        {globalSettings.background.type === 'gradient' && (
          <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
              🌈 Gradient customization coming soon!
            </div>
          </div>
        )}
      </div>

      {/* Typography Settings */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '12px'
        }}>
          📝 Global Typography
        </label>

        {/* Font Family */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            marginBottom: '4px'
          }}>
            Font Family
          </label>
          <select
            value={globalSettings.typography.fontFamily}
            onChange={(e) => updateSetting(['typography', 'fontFamily'], e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: 'white'
            }}
          >
            {FONT_FAMILIES.map(font => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>

        {/* Base Font Size */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            marginBottom: '4px'
          }}>
            Base Font Size
          </label>
          <select
            value={globalSettings.typography.baseSize}
            onChange={(e) => updateSetting(['typography', 'baseSize'], e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: 'white'
            }}
          >
            <option value="14px">14px - Small</option>
            <option value="16px">16px - Default</option>
            <option value="18px">18px - Large</option>
            <option value="20px">20px - X-Large</option>
          </select>
        </div>

        {/* Typography Scale */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            marginBottom: '4px'
          }}>
            Typography Scale
          </label>
          <select
            value={globalSettings.typography.scale}
            onChange={(e) => updateSetting(['typography', 'scale'], parseFloat(e.target.value))}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              backgroundColor: 'white'
            }}
          >
            {TYPOGRAPHY_SCALES.map(scale => (
              <option key={scale.value} value={scale.value}>
                {scale.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Spacing Settings */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '12px'
        }}>
          📏 Global Spacing
        </label>

        {/* Spacing Presets */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            marginBottom: '6px'
          }}>
            Spacing Presets
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {SPACING_PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => {
                  updateSetting(['spacing', 'containerPadding'], preset.containerPadding);
                  updateSetting(['spacing', 'sectionSpacing'], preset.sectionSpacing);
                }}
                style={{
                  padding: '6px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  backgroundColor:
                    globalSettings.spacing.containerPadding === preset.containerPadding &&
                    globalSettings.spacing.sectionSpacing === preset.sectionSpacing
                      ? '#3b82f6' : 'white',
                  color:
                    globalSettings.spacing.containerPadding === preset.containerPadding &&
                    globalSettings.spacing.sectionSpacing === preset.sectionSpacing
                      ? 'white' : '#374151',
                  fontSize: '11px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Container Padding */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            marginBottom: '4px'
          }}>
            Container Padding
          </label>
          <input
            type="text"
            value={globalSettings.spacing.containerPadding}
            onChange={(e) => updateSetting(['spacing', 'containerPadding'], e.target.value)}
            placeholder="24px"
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          />
        </div>

        {/* Section Spacing */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '500',
            color: '#6b7280',
            marginBottom: '4px'
          }}>
            Section Spacing
          </label>
          <input
            type="text"
            value={globalSettings.spacing.sectionSpacing}
            onChange={(e) => updateSetting(['spacing', 'sectionSpacing'], e.target.value)}
            placeholder="32px"
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          />
        </div>
      </div>

      {/* Reset Button */}
      <div style={{ paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
        <button
          onClick={() => onGlobalSettingsChange(defaultGlobalSettings)}
          style={{
            width: '100%',
            padding: '8px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white',
            color: '#6b7280',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          🔄 Reset to Defaults
        </button>
      </div>
    </div>
  );
});

export default GlobalSettingsPanel;