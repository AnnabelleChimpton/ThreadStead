/**
 * Modern Property Panel - Visual, tabbed property editor
 * Replaces technical forms with intuitive visual controls
 */

import React, { useState, useMemo } from 'react';
import type { ComponentItem, UseCanvasStateResult } from '@/hooks/useCanvasState';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import {
  getCurrentBreakpoint,
  type GridBreakpoint
} from '@/lib/templates/visual-builder/grid-utils';
import {
  ColorEditor,
  SliderEditor,
  ToggleEditor,
  SelectEditor,
  TextEditor,
  TextAreaEditor,
  SpacingEditor,
} from './VisualPropertyControls';
import StyleControls from './StyleControls';
import StyleErrorBoundary from './StyleErrorBoundary';

interface PropertyPanelProps {
  selectedComponent: ComponentItem | null;
  canvasState: UseCanvasStateResult;
  onComponentUpdate: (componentId: string, updates: Partial<ComponentItem>) => void;
  className?: string;
  style?: React.CSSProperties;
}

// Tab definitions for property organization
type PropertyTab = 'component' | 'style' | 'layout' | 'content' | 'advanced';

interface TabDefinition {
  id: PropertyTab;
  label: string;
  icon: string;
  description: string;
}

/**
 * Modern Property Panel with visual controls and smart organization
 */
export default function PropertyPanel({
  selectedComponent,
  canvasState,
  onComponentUpdate,
  className = '',
  style = {},
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['component-props', 'appearance', 'typography', 'css-styling']));
  const { gridConfig } = canvasState;

  // Tab definitions
  const tabs: TabDefinition[] = [
    {
      id: 'component',
      label: 'Component',
      icon: '🧩',
      description: 'Component-specific properties and settings'
    },
    {
      id: 'style',
      label: 'Style',
      icon: '🎨',
      description: 'Colors, typography, and visual appearance'
    },
    {
      id: 'layout',
      label: 'Layout',
      icon: '📐',
      description: 'Position, size, spacing, and alignment'
    },
    {
      id: 'content',
      label: 'Content',
      icon: '📝',
      description: 'Text, images, and component data'
    },
    {
      id: 'advanced',
      label: 'Advanced',
      icon: '⚙️',
      description: 'Technical properties and overrides'
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

  // Style tab with visual appearance controls
  const renderStyleTab = () => {
    const sections = [];

    // Appearance section
    sections.push(
      <PropertySection
        key="appearance"
        title="Appearance"
        icon="🎨"
        isExpanded={expandedSections.has('appearance')}
        onToggle={() => toggleSection('appearance')}
      >
        {renderAppearanceProperties()}
      </PropertySection>
    );

    // Typography section
    if (isTextComponent(selectedComponent!.type)) {
      sections.push(
        <PropertySection
          key="typography"
          title="Typography"
          icon="📝"
          isExpanded={expandedSections.has('typography')}
          onToggle={() => toggleSection('typography')}
        >
          {renderTypographyProperties()}
        </PropertySection>
      );
    }

    // CSS Styling section - primitive styles stored in style object
    if (isTextComponent(selectedComponent!.type)) {
      sections.push(
        <PropertySection
          key="css-styling"
          title="CSS Styling"
          icon="🎨"
          isExpanded={expandedSections.has('css-styling')}
          onToggle={() => toggleSection('css-styling')}
        >
          {renderCSSStyleSection()}
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
        {renderSizeProperties()}
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
            styles={selectedComponent.props?.style || {}}
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
    if (selectedComponent.props?.content !== undefined) {
      content.push(
        <TextAreaEditor
          key="content"
          label="Text Content"
          value={selectedComponent.props.content}
          onChange={(value) => updateProperty('content', value)}
          description="The text content of this component"
        />
      );
    }

    // Note: Component-specific properties have been moved to the Component tab
    // for better organization and discoverability

    return <div>{content}</div>;
  };

  // Render size and position properties
  const renderSizeProperties = () => {
    if (!selectedComponent) return null;

    return (
      <div>
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
              label="Width"
              value={selectedComponent.props?._size?.width || 'auto'}
              onChange={(value) => updateSizeProperty('width', value)}
            />
            <TextEditor
              label="Height"
              value={selectedComponent.props?._size?.height || 'auto'}
              onChange={(value) => updateSizeProperty('height', value)}
            />
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '12px',
          }}>
            Position
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <SliderEditor
              label="X Position"
              value={selectedComponent.position?.x || 0}
              onChange={(value) => updatePosition('x', value)}
              min={0}
              max={1000}
              step={1}
              unit="px"
            />
            <SliderEditor
              label="Y Position"
              value={selectedComponent.position?.y || 0}
              onChange={(value) => updatePosition('y', value)}
              min={0}
              max={1000}
              step={1}
              unit="px"
            />
          </div>
        </div>
      </div>
    );
  };

  // Render spacing properties
  const renderSpacingProperties = () => {
    if (!selectedComponent) return null;

    return (
      <div>
        <SpacingEditor
          label="Padding"
          value={selectedComponent.props?.padding || '0px 0px 0px 0px'}
          onChange={(value) => updateProperty('padding', value)}
          type="padding"
          description="Inner spacing around content"
        />

        <SpacingEditor
          label="Margin"
          value={selectedComponent.props?.margin || '0px 0px 0px 0px'}
          onChange={(value) => updateProperty('margin', value)}
          type="margin"
          description="Outer spacing around component"
        />
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

    // Filter to only show custom properties not handled elsewhere
    const dataProps = Object.entries(selectedComponent.props || {})
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

        <SelectEditor
          label="Positioning Mode"
          value={selectedComponent.positioningMode || 'absolute'}
          onChange={(value) => updateProperty('positioningMode', value)}
          options={[
            { value: 'absolute', label: 'Absolute', description: 'Pixel-perfect positioning' },
            { value: 'grid', label: 'Grid', description: 'Responsive grid positioning' },
          ]}
          description="How this component is positioned"
        />

        <TextAreaEditor
          label="Raw Props (JSON)"
          value={JSON.stringify(selectedComponent.props || {}, null, 2)}
          onChange={(value) => {
            try {
              const parsed = JSON.parse(value);
              onComponentUpdate(selectedComponent.id, { props: parsed });
            } catch (e) {
              // Invalid JSON - ignore
            }
          }}
          description="Raw component properties as JSON"
        />
      </div>
    );
  };

  // Update a specific property
  const updateProperty = (key: string, value: any) => {
    if (!selectedComponent) return;

    const updatedProps = {
      ...selectedComponent.props,
      [key]: value,
    };

    onComponentUpdate(selectedComponent.id, {
      props: updatedProps,
    });
  };

  // Update size properties in the _size object
  const updateSizeProperty = (dimension: 'width' | 'height', value: string) => {
    if (!selectedComponent) return;

    const currentSize = selectedComponent.props?._size || {};
    const updatedSize = {
      ...currentSize,
      [dimension]: value,
    };

    updateProperty('_size', updatedSize);
  };

  // Update position
  const updatePosition = (axis: 'x' | 'y', value: number) => {
    if (!selectedComponent) return;

    const currentPosition = selectedComponent.position || { x: 0, y: 0 };
    const updatedPosition = {
      ...currentPosition,
      [axis]: value,
    };

    onComponentUpdate(selectedComponent.id, {
      position: updatedPosition,
    });
  };

  // Render component-specific properties based on registry
  const renderComponentSpecificProperties = (registration: any) => {
    if (!selectedComponent) return null;

    const propElements: React.ReactNode[] = [];

    Object.entries(registration.props).forEach(([propKey, propSchema]: [string, any]) => {
      const currentValue = selectedComponent.props?.[propKey];
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
          propElements.push(
            <div key={propKey} style={{ marginBottom: '16px' }}>
              <SliderEditor
                label={`${propKey.replace(/([A-Z])/g, ' $1').trim()}${isRequired ? ' *' : ''}`}
                value={currentValue !== undefined ? Number(currentValue) : (propSchema.default || 0)}
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