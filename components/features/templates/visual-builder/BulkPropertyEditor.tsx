/**
 * BulkPropertyEditor - Edit properties for multiple selected components simultaneously
 * Handles common properties across different component types
 */

import React, { useState, useMemo, useCallback } from 'react';
import type { ComponentItem } from '@/hooks/useCanvasState';
import { componentRegistry } from '@/lib/templates/core/template-registry';
import {
  ColorEditor,
  SliderEditor,
  ToggleEditor,
  SelectEditor,
  TextEditor,
  SpacingEditor,
} from './VisualPropertyControls';

interface BulkPropertyEditorProps {
  selectedComponents: ComponentItem[];
  onComponentUpdate: (componentId: string, updates: Partial<ComponentItem>) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface CommonProperty {
  key: string;
  label: string;
  type: 'text' | 'color' | 'select' | 'toggle' | 'slider' | 'spacing';
  values: (string | number | boolean)[];
  isMixed: boolean; // True if components have different values
  commonValue?: string | number | boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Find common properties across multiple components
 */
function findCommonProperties(components: ComponentItem[]): CommonProperty[] {
  if (components.length === 0) return [];

  const commonProps: Record<string, CommonProperty> = {};

  // Get all possible properties from component registrations
  const allPropertyKeys = new Set<string>();

  components.forEach(component => {
    const registration = componentRegistry.get(component.type);
    if (registration?.props) {
      Object.keys(registration.props).forEach(key => {
        // Skip internal properties
        if (!key.startsWith('_')) {
          allPropertyKeys.add(key);
        }
      });
    }
  });

  // For each property, check if it exists in all components
  Array.from(allPropertyKeys).forEach(propKey => {
    const values: (string | number | boolean)[] = [];
    let hasProperty = true;

    components.forEach(component => {
      const registration = componentRegistry.get(component.type);
      if (registration?.props?.[propKey]) {
        const currentValue = component.props?.[propKey];
        values.push(currentValue);
      } else {
        hasProperty = false;
      }
    });

    // Only include properties that exist in all selected components
    if (hasProperty && values.length === components.length) {
      const uniqueValues = Array.from(new Set(values));
      const isMixed = uniqueValues.length > 1;
      const commonValue = isMixed ? undefined : uniqueValues[0];

      // Get property definition from the first component
      const firstComponent = components[0];
      const registration = componentRegistry.get(firstComponent.type);
      const propDef = registration?.props?.[propKey];

      if (propDef) {
        let propertyType: CommonProperty['type'] = 'text';
        let options: { value: string; label: string }[] | undefined;
        let min: number | undefined;
        let max: number | undefined;
        let step: number | undefined;

        // Determine property type based on prop definition
        if (propDef.type === 'string' && propDef.values) {
          propertyType = 'select';
          options = propDef.values.map(value => ({ value, label: value }));
        } else if (propDef.type === 'boolean') {
          propertyType = 'toggle';
        } else if (propDef.type === 'number') {
          if (propKey.toLowerCase().includes('color') || propKey.toLowerCase().includes('background')) {
            propertyType = 'color';
          } else {
            propertyType = 'slider';
            min = propDef.min || 0;
            max = propDef.max || 100;
            step = 1;
          }
        } else if (propKey.toLowerCase().includes('color') || propKey.toLowerCase().includes('background')) {
          propertyType = 'color';
        } else if (propKey.toLowerCase().includes('spacing') || propKey.toLowerCase().includes('padding') || propKey.toLowerCase().includes('margin')) {
          propertyType = 'spacing';
        }

        // Common properties that we want to support in bulk editing
        const supportedProps = [
          'color', 'backgroundColor', 'borderColor', 'textColor',
          'size', 'fontSize', 'padding', 'margin', 'spacing',
          'opacity', 'borderRadius', 'borderWidth',
          'visible', 'disabled', 'clickable',
          'alignment', 'position', 'display'
        ];

        if (supportedProps.some(supported => propKey.toLowerCase().includes(supported.toLowerCase()))) {
          commonProps[propKey] = {
            key: propKey,
            label: propKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            type: propertyType,
            values,
            isMixed,
            commonValue,
            options,
            min,
            max,
            step
          };
        }
      }
    }
  });

  return Object.values(commonProps);
}

/**
 * Bulk Property Editor Component
 */
export default function BulkPropertyEditor({
  selectedComponents,
  onComponentUpdate,
  className = '',
  style = {},
}: BulkPropertyEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['common']));

  // Find common properties across all selected components
  const commonProperties = useMemo(() => {
    return findCommonProperties(selectedComponents);
  }, [selectedComponents]);

  // Group properties by category
  const propertyGroups = useMemo(() => {
    const groups: Record<string, CommonProperty[]> = {
      appearance: [],
      layout: [],
      behavior: [],
      other: []
    };

    commonProperties.forEach(prop => {
      const key = prop.key.toLowerCase();
      if (key.includes('color') || key.includes('background') || key.includes('border') || key.includes('opacity')) {
        groups.appearance.push(prop);
      } else if (key.includes('size') || key.includes('width') || key.includes('height') || key.includes('padding') || key.includes('margin') || key.includes('spacing')) {
        groups.layout.push(prop);
      } else if (key.includes('visible') || key.includes('disabled') || key.includes('clickable') || key.includes('interactive')) {
        groups.behavior.push(prop);
      } else {
        groups.other.push(prop);
      }
    });

    return groups;
  }, [commonProperties]);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  // Handle property value change
  const handlePropertyChange = useCallback((propertyKey: string, newValue: any) => {
    // Apply the change to all selected components
    selectedComponents.forEach(component => {
      const registration = componentRegistry.get(component.type);
      if (registration?.props?.[propertyKey]) {
        onComponentUpdate(component.id, {
          props: {
            ...component.props,
            [propertyKey]: newValue
          }
        });
      }
    });
  }, [selectedComponents, onComponentUpdate]);

  // Render property editor based on type
  const renderPropertyEditor = useCallback((property: CommonProperty) => {
    const value = property.isMixed ? '' : (property.commonValue || '');

    switch (property.type) {
      case 'color':
        return (
          <ColorEditor
            key={property.key}
            label={property.label}
            value={value as string}
            onChange={(newValue) => handlePropertyChange(property.key, newValue)}
            description={property.isMixed ? 'Mixed values across components' : undefined}
          />
        );

      case 'select':
        return (
          <SelectEditor
            key={property.key}
            label={property.label}
            value={value as string}
            options={property.options || []}
            onChange={(newValue) => handlePropertyChange(property.key, newValue)}
            description={property.isMixed ? 'Mixed values across components' : undefined}
          />
        );

      case 'toggle':
        return (
          <ToggleEditor
            key={property.key}
            label={property.label}
            value={property.isMixed ? false : (value as boolean)}
            onChange={(newValue) => handlePropertyChange(property.key, newValue)}
            description={property.isMixed ? 'Mixed values across components' : undefined}
          />
        );

      case 'slider':
        return (
          <SliderEditor
            key={property.key}
            label={property.label}
            value={property.isMixed ? 0 : (value as number)}
            min={property.min || 0}
            max={property.max || 100}
            step={property.step || 1}
            onChange={(newValue) => handlePropertyChange(property.key, newValue)}
            description={property.isMixed ? 'Mixed values across components' : undefined}
          />
        );

      case 'spacing':
        return (
          <SpacingEditor
            key={property.key}
            label={property.label}
            value={value as string}
            type={property.key.toLowerCase().includes('margin') ? 'margin' : 'padding'}
            onChange={(newValue) => handlePropertyChange(property.key, newValue)}
            description={property.isMixed ? 'Mixed values across components' : undefined}
          />
        );

      case 'text':
      default:
        return (
          <TextEditor
            key={property.key}
            label={property.label}
            value={value as string}
            onChange={(newValue) => handlePropertyChange(property.key, newValue)}
            description={property.isMixed ? 'Mixed values across components' : undefined}
          />
        );
    }
  }, [handlePropertyChange]);

  if (selectedComponents.length === 0) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`} style={style}>
        <div className="text-4xl mb-3">🎛️</div>
        <h3 className="text-lg font-semibold mb-2">No Components Selected</h3>
        <p className="text-sm">Select multiple components to edit their properties together.</p>
      </div>
    );
  }

  if (selectedComponents.length === 1) {
    return (
      <div className={`p-6 text-center text-gray-500 ${className}`} style={style}>
        <div className="text-4xl mb-3">👆</div>
        <h3 className="text-lg font-semibold mb-2">Single Component</h3>
        <p className="text-sm">Use the regular property panel for single component editing, or select multiple components for bulk editing.</p>
      </div>
    );
  }

  const componentTypes = Array.from(new Set(selectedComponents.map(c => c.type)));

  return (
    <div className={`bg-white border-l border-gray-200 ${className}`} style={style}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span>🎛️</span>
          Bulk Property Editor
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Editing {selectedComponents.length} components ({componentTypes.join(', ')})
        </p>
      </div>

      {/* Property Groups */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(propertyGroups).map(([groupName, properties]) => {
          if (properties.length === 0) return null;

          const isExpanded = expandedSections.has(groupName);

          return (
            <div key={groupName} className="border-b border-gray-100">
              {/* Group Header */}
              <button
                onClick={() => toggleSection(groupName)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {groupName} ({properties.length})
                  </span>
                </div>
                <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                  ▶
                </div>
              </button>

              {/* Group Content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4">
                  {properties.map(property => (
                    <div key={property.key} className="relative">
                      {property.isMixed && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"
                             title="Mixed values across selected components" />
                      )}
                      {renderPropertyEditor(property)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* No common properties */}
        {commonProperties.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            <div className="text-4xl mb-3">🔄</div>
            <h3 className="text-lg font-semibold mb-2">No Common Properties</h3>
            <p className="text-sm">
              The selected components ({componentTypes.join(', ')}) don&apos;t share any editable properties.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Try selecting components of the same type for more editing options.
            </p>
          </div>
        )}
      </div>

      {/* Footer with bulk actions */}
      {commonProperties.length > 0 && (
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-500 mb-2">Bulk Actions:</div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // Reset all common properties to their default values
                selectedComponents.forEach(component => {
                  const registration = componentRegistry.get(component.type);
                  if (registration?.props) {
                    const defaultProps: any = {};
                    Object.keys(registration.props).forEach(key => {
                      const propDef = registration.props[key];
                      if (propDef.default !== undefined) {
                        defaultProps[key] = propDef.default;
                      }
                    });

                    onComponentUpdate(component.id, {
                      props: {
                        ...component.props,
                        ...defaultProps
                      }
                    });
                  }
                });
              }}
              className="px-3 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}