/**
 * Modern Property Panel - Visual, tabbed property editor
 * Replaces technical forms with intuitive visual controls
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { ComponentItem, UseCanvasStateResult } from '@/hooks/useCanvasState';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import { getDisplayValueForStyleProp } from '@/lib/templates/visual-builder/universal-styling';
import {
  getCurrentBreakpoint,
  type GridBreakpoint
} from '@/lib/templates/visual-builder/grid-utils';
import PropertyPresets from './PropertyPresets';
import {
  ColorEditor,
  SliderEditor,
  ToggleEditor,
  SelectEditor,
  TextEditor,
  TextAreaEditor,
  SpacingEditor,
} from './VisualPropertyControls';
import {
  CSSLengthEditor,
  CSSColorEditor,
  CSSFlexboxEditor,
  CSSBoxShadowEditor,
  CSS_SUGGESTIONS
} from './CSSPropertyEditors';
import StyleControls from './StyleControls';
import StyleErrorBoundary from './StyleErrorBoundary';

// Utility function for debouncing
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}


export type ResponsiveBreakpoint = 'desktop' | 'tablet' | 'mobile';

interface PropertyPanelProps {
  selectedComponent: ComponentItem | null;
  canvasState: {
    gridConfig: UseCanvasStateResult['gridConfig'];
    globalSettings: UseCanvasStateResult['globalSettings'];
    removeComponent: (componentId: string) => void;
    // PHASE 4.2: Responsive positioning methods
    updateResponsivePosition?: UseCanvasStateResult['updateResponsivePosition'];
    getEffectivePosition?: UseCanvasStateResult['getEffectivePosition'];
    copyPositionToBreakpoint?: UseCanvasStateResult['copyPositionToBreakpoint'];
  };
  onComponentUpdate: (componentId: string, updates: Partial<ComponentItem>) => void;
  className?: string;
  style?: React.CSSProperties;
  // PHASE 4.2: Active breakpoint for responsive editing
  activeBreakpoint?: ResponsiveBreakpoint;
}

// Tab definitions for property organization
type PropertyTab = 'component' | 'style' | 'layout' | 'content' | 'advanced' | 'presets';

interface TabDefinition {
  id: PropertyTab;
  label: string;
  icon: string;
  description: string;
}

/**
 * Modern Property Panel with visual controls and smart organization
 */
function PropertyPanel({
  selectedComponent,
  canvasState,
  onComponentUpdate,
  className = '',
  style = {},
  activeBreakpoint = 'desktop',
}: PropertyPanelProps) {
  // Add styles to document head for scrollbar and animations
  React.useEffect(() => {
    const styleId = 'property-panel-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .properties-panel-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .properties-panel-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .properties-panel-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        .properties-panel-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      // Cleanup on unmount
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);
  const [activeTab, setActiveTab] = useState<PropertyTab>('component');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['visual-styling', 'advanced-css', 'flexbox']));
  const { gridConfig } = canvasState;

  // Success feedback state
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Optimistic updates state to prevent flashing
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, any>>({});

  // Removed problematic useEffect that was causing infinite rerenders

  // EMERGENCY FIX: Simplified property reading - no complex dependency loops
  const getComponentProperty = useCallback((component: ComponentItem, key: string): any => {
    // Check optimistic updates first
    if (optimisticUpdates[key] !== undefined) {
      return optimisticUpdates[key];
    }

    // Simple strategy: Check the specific property exists in either structure
    // Try legacy props first, then publicProps as fallback
    if (component.props && component.props[key] !== undefined) {
      return component.props[key];
    }

    if (component.publicProps && (component.publicProps as any)[key] !== undefined) {
      return (component.publicProps as any)[key];
    }

    return undefined;
  }, [optimisticUpdates]);

  // Debounced update ref - persists across renders
  const debouncedUpdateRef = useRef<ReturnType<typeof debounce> | undefined>(undefined);

  // Create debounced update function once
  useEffect(() => {
    debouncedUpdateRef.current = debounce((componentId: string, targetLocation: 'props' | 'publicProps', key: string, value: any, isCSSProperty: boolean, componentType: string) => {
      const updates = targetLocation === 'props'
        ? { props: { ...selectedComponent?.props, [key]: value } }
        : { publicProps: { ...selectedComponent?.publicProps, [key]: value } };

      onComponentUpdate(componentId, updates);

      // Debug: Confirm update was called
      if (isCSSProperty) {
        console.log(`✅ [PropertyPanel] onComponentUpdate CALLED (debounced) for ${componentType}:`, {
          componentId,
          targetLocation,
          updates
        });
      }
    }, 150); // 150ms debounce to prevent rapid re-renders
  }, [onComponentUpdate, selectedComponent?.props, selectedComponent?.publicProps]);

  // EMERGENCY FIX: Simplified property update - no complex routing logic
  const updatePropertyStable = useCallback((key: string, value: any) => {
    if (!selectedComponent) {
      return;
    }

    // Immediately apply optimistic update for instant feedback (NO FLASHING!)
    setOptimisticUpdates(prev => ({ ...prev, [key]: value }));

    // Define CSS properties that should be routed properly
    const cssProperties = [
      'backgroundColor', 'color', 'textColor', 'borderColor', 'accentColor',
      'fontSize', 'fontFamily', 'fontWeight', 'textAlign', 'lineHeight',
      'padding', 'margin', 'border', 'borderRadius', 'borderWidth', 'boxShadow',
      'opacity', 'position', 'top', 'right', 'bottom', 'left', 'width', 'height',
      'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'zIndex', 'display',
      'flexDirection', 'justifyContent', 'alignItems', 'gap', 'customCSS',
      'gridTemplateColumns', 'gridTemplateRows', 'gridColumnGap', 'gridRowGap',
      'justifyItems'
    ];

    // Check if this is a CSS property
    const isCSSProperty = cssProperties.includes(key);

    // Determine component type: Check if component truly uses new standardized structure
    // Only consider a component standardized if it actually uses the CSS system properly
    const knownStandardizedComponents = ['FlexContainer', 'GridLayout', 'Paragraph'];
    const isStandardizedComponent = knownStandardizedComponents.includes(selectedComponent.type);

    // CRITICAL FIX: If component has publicProps, we should update publicProps for CSS properties
    // This ensures HTML generation (which merges props + publicProps) gets the latest values
    const hasPublicProps = selectedComponent.publicProps && Object.keys(selectedComponent.publicProps).length > 0;

    let targetLocation: 'props' | 'publicProps';

    if (isCSSProperty) {
      // CSS properties routing strategy:
      if (isStandardizedComponent || hasPublicProps) {
        // Standardized components OR components with publicProps: CSS props go to publicProps
        // This ensures HTML generation picks up the latest CSS values
        targetLocation = 'publicProps';
      } else {
        // Legacy components without publicProps: CSS props go to props
        targetLocation = 'props';
      }
    } else {
      // Non-CSS properties: Use existing logic (check where property already exists)
      if (selectedComponent.props && selectedComponent.props[key] !== undefined) {
        targetLocation = 'props';
      } else {
        targetLocation = 'publicProps';
      }
    }

    // Enhanced debug logging for CSS property routing
    if (isCSSProperty) {
      console.log(`🎨 [PropertyPanel] CSS Property Update (optimistic):`, {
        property: key,
        value: value,
        componentType: selectedComponent.type,
        isStandardized: isStandardizedComponent,
        routingTo: targetLocation,
        componentId: selectedComponent.id,
        currentProps: selectedComponent.props ? Object.keys(selectedComponent.props) : [],
        currentPublicProps: selectedComponent.publicProps ? Object.keys(selectedComponent.publicProps) : [],
        hasVisualBuilderState: !!selectedComponent.visualBuilderState
      });
    }

    // Debounced actual update (prevents flashing!)
    if (debouncedUpdateRef.current) {
      debouncedUpdateRef.current(
        selectedComponent.id,
        targetLocation,
        key,
        value,
        isCSSProperty,
        selectedComponent.type
      );
    }

    // Show success feedback
    setSuccessFeedback(key);
    setTimeout(() => setSuccessFeedback(null), 1000);
  }, [selectedComponent]);

  // Handle flexbox property updates efficiently
  const handleFlexPropsChange = useCallback((flexProps: {
    flexDirection?: string;
    justifyContent?: string;
    alignItems?: string;
    gap?: string;
  }) => {
    // Update multiple properties at once
    Object.entries(flexProps).forEach(([key, value]) => {
      if (value !== undefined) {
        updatePropertyStable(key, value);
      }
    });
  }, [updatePropertyStable]);

  // EMERGENCY FIX: Simplified display values - no circular dependencies, direct property access
  const displayValues = useMemo(() => {
    if (!selectedComponent) return {
      backgroundColor: '', textColor: '', borderColor: '', accentColor: '',
      fontSize: '', fontWeight: '', textAlign: '', opacity: '',
      borderRadius: '', borderWidth: '', padding: '', margin: '', customCSS: '',
      boxShadow: ''
    };

    // Direct property access with simple fallback logic
    const getValue = (key: string, fallbackKey?: string) => {
      // Check optimistic updates first
      if (optimisticUpdates[key] !== undefined) {
        return optimisticUpdates[key];
      }

      // Try legacy props first
      if (selectedComponent.props && selectedComponent.props[key] !== undefined) {
        return selectedComponent.props[key];
      }

      // Try fallback key in legacy props
      if (fallbackKey && selectedComponent.props && selectedComponent.props[fallbackKey] !== undefined) {
        return selectedComponent.props[fallbackKey];
      }

      // Try publicProps
      if (selectedComponent.publicProps && (selectedComponent.publicProps as any)[key] !== undefined) {
        return (selectedComponent.publicProps as any)[key];
      }

      // Try fallback key in publicProps
      if (fallbackKey && selectedComponent.publicProps && (selectedComponent.publicProps as any)[fallbackKey] !== undefined) {
        return (selectedComponent.publicProps as any)[fallbackKey];
      }

      return '';
    };

    return {
      backgroundColor: getDisplayValueForStyleProp({ backgroundColor: getValue('backgroundColor', 'backgroundcolor') }, 'backgroundColor'),
      textColor: getDisplayValueForStyleProp({ textColor: getValue('textColor', 'color') }, 'textColor'),
      borderColor: getDisplayValueForStyleProp({ borderColor: getValue('borderColor', 'bordercolor') }, 'borderColor'),
      accentColor: getDisplayValueForStyleProp({ accentColor: getValue('accentColor') }, 'accentColor'),
      fontSize: getDisplayValueForStyleProp({ fontSize: getValue('fontSize', 'fontsize') }, 'fontSize'),
      fontWeight: getDisplayValueForStyleProp({ fontWeight: getValue('fontWeight', 'fontweight') }, 'fontWeight'),
      textAlign: getDisplayValueForStyleProp({ textAlign: getValue('textAlign', 'textalign') }, 'textAlign'),
      opacity: getDisplayValueForStyleProp({ opacity: getValue('opacity') }, 'opacity'),
      borderRadius: getDisplayValueForStyleProp({ borderRadius: getValue('borderRadius', 'borderradius') }, 'borderRadius'),
      borderWidth: getDisplayValueForStyleProp({ borderWidth: getValue('borderWidth') }, 'borderWidth'),
      padding: getDisplayValueForStyleProp({ padding: getValue('padding') }, 'padding'),
      margin: getDisplayValueForStyleProp({ margin: getValue('margin') }, 'margin'),
      customCSS: getDisplayValueForStyleProp({ customCSS: getValue('customCSS') }, 'customCSS'),
      boxShadow: getDisplayValueForStyleProp({ boxShadow: getValue('boxShadow') }, 'boxShadow')
    };
  }, [selectedComponent, optimisticUpdates]);

  // Tab definitions
  const tabs: TabDefinition[] = [
    {
      id: 'component',
      label: 'Component',
      icon: '🧩',
      description: 'Content and behavior settings'
    },
    {
      id: 'style',
      label: 'Style',
      icon: '🎨',
      description: 'Universal visual styling (colors, fonts, effects)'
    },
    {
      id: 'layout',
      label: 'Layout',
      icon: '📐',
      description: 'Position, size, and alignment'
    },
    {
      id: 'content',
      label: 'Content',
      icon: '📝',
      description: 'Text content and editable data'
    },
    {
      id: 'advanced',
      label: 'Advanced',
      icon: '⚙️',
      description: 'Technical properties and overrides'
    },
    {
      id: 'presets',
      label: 'Presets',
      icon: '🎨',
      description: 'Quick styling combinations and templates'
    },
  ];

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'component':
        return renderComponentTab();
      case 'style':
        return renderStyleTab();
      case 'presets':
        return (
          <PropertyPresets
            selectedComponent={selectedComponent}
            onApplyPreset={(presetProps) => {
              if (!selectedComponent) return;
              Object.entries(presetProps).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                  updatePropertyStable(key, value);
                }
              });
            }}
          />
        );
      case 'layout':
        return renderLayoutTab();
      case 'content':
        return renderContentTab();
      case 'advanced':
        return renderAdvancedTab();
      default:
        return null;
    }
  };

  // Style tab with unified visual styling controls
  const renderStyleTab = () => {
    if (!selectedComponent) return null;

    const sections = [];

    // Unified Visual Styling section - works for all components
    sections.push(
      <PropertySection
        key="visual-styling"
        title="Visual Styling"
        icon="🎨"
        isExpanded={expandedSections.has('visual-styling')}
        onToggle={() => toggleSection('visual-styling')}
      >
        {renderUnifiedVisualStyling()}
      </PropertySection>
    );

    // Advanced CSS section - for power users only
    sections.push(
      <PropertySection
        key="advanced-css"
        title="Advanced CSS"
        icon="⚙️"
        isExpanded={expandedSections.has('advanced-css')}
        onToggle={() => toggleSection('advanced-css')}
      >
        {renderAdvancedCSSSection()}
      </PropertySection>
    );

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        minHeight: 'fit-content',
        width: '100%'
      }}>
        {sections}
      </div>
    );
  };

  // Layout tab with positioning and spacing
  const renderLayoutTab = () => {
    const sections = [];

    sections.push(
      <PropertySection
        key="size"
        title="Size & Position"
        icon="📐"
        isExpanded={expandedSections.has('size')}
        onToggle={() => toggleSection('size')}
      >
        {renderSizeProperties}
      </PropertySection>
    );

    sections.push(
      <PropertySection
        key="spacing"
        title="Spacing"
        icon="📏"
        isExpanded={expandedSections.has('spacing')}
        onToggle={() => toggleSection('spacing')}
      >
        {renderSpacingProperties()}
      </PropertySection>
    );

    // Add Flexbox section for container components (especially FlexContainer)
    const styleCategory = getComponentStyleCategory(selectedComponent!.type);
    const isContainer = ['container', 'decorative'].includes(styleCategory);

    if (isContainer) {
      sections.push(
        <PropertySection
          key="flexbox"
          title="Flexbox Layout"
          icon="🔄"
          isExpanded={expandedSections.has('flexbox')}
          onToggle={() => toggleSection('flexbox')}
        >
          {renderFlexboxProperties()}
        </PropertySection>
      );
    }

    // Add Grid Positioning section when component uses grid positioning mode
    if (selectedComponent!.positioningMode === 'grid' || selectedComponent!.gridPosition) {
      sections.push(
        <PropertySection
          key="grid-position"
          title="Grid Positioning"
          icon="🔲"
          isExpanded={expandedSections.has('grid-position')}
          onToggle={() => toggleSection('grid-position')}
        >
          {renderGridPositioningProperties()}
        </PropertySection>
      );
    }

    // Add CSS Grid Layout section for Grid component specifically
    if (selectedComponent!.type === 'Grid' || selectedComponent!.type === 'GridLayout') {
      sections.push(
        <PropertySection
          key="grid-layout"
          title="CSS Grid Properties"
          icon="📊"
          isExpanded={expandedSections.has('grid-layout')}
          onToggle={() => toggleSection('grid-layout')}
        >
          {renderCSSGridProperties()}
        </PropertySection>
      );
    }

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        minHeight: 'fit-content',
        width: '100%'
      }}>
        {sections}
      </div>
    );
  };

  // Content tab with text and data
  const renderContentTab = () => {
    const sections = [];

    if (isTextComponent(selectedComponent!.type)) {
      sections.push(
        <PropertySection
          key="text"
          title="Text Content"
          icon="📝"
          isExpanded={expandedSections.has('text')}
          onToggle={() => toggleSection('text')}
        >
          {renderTextContentProperties()}
        </PropertySection>
      );
    }

    sections.push(
      <PropertySection
        key="data"
        title="Component Data"
        icon="💾"
        isExpanded={expandedSections.has('data')}
        onToggle={() => toggleSection('data')}
      >
        {renderDataProperties()}
      </PropertySection>
    );

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        minHeight: 'fit-content',
        width: '100%'
      }}>
        {sections}
      </div>
    );
  };

  // Component tab with component-specific properties
  const renderComponentTab = () => {
    if (!selectedComponent) return null;


    const registration = componentRegistry.get(selectedComponent.type);

    if (!registration) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '24px',
          color: '#6b7280',
          fontSize: '14px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🤷</div>
          <p>Component not registered</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>
            {selectedComponent.type} is not found in the component registry
          </p>
        </div>
      );
    }

    const componentProps = Object.entries(registration.props);

    if (componentProps.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '24px',
          color: '#6b7280',
          fontSize: '14px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
          <p>No specific properties</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>
            This component doesn&apos;t have specific configuration options
          </p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Component info header */}
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '8px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
          }}>
            <span style={{ fontSize: '24px' }}>🧩</span>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
              }}>
                {selectedComponent.type.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <p style={{
                margin: 0,
                fontSize: '13px',
                color: '#6b7280',
              }}>
                {Object.keys(registration.props).length} configurable properties
              </p>
            </div>
          </div>

          {/* Component description if available */}
          {registration.relationship?.childrenLabel && (
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: '#6b7280',
              fontStyle: 'italic',
            }}>
              {registration.relationship.childrenLabel}
            </p>
          )}
        </div>

        <PropertySection
          title="Component Settings"
          icon="⚙️"
          isExpanded={expandedSections.has('component-props')}
          onToggle={() => toggleSection('component-props')}
        >
          {renderComponentSpecificProperties(registration)}
        </PropertySection>
      </div>
    );
  };

  // Advanced tab with technical properties
  const renderAdvancedTab = () => {
    const sections = [];

    sections.push(
      <PropertySection
        key="technical"
        title="Technical Properties"
        icon="⚙️"
        isExpanded={expandedSections.has('technical')}
        onToggle={() => toggleSection('technical')}
      >
        {renderTechnicalProperties()}
      </PropertySection>
    );

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        minHeight: 'fit-content',
        width: '100%'
      }}>
        {sections}
      </div>
    );
  };

  // Helper to check if component is text-based
  const isTextComponent = (componentType: string) => {
    const textComponents = ['TextElement', 'Heading', 'Paragraph', 'DisplayName', 'Bio'];
    return textComponents.includes(componentType);
  };

  // Helper to get component style category for determining available props
  const getComponentStyleCategory = (componentType: string) => {
    const textComponents = ['TextElement', 'Heading', 'Paragraph', 'DisplayName', 'Bio'];
    const containerComponents = ['GradientBox', 'CenteredBox', 'NeonBorder', 'RevealBox', 'FlexContainer'];
    const mediaComponents = ['ProfilePhoto', 'UserImage', 'MediaGrid'];
    const interactiveComponents = ['FollowButton', 'ContactCard', 'Tabs'];

    if (textComponents.includes(componentType)) return 'text';
    if (containerComponents.includes(componentType)) return 'container';
    if (mediaComponents.includes(componentType)) return 'media';
    if (interactiveComponents.includes(componentType)) return 'interactive';
    return 'decorative';
  };

  // Render unified visual styling controls based on component category
  const renderUnifiedVisualStyling = () => {
    if (!selectedComponent) return null;

    const styleCategory = getComponentStyleCategory(selectedComponent.type);
    const isText = styleCategory === 'text';
    const isContainer = ['container', 'decorative'].includes(styleCategory);

    return (
      <div>
        <div style={{
          padding: '12px',
          backgroundColor: '#f0f9ff',
          borderRadius: '6px',
          marginBottom: '16px',
          border: '1px solid #bae6fd'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#0284c7',
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            ✨ Universal Styling
          </div>
          <div style={{
            fontSize: '11px',
            color: '#0369a1',
            lineHeight: '1.4'
          }}>
            These properties work consistently across all components and override any conflicting settings.
          </div>
        </div>

        {/* Colors Section */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#374151',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            🎨 Colors
          </div>

          {/* PHASE 3: New CSS-native color editors */}
          <CSSColorEditor
            label="Background Color"
            value={displayValues.backgroundColor || ''}
            onChange={(value) => updatePropertyStable('backgroundColor', value)}
            description="Component background color"
            format="hex"
            showAlpha={true}
          />

          {isText && (
            <CSSColorEditor
              label="Text Color"
              value={displayValues.textColor || ''}
              onChange={(value) => updatePropertyStable('textColor', value)}
              description="Text color"
              format="hex"
            />
          )}

          {isContainer && (
            <CSSColorEditor
              label="Border Color"
              value={displayValues.borderColor || ''}
              onChange={(value) => updatePropertyStable('borderColor', value)}
              description="Border color"
              format="hex"
            />
          )}

          <CSSColorEditor
            label="Accent Color"
            value={displayValues.accentColor || ''}
            onChange={(value) => updatePropertyStable('accentColor', value)}
            description="Accent color for highlights"
            format="hex"
            showAlpha={true}
          />
        </div>

        {/* Typography Section - only for text components */}
        {isText && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 'bold',
              color: '#374151',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              📝 Typography
            </div>

            <SliderEditor
              label="Font Size"
              value={parseFloat((displayValues.fontSize || '16px').replace('px', ''))}
              onChange={(value) => updatePropertyStable('fontSize', `${value}px`)}
              min={8}
              max={72}
              step={1}
              unit="px"
              description="Text size"
            />

            <SelectEditor
              label="Font Weight"
              value={displayValues.fontWeight || 'normal'}
              onChange={(value) => updatePropertyStable('fontWeight', value)}
              options={[
                { value: 'normal', label: 'Normal', icon: '📝' },
                { value: 'bold', label: 'Bold', icon: '🔤' },
                { value: '300', label: 'Light', icon: '📃' },
                { value: '500', label: 'Medium', icon: '📋' },
                { value: '700', label: 'Bold', icon: '📰' },
                { value: '900', label: 'Black', icon: '📓' },
              ]}
              description="Font weight"
            />

            <SelectEditor
              label="Text Align"
              value={displayValues.textAlign || 'left'}
              onChange={(value) => updatePropertyStable('textAlign', value)}
              options={[
                { value: 'left', label: 'Left', icon: '◀️' },
                { value: 'center', label: 'Center', icon: '🔶' },
                { value: 'right', label: 'Right', icon: '▶️' },
                { value: 'justify', label: 'Justify', icon: '📝' },
              ]}
              description="Text alignment"
            />
          </div>
        )}

        {/* Visual Effects Section */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#374151',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            ✨ Effects
          </div>

          <SliderEditor
            label="Opacity"
            value={parseFloat((displayValues.opacity || '100%').replace('%', ''))}
            onChange={(value) => updatePropertyStable('opacity', `${value}%`)}
            min={0}
            max={100}
            step={5}
            unit="%"
            description="Component transparency"
          />

          <SliderEditor
            label="Border Radius"
            value={parseFloat((displayValues.borderRadius || '0px').replace('px', ''))}
            onChange={(value) => updatePropertyStable('borderRadius', `${value}px`)}
            min={0}
            max={50}
            step={1}
            unit="px"
            description="Rounded corners"
          />

          {isContainer && (
            <SliderEditor
              label="Border Width"
              value={parseFloat((displayValues.borderWidth || '0px').replace('px', ''))}
              onChange={(value) => updatePropertyStable('borderWidth', `${value}px`)}
              min={0}
              max={10}
              step={1}
              unit="px"
              description="Border thickness"
            />
          )}

          <CSSBoxShadowEditor
            label="Box Shadow"
            value={displayValues.boxShadow || 'none'}
            onChange={(value) => updatePropertyStable('boxShadow', value)}
            description="Add depth with shadows"
            presets={[
              { name: 'None', value: 'none' },
              { name: 'Small', value: '0 1px 3px rgba(0, 0, 0, 0.12)' },
              { name: 'Medium', value: '0 4px 6px rgba(0, 0, 0, 0.12)' },
              { name: 'Large', value: '0 10px 15px rgba(0, 0, 0, 0.12)' },
              { name: 'XL', value: '0 20px 25px rgba(0, 0, 0, 0.15)' },
              { name: 'Inner', value: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)' },
              { name: 'Glow', value: '0 0 15px rgba(59, 130, 246, 0.5)' }
            ]}
          />
        </div>

        {/* Spacing Section */}
        <div>
          <div style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#374151',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            📏 Spacing
          </div>

          {/* PHASE 3: New CSS-native length editors */}
          <CSSLengthEditor
            label="Padding"
            value={displayValues.padding || ''}
            onChange={(value) => updatePropertyStable('padding', value)}
            description="Internal spacing"
            docProperty="padding"
            units={['px', 'rem', 'em']}
            suggestions={CSS_SUGGESTIONS.padding}
            allowNegative={false}
          />

          <CSSLengthEditor
            label="Margin"
            value={displayValues.margin || ''}
            onChange={(value) => updatePropertyStable('margin', value)}
            description="External spacing"
            docProperty="margin"
            units={['px', 'rem', 'em']}
            suggestions={CSS_SUGGESTIONS.margin}
            allowNegative={true}
          />
        </div>
      </div>
    );
  };

  // Render advanced CSS section for power users
  const renderAdvancedCSSSection = () => {
    if (!selectedComponent) return null;

    return (
      <div>
        <div style={{
          padding: '12px',
          backgroundColor: '#fef3c7',
          borderRadius: '6px',
          marginBottom: '16px',
          border: '1px solid #f59e0b'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#92400e',
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            ⚠️ Advanced CSS Override
          </div>
          <div style={{
            fontSize: '11px',
            color: '#b45309',
            lineHeight: '1.4'
          }}>
            Custom CSS styles as JSON. These will override universal styling properties. Use with caution.
          </div>
        </div>

        <TextEditor
          label="Custom CSS (JSON)"
          value={displayValues.customCSS || ''}
          onChange={(value) => updatePropertyStable('customCSS', value)}
          description='Raw CSS styles as JSON object (e.g., {"color": "#000", "fontSize": "18px"})'
        />

        <div style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#f9fafb',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#6b7280'
        }}>
          💡 Example: {"{"}&#34;color&#34;: &#34;#ff0000&#34;, &#34;fontWeight&#34;: &#34;bold&#34;, &#34;textShadow&#34;: &#34;2px 2px 4px rgba(0,0,0,0.3)&#34;{"}"}
        </div>
      </div>
    );
  };

  // Render appearance properties with visual controls
  const renderAppearanceProperties = () => {
    if (!selectedComponent) return null;

    return (
      <div>
        <ColorEditor
          label="Background Color"
          value={selectedComponent.props?.backgroundColor || ''}
          onChange={(value) => updateProperty('backgroundColor', value)}
          description="Set the background color of the component"
        />

        <ColorEditor
          label="Text Color"
          value={selectedComponent.props?.color || ''}
          onChange={(value) => updateProperty('color', value)}
          description="Set the text color"
        />

        <ColorEditor
          label="Border Color"
          value={selectedComponent.props?.borderColor || ''}
          onChange={(value) => updateProperty('borderColor', value)}
          description="Set the border color"
        />

        <SliderEditor
          label="Opacity"
          value={parseFloat(selectedComponent.props?.opacity || '100')}
          onChange={(value) => updateProperty('opacity', `${value}%`)}
          min={0}
          max={100}
          step={5}
          unit="%"
          description="Adjust component transparency"
        />

        <SliderEditor
          label="Border Radius"
          value={parseFloat(selectedComponent.props?.borderRadius || '0')}
          onChange={(value) => updateProperty('borderRadius', `${value}px`)}
          min={0}
          max={50}
          step={1}
          unit="px"
          description="Round the corners"
        />
      </div>
    );
  };

  // Render typography properties
  const renderTypographyProperties = () => {
    if (!selectedComponent) return null;

    return (
      <div>
        <SelectEditor
          label="Font Weight"
          value={selectedComponent.props?.fontWeight || 'normal'}
          onChange={(value) => updateProperty('fontWeight', value)}
          options={[
            { value: 'normal', label: 'Normal', icon: '📝' },
            { value: 'bold', label: 'Bold', icon: '🔤' },
            { value: '100', label: 'Thin', icon: '📄' },
            { value: '300', label: 'Light', icon: '📃' },
            { value: '500', label: 'Medium', icon: '📋' },
            { value: '700', label: 'Bold', icon: '📰' },
            { value: '900', label: 'Black', icon: '📓' },
          ]}
          description="Choose the font weight"
        />

        <SliderEditor
          label="Font Size"
          value={parseFloat(selectedComponent.props?.fontSize || '16')}
          onChange={(value) => updateProperty('fontSize', `${value}px`)}
          min={8}
          max={72}
          step={1}
          unit="px"
          description="Adjust text size"
        />

        <SelectEditor
          label="Text Align"
          value={selectedComponent.props?.textAlign || 'left'}
          onChange={(value) => updateProperty('textAlign', value)}
          options={[
            { value: 'left', label: 'Left', icon: '⬅️' },
            { value: 'center', label: 'Center', icon: '↔️' },
            { value: 'right', label: 'Right', icon: '➡️' },
            { value: 'justify', label: 'Justify', icon: '↕️' },
          ]}
          description="Text alignment"
        />
      </div>
    );
  };

  // Render CSS styling section - primitive styles stored in style object
  const renderCSSStyleSection = () => {
    if (!selectedComponent) return null;

    // Handler to update the style object specifically
    const handleStyleChange = (newStyles: React.CSSProperties) => {
      onComponentUpdate(selectedComponent.id, {
        props: {
          ...selectedComponent.props,
          style: newStyles
        }
      });
    };

    return (
      <div>
        <div style={{
          padding: '12px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          marginBottom: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            fontSize: '11px',
            color: '#64748b',
            marginBottom: '8px',
            lineHeight: '1.4'
          }}>
            💡 <strong>CSS Styling vs Component Props:</strong><br/>
            These are primitive CSS styles stored in the component&apos;s style object,
            separate from component-specific properties above.
          </div>
        </div>

        <StyleErrorBoundary
          componentId={selectedComponent.id}
          fallbackMessage="Error in CSS styling controls. Please check your CSS values."
        >
          <StyleControls
            styles={getComponentProperty(selectedComponent, 'style') || {}}
            onStyleChange={handleStyleChange}
          />
        </StyleErrorBoundary>
      </div>
    );
  };

  // Render text content properties
  const renderTextContentProperties = () => {
    if (!selectedComponent) return null;

    const content = [];

    // Content editor for text components
    const contentValue = getComponentProperty(selectedComponent, 'content');
    if (contentValue !== undefined) {
      content.push(
        <TextAreaEditor
          key="content"
          label="Text Content"
          value={contentValue}
          onChange={(value) => updateProperty('content', value)}
          description="The text content of this component"
        />
      );
    }

    // Note: Component-specific properties have been moved to the Component tab
    // for better organization and discoverability

    return <div>{content}</div>;
  };

  // Render size and position properties (MEMOIZED to prevent flashing)
  const renderSizeProperties = useMemo(() => {
    if (!selectedComponent) return null;

    // Get current CSS position mode from component props
    const currentPositionMode = getComponentProperty(selectedComponent, 'position') || 'absolute';
    const currentZIndex = getComponentProperty(selectedComponent, 'zIndex') || 1;

    return (
      <div>
        {/* CSS Position Mode Selector */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px',
          }}>
            Position Mode
          </h4>
          <p style={{
            fontSize: '12px',
            color: '#6b7280',
            marginBottom: '12px',
            lineHeight: '1.5'
          }}>
            {currentPositionMode === 'static' && 'Normal document flow, no positioning applied'}
            {currentPositionMode === 'relative' && 'Positioned relative to normal position'}
            {currentPositionMode === 'absolute' && 'Positioned relative to canvas (current mode)'}
            {currentPositionMode === 'fixed' && 'Positioned relative to viewport (scrolls with page)'}
            {currentPositionMode === 'sticky' && 'Switches between relative and fixed on scroll'}
          </p>
          <SelectEditor
            key={`${selectedComponent.id}-position-mode`}
            label=""
            value={currentPositionMode}
            onChange={(value) => updatePropertyStable('position', value)}
            options={[
              { value: 'static', label: 'Static (Default)' },
              { value: 'relative', label: 'Relative' },
              { value: 'absolute', label: 'Absolute' },
              { value: 'fixed', label: 'Fixed' },
              { value: 'sticky', label: 'Sticky' }
            ]}
          />
        </div>

        {/* Z-Index Control */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '12px',
          }}>
            Layer Order (Z-Index)
          </h4>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <SliderEditor
                key={`${selectedComponent.id}-zindex-slider`}
                label=""
                value={Number(currentZIndex)}
                onChange={(value) => updatePropertyStable('zIndex', value)}
                min={-100}
                max={100}
                step={1}
                unit=""
              />
            </div>
            <TextEditor
              key={`${selectedComponent.id}-zindex-text`}
              label=""
              value={String(currentZIndex)}
              onChange={(value) => updatePropertyStable('zIndex', Number(value) || 0)}
              description=""
            />
          </div>
          <p style={{
            fontSize: '11px',
            color: '#6b7280',
            marginTop: '8px'
          }}>
            Higher values appear on top. Typical range: 0-100
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '12px',
          }}>
            Dimensions
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <TextEditor
              key={`${selectedComponent.id}-width`}
              label="Width"
              value={getComponentProperty(selectedComponent, '_size')?.width || 'auto'}
              onChange={(value) => updateSizeProperty('width', value)}
            />
            <TextEditor
              key={`${selectedComponent.id}-height`}
              label="Height"
              value={getComponentProperty(selectedComponent, '_size')?.height || 'auto'}
              onChange={(value) => updateSizeProperty('height', value)}
            />
          </div>
        </div>

        {/* Size Constraints */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '12px',
          }}>
            Size Constraints
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <CSSLengthEditor
              key={`${selectedComponent.id}-minWidth`}
              label="Min Width"
              value={getComponentProperty(selectedComponent, 'minWidth') || ''}
              onChange={(value) => updatePropertyStable('minWidth', value)}
              docProperty="min-width"
              units={['px', '%', 'rem', 'em', 'vw']}
              suggestions={['0px', '100px', '200px', '50%', '100%']}
              allowNegative={false}
            />
            <CSSLengthEditor
              key={`${selectedComponent.id}-maxWidth`}
              label="Max Width"
              value={getComponentProperty(selectedComponent, 'maxWidth') || ''}
              onChange={(value) => updatePropertyStable('maxWidth', value)}
              docProperty="max-width"
              units={['px', '%', 'rem', 'em', 'vw']}
              suggestions={['100%', '500px', '800px', '1200px', 'none']}
              allowNegative={false}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <CSSLengthEditor
              key={`${selectedComponent.id}-minHeight`}
              label="Min Height"
              value={getComponentProperty(selectedComponent, 'minHeight') || ''}
              onChange={(value) => updatePropertyStable('minHeight', value)}
              docProperty="min-height"
              units={['px', '%', 'rem', 'em', 'vh']}
              suggestions={['0px', '50px', '100px', '200px']}
              allowNegative={false}
            />
            <CSSLengthEditor
              key={`${selectedComponent.id}-maxHeight`}
              label="Max Height"
              value={getComponentProperty(selectedComponent, 'maxHeight') || ''}
              onChange={(value) => updatePropertyStable('maxHeight', value)}
              docProperty="max-height"
              units={['px', '%', 'rem', 'em', 'vh']}
              suggestions={['100%', '500px', '800px', 'none']}
              allowNegative={false}
            />
          </div>
        </div>

        {/* Advanced Coordinate Inputs - Show for non-static positioning */}
        {currentPositionMode !== 'static' && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '12px',
            }}>
              Position Coordinates
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <CSSLengthEditor
                key={`${selectedComponent.id}-top`}
                label="Top"
                value={getComponentProperty(selectedComponent, 'top') || ''}
                onChange={(value) => updatePropertyStable('top', value)}
                docProperty="top"
                units={['px', '%', 'rem', 'em', 'vh']}
                suggestions={['0px', '10px', '20px', '50%', 'auto']}
                allowNegative={true}
              />
              <CSSLengthEditor
                key={`${selectedComponent.id}-right`}
                label="Right"
                value={getComponentProperty(selectedComponent, 'right') || ''}
                onChange={(value) => updatePropertyStable('right', value)}
                docProperty="right"
                units={['px', '%', 'rem', 'em', 'vw']}
                suggestions={['0px', '10px', '20px', '50%', 'auto']}
                allowNegative={true}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <CSSLengthEditor
                key={`${selectedComponent.id}-bottom`}
                label="Bottom"
                value={getComponentProperty(selectedComponent, 'bottom') || ''}
                onChange={(value) => updatePropertyStable('bottom', value)}
                docProperty="bottom"
                units={['px', '%', 'rem', 'em', 'vh']}
                suggestions={['0px', '10px', '20px', '50%', 'auto']}
                allowNegative={true}
              />
              <CSSLengthEditor
                key={`${selectedComponent.id}-left`}
                label="Left"
                value={getComponentProperty(selectedComponent, 'left') || ''}
                onChange={(value) => updatePropertyStable('left', value)}
                docProperty="left"
                units={['px', '%', 'rem', 'em', 'vw']}
                suggestions={['0px', '10px', '20px', '50%', 'auto']}
                allowNegative={true}
              />
            </div>
            <p style={{
              fontSize: '11px',
              color: '#6b7280',
              marginTop: '8px'
            }}>
              💡 Use &apos;auto&apos; to unset. Negative values are supported.
            </p>
          </div>
        )}

        {/* PHASE 4.2: Responsive Canvas Position */}
        {selectedComponent.position && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                margin: 0
              }}>
                Canvas Position
              </h4>
              {activeBreakpoint !== 'desktop' && (
                <div style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  backgroundColor: activeBreakpoint === 'tablet' ? '#dbeafe' : '#fce7f3',
                  color: activeBreakpoint === 'tablet' ? '#1e40af' : '#9f1239',
                  borderRadius: '4px',
                  fontWeight: '600'
                }}>
                  {activeBreakpoint.toUpperCase()}
                </div>
              )}
            </div>

            {/* Breakpoint indicator and copy button */}
            {activeBreakpoint !== 'desktop' && (
              <div style={{
                marginBottom: '12px',
                padding: '8px 12px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  marginBottom: '8px',
                  lineHeight: '1.4'
                }}>
                  Editing {activeBreakpoint} position. Desktop position: ({selectedComponent.position.x}px, {selectedComponent.position.y}px)
                </p>
                <button
                  onClick={() => {
                    if (canvasState.copyPositionToBreakpoint) {
                      canvasState.copyPositionToBreakpoint(
                        selectedComponent.id,
                        'desktop',
                        activeBreakpoint as 'tablet' | 'mobile'
                      );
                    }
                  }}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#374151',
                    fontWeight: '500'
                  }}
                >
                  📋 Copy from Desktop
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <SliderEditor
                key={`${selectedComponent.id}-${activeBreakpoint}-x-position`}
                label="X Position"
                value={
                  activeBreakpoint === 'desktop'
                    ? selectedComponent.position?.x || 0
                    : (selectedComponent.responsivePositions?.[activeBreakpoint]?.x ?? selectedComponent.position?.x) || 0
                }
                onChange={(value) => {
                  if (activeBreakpoint === 'desktop') {
                    updatePosition('x', value);
                  } else if (canvasState.updateResponsivePosition) {
                    const currentPos = canvasState.getEffectivePosition?.(selectedComponent, activeBreakpoint) || {
                      x: value,
                      y: selectedComponent.position?.y || 0,
                      width: 200,
                      height: 100
                    };
                    canvasState.updateResponsivePosition(
                      selectedComponent.id,
                      activeBreakpoint as 'tablet' | 'mobile',
                      { ...currentPos, x: value }
                    );
                  }
                }}
                min={0}
                max={2000}
                step={1}
                unit="px"
              />
              <SliderEditor
                key={`${selectedComponent.id}-${activeBreakpoint}-y-position`}
                label="Y Position"
                value={
                  activeBreakpoint === 'desktop'
                    ? selectedComponent.position?.y || 0
                    : (selectedComponent.responsivePositions?.[activeBreakpoint]?.y ?? selectedComponent.position?.y) || 0
                }
                onChange={(value) => {
                  if (activeBreakpoint === 'desktop') {
                    updatePosition('y', value);
                  } else if (canvasState.updateResponsivePosition) {
                    const currentPos = canvasState.getEffectivePosition?.(selectedComponent, activeBreakpoint) || {
                      x: selectedComponent.position?.x || 0,
                      y: value,
                      width: 200,
                      height: 100
                    };
                    canvasState.updateResponsivePosition(
                      selectedComponent.id,
                      activeBreakpoint as 'tablet' | 'mobile',
                      { ...currentPos, y: value }
                    );
                  }
                }}
                min={0}
                max={2000}
                step={1}
                unit="px"
              />
            </div>
          </div>
        )}
      </div>
    );
  }, [selectedComponent?.id, selectedComponent?.position, selectedComponent?.props, selectedComponent?.publicProps, selectedComponent?.responsivePositions, activeBreakpoint, canvasState.updateResponsivePosition, canvasState.getEffectivePosition, canvasState.copyPositionToBreakpoint]);

  // Render spacing properties
  const renderSpacingProperties = () => {
    if (!selectedComponent) return null;

    return (
      <div>
        <SpacingEditor
          label="Padding"
          value={getComponentProperty(selectedComponent, 'padding') || '0px 0px 0px 0px'}
          onChange={(value) => updateProperty('padding', value)}
          type="padding"
          description="Inner spacing around content"
        />

        <SpacingEditor
          label="Margin"
          value={getComponentProperty(selectedComponent, 'margin') || '0px 0px 0px 0px'}
          onChange={(value) => updateProperty('margin', value)}
          type="margin"
          description="Outer spacing around component"
        />
      </div>
    );
  };

  // Render flexbox layout properties
  const renderFlexboxProperties = () => {
    if (!selectedComponent) return null;

    return (
      <div>
        <CSSFlexboxEditor
          label="Flexbox Layout"
          description="Configure flex container layout properties"
          flexDirection={getComponentProperty(selectedComponent, 'flexDirection') || 'row'}
          justifyContent={getComponentProperty(selectedComponent, 'justifyContent') || 'flex-start'}
          alignItems={getComponentProperty(selectedComponent, 'alignItems') || 'flex-start'}
          gap={getComponentProperty(selectedComponent, 'gap') || '0px'}
          onFlexPropsChange={handleFlexPropsChange}
        />
      </div>
    );
  };

  // Render grid positioning properties
  const renderGridPositioningProperties = () => {
    if (!selectedComponent) return null;

    const gridPosition = selectedComponent.gridPosition || { column: 1, row: 1, span: 1 };

    return (
      <div>
        <h4 style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '12px',
        }}>
          Grid Cell Position
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <TextEditor
            label="Column"
            value={String(gridPosition.column)}
            onChange={(value) => {
              const newGridPosition = { ...gridPosition, column: Number(value) || 1 };
              onComponentUpdate(selectedComponent.id, { gridPosition: newGridPosition });
            }}
            description="Starting column (1-based)"
          />
          <TextEditor
            label="Row"
            value={String(gridPosition.row)}
            onChange={(value) => {
              const newGridPosition = { ...gridPosition, row: Number(value) || 1 };
              onComponentUpdate(selectedComponent.id, { gridPosition: newGridPosition });
            }}
            description="Starting row (1-based)"
          />
          <TextEditor
            label="Span"
            value={String(gridPosition.span)}
            onChange={(value) => {
              const newGridPosition = { ...gridPosition, span: Number(value) || 1 };
              onComponentUpdate(selectedComponent.id, { gridPosition: newGridPosition });
            }}
            description="Columns to span"
          />
        </div>
        <p style={{
          fontSize: '11px',
          color: '#6b7280',
          lineHeight: '1.5'
        }}>
          💡 Drag components on canvas to visually adjust position. These values fine-tune placement.
        </p>
      </div>
    );
  };

  // Render CSS Grid layout properties (for Grid component)
  const renderCSSGridProperties = () => {
    if (!selectedComponent) return null;

    return (
      <div>
        <h4 style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '12px',
        }}>
          Grid Template
        </h4>
        <div style={{ marginBottom: '16px' }}>
          <CSSLengthEditor
            label="Grid Template Columns"
            value={getComponentProperty(selectedComponent, 'gridTemplateColumns') || 'repeat(3, 1fr)'}
            onChange={(value) => updatePropertyStable('gridTemplateColumns', value)}
            docProperty="grid-template-columns"
            units={['fr', 'px', '%', 'auto']}
            suggestions={[
              'repeat(2, 1fr)',
              'repeat(3, 1fr)',
              'repeat(4, 1fr)',
              '1fr 2fr',
              '200px 1fr',
              'auto 1fr auto'
            ]}
            description="Define column structure"
            allowNegative={false}
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <CSSLengthEditor
            label="Grid Template Rows"
            value={getComponentProperty(selectedComponent, 'gridTemplateRows') || 'auto'}
            onChange={(value) => updatePropertyStable('gridTemplateRows', value)}
            docProperty="grid-template-rows"
            units={['fr', 'px', '%', 'auto']}
            suggestions={[
              'auto',
              'repeat(2, 1fr)',
              'repeat(3, 100px)',
              '100px auto',
              'minmax(100px, auto)'
            ]}
            description="Define row structure"
            allowNegative={false}
          />
        </div>

        <h4 style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '12px',
          marginTop: '20px'
        }}>
          Grid Spacing
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <CSSLengthEditor
            label="Column Gap"
            value={getComponentProperty(selectedComponent, 'gridColumnGap') || getComponentProperty(selectedComponent, 'gap') || '0px'}
            onChange={(value) => updatePropertyStable('gridColumnGap', value)}
            docProperty="column-gap"
            units={['px', 'rem', 'em']}
            suggestions={['0px', '8px', '12px', '16px', '24px', '1rem']}
            allowNegative={false}
          />
          <CSSLengthEditor
            label="Row Gap"
            value={getComponentProperty(selectedComponent, 'gridRowGap') || getComponentProperty(selectedComponent, 'gap') || '0px'}
            onChange={(value) => updatePropertyStable('gridRowGap', value)}
            docProperty="row-gap"
            units={['px', 'rem', 'em']}
            suggestions={['0px', '8px', '12px', '16px', '24px', '1rem']}
            allowNegative={false}
          />
        </div>

        <h4 style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '12px',
          marginTop: '20px'
        }}>
          Grid Alignment
        </h4>
        <div style={{ marginBottom: '12px' }}>
          <SelectEditor
            label="Justify Items"
            value={getComponentProperty(selectedComponent, 'justifyItems') || 'stretch'}
            onChange={(value) => updatePropertyStable('justifyItems', value)}
            options={[
              { value: 'start', label: 'Start' },
              { value: 'end', label: 'End' },
              { value: 'center', label: 'Center' },
              { value: 'stretch', label: 'Stretch' }
            ]}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <SelectEditor
            label="Align Items"
            value={getComponentProperty(selectedComponent, 'alignItems') || 'stretch'}
            onChange={(value) => updatePropertyStable('alignItems', value)}
            options={[
              { value: 'start', label: 'Start' },
              { value: 'end', label: 'End' },
              { value: 'center', label: 'Center' },
              { value: 'stretch', label: 'Stretch' }
            ]}
          />
        </div>

        <p style={{
          fontSize: '11px',
          color: '#6b7280',
          marginTop: '12px',
          lineHeight: '1.5'
        }}>
          💡 Learn more about CSS Grid: <a href="https://css-tricks.com/snippets/css/complete-guide-grid/" target="_blank" rel="noopener" style={{ color: '#3b82f6', textDecoration: 'underline' }}>CSS Grid Guide</a>
        </p>
      </div>
    );
  };

  // Render component data properties (custom/advanced properties not in registry)
  const renderDataProperties = () => {
    if (!selectedComponent) return null;

    // Get registered component properties to exclude them from data tab
    const registration = componentRegistry.get(selectedComponent.type);
    const registeredProps = registration ? Object.keys(registration.props) : [];

    // Known style/layout properties to exclude
    const knownProps = ['color', 'backgroundColor', 'fontSize', 'fontWeight', 'textAlign', 'borderRadius', 'opacity', 'content', 'padding', 'margin'];

    // Get all properties from both new and legacy structures
    const allProps = {
      ...(selectedComponent.props || {}),
      ...(selectedComponent.publicProps || {})
    };

    // Filter to only show custom properties not handled elsewhere
    const dataProps = Object.entries(allProps)
      .filter(([key]) => {
        // Exclude internal props (starting with _)
        if (key.startsWith('_')) return false;
        // Exclude registered component properties (now in Component tab)
        if (registeredProps.includes(key)) return false;
        // Exclude known style/layout properties
        if (knownProps.includes(key)) return false;
        return true;
      })
      .map(([key, value]) => (
        <TextEditor
          key={key}
          label={key.replace(/([A-Z])/g, ' $1').trim()}
          value={String(value)}
          onChange={(newValue) => updateProperty(key, newValue)}
          description={`Custom ${key} property`}
        />
      ));

    if (dataProps.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '24px',
          color: '#6b7280',
          fontSize: '14px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>💾</div>
          <p>No custom properties</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>
            Custom properties will appear here when added manually
          </p>
        </div>
      );
    }

    return <div>{dataProps}</div>;
  };

  // Render technical properties (raw/advanced)
  const renderTechnicalProperties = () => {
    if (!selectedComponent) return null;

    return (
      <div>
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#92400e',
        }}>
          ⚠️ Advanced properties. Change with caution.
        </div>

        <TextEditor
          label="Component ID"
          value={selectedComponent.id}
          onChange={() => {}} // Read-only
          disabled
          description="Unique identifier (read-only)"
        />

        {/* Positioning mode removed - now always using grid */}

        <TextAreaEditor
          label="Raw Props (JSON)"
          value={JSON.stringify({
            ...(selectedComponent.props || {}),
            ...(selectedComponent.publicProps || {})
          }, null, 2)}
          onChange={(value) => {
            try {
              const parsed = JSON.parse(value);
              // FIXED: Proper routing logic based on which structure has actual data
              const hasRealPublicProps = selectedComponent.publicProps &&
                Object.keys(selectedComponent.publicProps).length > 0;
              const hasLegacyProps = selectedComponent.props &&
                Object.keys(selectedComponent.props).length > 0;

              if (hasLegacyProps) {
                onComponentUpdate(selectedComponent.id, { props: parsed });
              } else {
                onComponentUpdate(selectedComponent.id, { publicProps: parsed });
              }
            } catch (e) {
              // Invalid JSON - ignore
            }
          }}
          description="Raw component properties as JSON (combines both legacy and new props)"
        />
      </div>
    );
  };

  // EMERGENCY FIX: Simplified legacy updateProperty function
  const updateProperty = useCallback((key: string, value: any) => {
    if (!selectedComponent) {
      return;
    }

    // Simple strategy: Update the structure where the property already exists, or default to publicProps
    if (selectedComponent.props && selectedComponent.props[key] !== undefined) {
      // Property exists in legacy props - update there
      onComponentUpdate(selectedComponent.id, {
        props: {
          ...selectedComponent.props,
          [key]: value
        }
      });
    } else {
      // Property doesn't exist in legacy props or legacy props is empty - use publicProps
      onComponentUpdate(selectedComponent.id, {
        publicProps: {
          ...selectedComponent.publicProps,
          [key]: value
        }
      });
    }
  }, [selectedComponent, onComponentUpdate])

  // Update size properties in the _size object
  // MOVED BEFORE renderSizeProperties - these were causing "Cannot access before initialization" error
  const updateSizeProperty = useCallback((dimension: 'width' | 'height', value: string) => {
    if (!selectedComponent) return;

    const currentSize = getComponentProperty(selectedComponent, '_size') || {};
    const updatedSize = {
      ...currentSize,
      [dimension]: value,
    };

    updateProperty('_size', updatedSize);
  }, [selectedComponent, getComponentProperty, updateProperty]);

  // Update position
  const updatePosition = useCallback((axis: 'x' | 'y', value: number) => {
    if (!selectedComponent) return;

    const currentPosition = selectedComponent.position || { x: 0, y: 0 };
    const updatedPosition = {
      ...currentPosition,
      [axis]: value,
    };

    onComponentUpdate(selectedComponent.id, {
      position: updatedPosition,
    });
  }, [selectedComponent, onComponentUpdate]);

  // Render component-specific properties based on registry
  const renderComponentSpecificProperties = (registration: any) => {
    if (!selectedComponent) return null;

    // Universal styling props that should NOT appear in Component tab
    const universalStyleProps = [
      'backgroundColor', 'textColor', 'borderColor', 'accentColor',
      'opacity', 'borderRadius', 'borderWidth', 'boxShadow',
      'fontSize', 'fontWeight', 'fontFamily', 'textAlign', 'lineHeight',
      'padding', 'margin', 'customCSS', 'style'
    ];

    const propElements: React.ReactNode[] = [];

    Object.entries(registration.props).forEach(([propKey, propSchema]: [string, any]) => {

      // Skip universal styling props - they belong in the Style tab
      if (universalStyleProps.includes(propKey)) {
        return;
      }
      const currentValue = getComponentProperty(selectedComponent, propKey);

      const isRequired = propSchema.required;
      const hasDefault = propSchema.default !== undefined;

      switch (propSchema.type) {
        case 'string':
          if (propSchema.values) {
            // Enum string - use SelectEditor
            propElements.push(
              <div key={propKey} style={{ marginBottom: '16px' }}>
                <SelectEditor
                  label={`${propKey.replace(/([A-Z])/g, ' $1').trim()}${isRequired ? ' *' : ''}`}
                  value={currentValue || propSchema.default || ''}
                  onChange={(value) => updateProperty(propKey, value)}
                  options={propSchema.values.map((val: string) => ({
                    value: val,
                    label: val.charAt(0).toUpperCase() + val.slice(1),
                    description: `${propKey}: ${val}`
                  }))}
                  description={`Select ${propKey}${hasDefault ? ` (default: ${propSchema.default})` : ''}`}
                />
              </div>
            );
          } else {
            // Regular string - use TextEditor
            propElements.push(
              <div key={propKey} style={{ marginBottom: '16px' }}>
                <TextEditor
                  label={`${propKey.replace(/([A-Z])/g, ' $1').trim()}${isRequired ? ' *' : ''}`}
                  value={currentValue || propSchema.default || ''}
                  onChange={(value) => updateProperty(propKey, value)}
                  description={`Enter ${propKey}${hasDefault ? ` (default: ${propSchema.default})` : ''}`}
                />
              </div>
            );
          }
          break;

        case 'number':
          const numberValue = currentValue !== undefined ? Number(currentValue) : (propSchema.default || 0);

          propElements.push(
            <div key={propKey} style={{ marginBottom: '16px' }}>
              <SliderEditor
                label={`${propKey.replace(/([A-Z])/g, ' $1').trim()}${isRequired ? ' *' : ''}`}
                value={numberValue}
                onChange={(value) => updateProperty(propKey, value)}
                min={propSchema.min || 0}
                max={propSchema.max || 100}
                step={1}
                description={`Adjust ${propKey}${hasDefault ? ` (default: ${propSchema.default})` : ''}${propSchema.min !== undefined || propSchema.max !== undefined ? ` (range: ${propSchema.min || 0}-${propSchema.max || 100})` : ''}`}
              />
            </div>
          );
          break;

        case 'boolean':
          propElements.push(
            <div key={propKey} style={{ marginBottom: '16px' }}>
              <ToggleEditor
                label={`${propKey.replace(/([A-Z])/g, ' $1').trim()}${isRequired ? ' *' : ''}`}
                value={currentValue !== undefined ? Boolean(currentValue) : Boolean(propSchema.default)}
                onChange={(value) => updateProperty(propKey, value)}
                description={`Toggle ${propKey}${hasDefault ? ` (default: ${propSchema.default ? 'enabled' : 'disabled'})` : ''}`}
              />
            </div>
          );
          break;

        case 'enum':
          propElements.push(
            <div key={propKey} style={{ marginBottom: '16px' }}>
              <SelectEditor
                label={`${propKey.replace(/([A-Z])/g, ' $1').trim()}${isRequired ? ' *' : ''}`}
                value={currentValue || propSchema.default || propSchema.values?.[0] || ''}
                onChange={(value) => updateProperty(propKey, value)}
                options={propSchema.values?.map((val: string) => ({
                  value: val,
                  label: val.charAt(0).toUpperCase() + val.slice(1),
                  description: `${propKey}: ${val}`
                })) || []}
                description={`Choose ${propKey}${hasDefault ? ` (default: ${propSchema.default})` : ''}`}
              />
            </div>
          );
          break;

        default:
          // Fallback to text editor
          propElements.push(
            <div key={propKey} style={{ marginBottom: '16px' }}>
              <TextEditor
                label={`${propKey.replace(/([A-Z])/g, ' $1').trim()}${isRequired ? ' *' : ''}`}
                value={String(currentValue || propSchema.default || '')}
                onChange={(value) => updateProperty(propKey, value)}
                description={`Configure ${propKey}${hasDefault ? ` (default: ${propSchema.default})` : ''}`}
              />
            </div>
          );
      }
    });

    if (propElements.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '24px',
          color: '#6b7280',
          fontSize: '14px',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎨</div>
          <p>All styling moved to Style tab</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>
            This component&#39;s properties are now in the Style tab for consistency
          </p>
        </div>
      );
    }

    return <div>{propElements}</div>;
  };

  // Modern Property Section Component
  function PropertySection({
    title,
    icon,
    children,
    isExpanded,
    onToggle,
  }: {
    title: string;
    icon: string;
    children: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
  }) {
    const sectionRef = React.useRef<HTMLDivElement>(null);
    const previousExpandedRef = React.useRef<boolean>(isExpanded);

    // Scroll section into view when expanded (only on actual transitions)
    React.useEffect(() => {
      const wasExpanded = previousExpandedRef.current;
      const isNowExpanded = isExpanded;

      // Update the ref for next time
      previousExpandedRef.current = isExpanded;

      // Only scroll if we're transitioning from collapsed to expanded
      if (!wasExpanded && isNowExpanded && sectionRef.current) {
        // Delay to ensure DOM has updated and animations completed
        setTimeout(() => {
          const section = sectionRef.current;
          if (!section) return;

          // Find the scroll container by looking for overflow: auto
          let scrollContainer = section.parentElement;
          while (scrollContainer) {
            const computedStyle = window.getComputedStyle(scrollContainer);
            if (computedStyle.overflow === 'auto' || computedStyle.overflowY === 'auto') {
              break;
            }
            scrollContainer = scrollContainer.parentElement;
          }

          if (!scrollContainer) {
            // Fallback to native scrollIntoView
            section.scrollIntoView({
              behavior: 'smooth',
              block: 'end'
            });
            return;
          }

          // Get the bounds
          const sectionRect = section.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();

          // Calculate if we need to scroll
          const sectionBottom = sectionRect.bottom;
          const containerBottom = containerRect.bottom;

          // If section extends below the visible area
          if (sectionBottom > containerBottom) {
            // Calculate how much to scroll down
            const scrollAmount = sectionBottom - containerBottom + 20; // 20px padding

            scrollContainer.scrollTo({
              top: scrollContainer.scrollTop + scrollAmount,
              behavior: 'smooth'
            });
          }
        }, 300);
      }
    }, [isExpanded]);

    return (
      <div
        ref={sectionRef}
        style={{
          border: '1px solid #f3f4f6',
          borderRadius: '12px',
          overflow: 'visible',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <button
          onClick={onToggle}
          style={{
            width: '100%',
            padding: '16px 20px',
            background: isExpanded ? '#f8fafc' : '#ffffff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '15px',
            fontWeight: '600',
            color: '#374151',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isExpanded) {
              (e.target as HTMLButtonElement).style.background = '#f9fafb';
            }
          }}
          onMouseLeave={(e) => {
            if (!isExpanded) {
              (e.target as HTMLButtonElement).style.background = '#ffffff';
            }
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <span style={{ fontSize: '18px' }}>{icon}</span>
            <span>{title}</span>
          </div>
          <span style={{
            fontSize: '14px',
            color: '#9ca3af',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}>
            ▶
          </span>
        </button>
        {isExpanded && (
          <div style={{
            padding: '20px',
            background: 'white',
            borderTop: '1px solid #f3f4f6',
            animation: 'fadeIn 0.2s ease-in-out',
          }}>
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white flex flex-col ${className}`} style={{ ...style, display: 'flex', flexDirection: 'column' }}>
      {/* Success Feedback Animation */}
      {successFeedback && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 1000,
            animation: 'slideInRight 0.3s ease-out',
            boxShadow: '0 8px 25px rgba(16, 185, 129, 0.25)',
          }}
        >
          ✨ {successFeedback} updated!
        </div>
      )}

      <style jsx>{`
        @keyframes slideInRight {
          0% {
            transform: translateX(100%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Enhanced property control hover effects */
        .property-control:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease-out;
        }

        /* Tab hover animation */
        .property-tab {
          transition: all 0.2s ease-out;
        }

        .property-tab:hover {
          transform: translateY(-1px);
          background-color: #f8fafc !important;
        }

        .property-tab.active {
          animation: tabActivate 0.3s ease-out;
        }

        @keyframes tabActivate {
          0% {
            transform: scale(0.95);
          }
          50% {
            transform: scale(1.02);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>

      {!selectedComponent ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4 opacity-60">⚙️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">No Selection</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Click on any component in the canvas to edit its properties.
              You&apos;ll see style, layout, and content options here.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Component header */}
          <div className="p-6 border-b border-gray-100" style={{ flexShrink: 0 }}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  {selectedComponent.type.replace(/([A-Z])/g, ' $1').trim()}
                </h2>
                <p className="text-sm text-gray-500 font-mono">
                  #{selectedComponent.id.slice(-8)}
                </p>
              </div>
              <button
                onClick={() => canvasState.removeComponent(selectedComponent.id)}
                style={{
                  padding: '8px 12px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = '#fecaca';
                  target.style.borderColor = '#f87171';
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.background = '#fee2e2';
                  target.style.borderColor = '#fecaca';
                }}
                title="Delete Component"
              >
                🗑️ Delete
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #f3f4f6',
            background: '#fafafa',
            flexShrink: 0,
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`property-tab ${activeTab === tab.id ? 'active' : ''}`}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  border: 'none',
                  background: activeTab === tab.id ? 'white' : 'transparent',
                  borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: activeTab === tab.id ? '#1f2937' : '#6b7280',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title={tab.description}
              >
                <span style={{ fontSize: '16px' }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{
            padding: '24px'
          }}>
            {renderTabContent()}
          </div>
        </>
      )}
    </div>
  );
}

// EMERGENCY FIX: React.memo was blocking ALL updates - removed completely
export default PropertyPanel;