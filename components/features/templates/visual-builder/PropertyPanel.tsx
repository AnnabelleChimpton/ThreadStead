/**
 * VISUAL_BUILDER_PROGRESS: Property Panel
 * Phase 1: Visual Builder Foundation - UI Components
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type {
  CanvasComponent,
  PropertyField,
  PropertyFieldType,
  ValidationRule,
} from '@/lib/templates/visual-builder/types';
import { UseCanvasStateResult } from '@/hooks/useCanvasState';

// Import the component registry for prop schemas
import { componentRegistry, validateAndCoerceProp } from '@/lib/templates/core/template-registry';

interface PropertyPanelProps {
  selectedComponent: CanvasComponent | null;
  canvasState: UseCanvasStateResult;
  onComponentUpdate: (componentId: string, updates: Partial<CanvasComponent>) => void;
  className?: string;
}

/**
 * Property panel for editing component properties
 */
export default function PropertyPanel({
  selectedComponent,
  canvasState,
  onComponentUpdate,
  className = '',
}: PropertyPanelProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Update form data when selected component changes
  useEffect(() => {
    if (selectedComponent) {
      setFormData(selectedComponent.props);
      setErrors({});
      setIsDirty(false);
    }
  }, [selectedComponent]);

  // Get component registration from registry
  const componentRegistration = useMemo(() => {
    if (!selectedComponent) return null;
    return componentRegistry.get(selectedComponent.type) || null;
  }, [selectedComponent]);

  // Check if this component can have children
  const relationship = useMemo(() => {
    return componentRegistration?.relationship;
  }, [componentRegistration]);

  const isParentComponent = useMemo(() => {
    return relationship?.type === 'parent' || relationship?.type === 'container';
  }, [relationship]);

  const canAcceptChildren = useMemo(() => {
    return relationship?.acceptsChildren !== undefined;
  }, [relationship]);

  // Generate property fields from component schema
  const propertyFields = useMemo((): PropertyField[] => {
    if (!componentRegistration?.props) return [];

    return Object.entries(componentRegistration.props).map(([key, schema]) => {
      const field: PropertyField = {
        key,
        type: mapSchemaTypeToFieldType(schema.type),
        label: formatLabel(key),
        description: getPropertyDescription(selectedComponent?.type || '', key),
        required: schema.required || false,
        defaultValue: schema.default,
        validation: schema.required ? [{ type: 'required', message: 'This field is required' }] : [],
      };

      // Add type-specific configurations
      if (schema.type === 'enum' && schema.values) {
        field.options = schema.values.map(value => ({
          value,
          label: String(value),
        }));
      }

      if (schema.type === 'number') {
        field.min = schema.min;
        field.max = schema.max;
        field.step = 1;
      }

      return field;
    });
  }, [componentRegistration, selectedComponent]);

  // Handle field value changes
  const handleFieldChange = useCallback((fieldKey: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldKey]: value }));
    setIsDirty(true);

    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldKey];
      return newErrors;
    });

    // Validate the field
    const field = propertyFields.find(f => f.key === fieldKey);
    if (field && componentRegistration) {
      try {
        const schema = componentRegistration.props[fieldKey];
        const validatedValue = validateAndCoerceProp(value, schema);

        // Apply change immediately for better UX
        if (selectedComponent) {
          onComponentUpdate(selectedComponent.id, {
            props: { ...selectedComponent.props, [fieldKey]: validatedValue },
          });
        }
      } catch (error) {
        setErrors(prev => ({
          ...prev,
          [fieldKey]: error instanceof Error ? error.message : 'Invalid value',
        }));
      }
    }
  }, [propertyFields, componentRegistration, selectedComponent, onComponentUpdate]);

  // Handle form reset
  const handleReset = useCallback(() => {
    if (selectedComponent) {
      setFormData(selectedComponent.props);
      setErrors({});
      setIsDirty(false);
    }
  }, [selectedComponent]);

  // Handle applying default values
  const handleApplyDefaults = useCallback(() => {
    if (!componentRegistration || !selectedComponent) return;

    const defaultProps: Record<string, unknown> = {};
    Object.entries(componentRegistration.props).forEach(([key, schema]) => {
      if (schema.default !== undefined) {
        defaultProps[key] = schema.default;
      }
    });

    setFormData(defaultProps);
    onComponentUpdate(selectedComponent.id, {
      props: defaultProps,
    });
    setIsDirty(false);
  }, [componentRegistration, selectedComponent, onComponentUpdate]);

  if (!selectedComponent) {
    return (
      <div className={`property-panel ${className}`}>
        <div className="property-panel-empty">
          <div className="empty-state">
            <div className="empty-state-icon">⚙️</div>
            <h3>No Component Selected</h3>
            <p>Select a component on the canvas to edit its properties</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`property-panel ${className}`}>
      {/* Header */}
      <div className="property-panel-header">
        <div className="component-info">
          <h3 className="component-title">{selectedComponent.type}</h3>
          <span className="component-id">ID: {selectedComponent.id}</span>
        </div>
        <div className="panel-actions">
          {isDirty && (
            <button
              className="panel-action-button"
              onClick={handleReset}
              title="Reset changes"
            >
              ↺
            </button>
          )}
          <button
            className="panel-action-button"
            onClick={handleApplyDefaults}
            title="Apply default values"
          >
            ⚡
          </button>
        </div>
      </div>

      {/* Properties */}
      <div className="property-panel-content">
        {propertyFields.length === 0 ? (
          <div className="no-properties">
            <p>This component has no configurable properties.</p>
          </div>
        ) : (
          <div className="property-sections">
            {/* Basic Properties */}
            <PropertySection title="Properties">
              {propertyFields.map(field => (
                <PropertyField
                  key={field.key}
                  field={field}
                  value={formData[field.key]}
                  error={errors[field.key]}
                  onChange={(value) => handleFieldChange(field.key, value)}
                />
              ))}
            </PropertySection>

            {/* Children Management */}
            {isParentComponent && (
              <PropertySection title={relationship?.childrenLabel || "Children"} defaultExpanded={true}>
                <ChildrenManager
                  component={selectedComponent}
                  relationship={relationship}
                  onAddChild={(child) => canvasState.addChildComponent(selectedComponent.id, child)}
                  onRemoveChild={(childId) => canvasState.removeChildComponent(selectedComponent.id, childId)}
                  onUpdateChild={(childId, updates) => canvasState.updateChildComponent(selectedComponent.id, childId, updates)}
                  onReorderChildren={(fromIndex, toIndex) => canvasState.reorderChildren(selectedComponent.id, fromIndex, toIndex)}
                />
              </PropertySection>
            )}

            {/* Advanced Properties */}
            <PropertySection title="Layout & Position" defaultExpanded={false}>
              <PositionControls
                component={selectedComponent}
                onUpdate={(updates) => onComponentUpdate(selectedComponent.id, updates)}
              />
            </PropertySection>

            {/* Component Info */}
            <PropertySection title="Component Info" defaultExpanded={false}>
              <div className="component-stats">
                <div className="stat-item">
                  <span className="stat-label">Type:</span>
                  <span className="stat-value">{selectedComponent.type}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Children:</span>
                  <span className="stat-value">{selectedComponent.children?.length || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Depth:</span>
                  <span className="stat-value">0</span>
                </div>
              </div>
            </PropertySection>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Collapsible property section
 */
interface PropertySectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

function PropertySection({ title, defaultExpanded = true, children }: PropertySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="property-section">
      <button
        className="property-section-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="section-title">{title}</span>
        <span className={`section-chevron ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </button>
      {isExpanded && (
        <div className="property-section-content">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Individual property field
 */
interface PropertyFieldComponentProps {
  field: PropertyField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

function PropertyField({ field, value, error, onChange }: PropertyFieldComponentProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let newValue: unknown = e.target.value;

    // Type coercion based on field type
    switch (field.type) {
      case 'number':
        newValue = e.target.value === '' ? undefined : Number(e.target.value);
        break;
      case 'boolean':
        newValue = (e.target as HTMLInputElement).checked;
        break;
      default:
        newValue = e.target.value;
    }

    onChange(newValue);
  }, [field.type, onChange]);

  const renderField = () => {
    switch (field.type) {
      case 'boolean':
        return (
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={handleChange}
              className="checkbox-input"
            />
            <span className="checkbox-label">{field.label}</span>
          </label>
        );

      case 'select':
        return (
          <select
            value={String(value || '')}
            onChange={handleChange}
            className={`select-input ${error ? 'error' : ''}`}
          >
            <option value="">Select...</option>
            {field.options?.map(option => (
              <option key={String(option.value)} value={String(option.value)}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value as number || ''}
            onChange={handleChange}
            min={field.min}
            max={field.max}
            step={field.step}
            placeholder={field.placeholder}
            className={`number-input ${error ? 'error' : ''}`}
          />
        );

      case 'color':
        return (
          <div className="color-input-wrapper">
            <input
              type="color"
              value={String(value || '#000000')}
              onChange={handleChange}
              className="color-input"
            />
            <input
              type="text"
              value={String(value || '')}
              onChange={handleChange}
              placeholder="#000000"
              className={`text-input color-text ${error ? 'error' : ''}`}
            />
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={String(value || '')}
            onChange={handleChange}
            placeholder={field.placeholder}
            className={`text-input ${error ? 'error' : ''}`}
          />
        );
    }
  };

  return (
    <div className="property-field">
      {field.type !== 'boolean' && (
        <label className="field-label">
          {field.label}
          {field.required && <span className="required-marker">*</span>}
        </label>
      )}

      <div className="field-input">
        {renderField()}
      </div>

      {field.description && (
        <div className="field-description">
          {field.description}
        </div>
      )}

      {error && (
        <div className="field-error">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Children management component
 */
interface ChildrenManagerProps {
  component: CanvasComponent;
  relationship: any; // ComponentRelationship from registry
  onAddChild: (child: any) => void; // ComponentItem
  onRemoveChild: (childId: string) => void;
  onUpdateChild: (childId: string, updates: any) => void; // Partial<ComponentItem>
  onReorderChildren: (fromIndex: number, toIndex: number) => void;
}

function ChildrenManager({
  component,
  relationship,
  onAddChild,
  onRemoveChild,
  onUpdateChild,
  onReorderChildren
}: ChildrenManagerProps) {
  const [selectedChildType, setSelectedChildType] = useState<string>('');

  // Get available child types
  const availableChildTypes = useMemo(() => {
    if (!relationship?.acceptsChildren) return [];

    if (relationship.acceptsChildren === true) {
      // Accept any children - get all registered components
      return Array.from(componentRegistry.getAllRegistrations().keys())
        .filter(type => {
          const childReg = componentRegistry.get(type);
          return childReg?.relationship?.type === 'child' || childReg?.relationship?.type === 'leaf';
        });
    }

    // Only accept specific child types
    return relationship.acceptsChildren;
  }, [relationship]);

  const currentChildren = component.children || [];
  const canAddMore = !relationship?.maxChildren || currentChildren.length < relationship.maxChildren;
  const needsMore = relationship?.minChildren && currentChildren.length < relationship.minChildren;


  const handleAddChild = useCallback(() => {
    if (!selectedChildType) return;

    const childRegistration = componentRegistry.get(selectedChildType);
    if (!childRegistration) return;

    // Create default child with minimal required props
    const newChild = {
      id: `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: selectedChildType,
      position: { x: 0, y: 0 }, // Children don't need canvas positioning
      positioningMode: 'absolute' as const,
      props: {}
    };

    onAddChild(newChild);
    setSelectedChildType(''); // Reset selection
  }, [selectedChildType, onAddChild]);

  const handleRemoveChild = useCallback((childId: string) => {
    onRemoveChild(childId);
  }, [onRemoveChild]);

  return (
    <div className="children-manager">
      {/* Current Children List */}
      <div className="children-list">
        {currentChildren.length === 0 ? (
          <div className="no-children">
            <p>No children added yet.</p>
            {needsMore && (
              <p className="requirement-notice">
                This component requires at least {relationship.minChildren} children.
              </p>
            )}
          </div>
        ) : (
          <div className="children-items space-y-2">
            {currentChildren.map((child, index) => (
              <ChildEditor
                key={child.id}
                child={child}
                index={index}
                onUpdate={(updates) => onUpdateChild(child.id, updates)}
                onRemove={() => handleRemoveChild(child.id)}
                canRemove={!relationship?.minChildren || currentChildren.length > relationship.minChildren}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Child Controls */}
      {canAddMore && availableChildTypes.length > 0 && (
        <div className="add-child-controls">
          <div className="child-type-selector">
            <select
              value={selectedChildType}
              onChange={(e) => setSelectedChildType(e.target.value)}
              className="child-type-select"
            >
              <option value="">Select child type...</option>
              {availableChildTypes.map((childType: string) => (
                <option key={childType} value={childType}>
                  {childType}
                </option>
              ))}
            </select>
            <button
              className="add-child-button"
              onClick={handleAddChild}
              disabled={!selectedChildType}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Constraints Info */}
      {(relationship?.minChildren || relationship?.maxChildren) && (
        <div className="children-constraints">
          <small className="constraints-text">
            {relationship.minChildren && relationship.maxChildren ? (
              `Requires ${relationship.minChildren}-${relationship.maxChildren} children`
            ) : relationship.minChildren ? (
              `Requires at least ${relationship.minChildren} children`
            ) : relationship.maxChildren ? (
              `Maximum ${relationship.maxChildren} children`
            ) : null}
          </small>
        </div>
      )}
    </div>
  );
}

/**
 * Inline child editor component
 */
interface ChildEditorProps {
  child: any; // ComponentItem from useCanvasState
  index: number;
  onUpdate: (updates: any) => void; // Partial<ComponentItem>
  onRemove: () => void;
  canRemove: boolean;
}

function ChildEditor({ child, index, onUpdate, onRemove, canRemove }: ChildEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localProps, setLocalProps] = useState(child.props || {});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update local props when child changes from external source
  useEffect(() => {
    setLocalProps(child.props || {});
  }, [child.props]);

  const handlePropChange = useCallback((key: string, value: any) => {
    // Update local state immediately for responsive UI
    setLocalProps((prevProps: Record<string, any>) => {
      const newProps = { ...prevProps, [key]: value };

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce the actual state update
      timeoutRef.current = setTimeout(() => {
        onUpdate({ props: newProps });
      }, 500); // Increased debounce time for better typing experience

      return newProps;
    });
  }, [onUpdate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getChildDisplayName = () => {
    if (child.type === 'ContactMethod') {
      return `${localProps.label || localProps.type || 'Contact'}: ${localProps.value || 'No value'}`;
    }
    return `${child.type} #${index + 1}`;
  };

  return (
    <div className="child-editor border border-gray-200 rounded-lg p-3 bg-gray-50">
      {/* Header */}
      <div className="child-header flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="child-expand-button text-sm"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <span className="child-display-name font-medium text-sm">
            {getChildDisplayName()}
          </span>
          <span className="child-type-badge text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
            {child.type}
          </span>
        </div>
        <div className="child-actions flex items-center space-x-1">
          <button
            onClick={onRemove}
            disabled={!canRemove}
            className="remove-child-button text-red-500 hover:text-red-700 disabled:text-gray-300 text-sm"
            title={canRemove ? "Remove child" : "Cannot remove - minimum required"}
          >
            ×
          </button>
        </div>
      </div>

      {/* Expanded Properties */}
      {isExpanded && (
        <div className="child-properties mt-3 space-y-2">
          {child.type === 'ContactMethod' && (
            <>
              <div className="prop-row">
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={localProps.type || 'email'}
                  onChange={(e) => handlePropChange('type', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="github">GitHub</option>
                  <option value="twitter">Twitter</option>
                  <option value="website">Website</option>
                  <option value="discord">Discord</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="prop-row">
                <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                <input
                  type="text"
                  value={localProps.value || ''}
                  onChange={(e) => handlePropChange('value', e.target.value)}
                  placeholder="Enter contact value"
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                />
              </div>
              <div className="prop-row">
                <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
                <input
                  type="text"
                  value={localProps.label || ''}
                  onChange={(e) => handlePropChange('label', e.target.value)}
                  placeholder="Display label"
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                />
              </div>
              <div className="prop-row">
                <label className="flex items-center text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={localProps.copyable !== false}
                    onChange={(e) => handlePropChange('copyable', e.target.checked)}
                    className="mr-2"
                  />
                  Copyable
                </label>
              </div>
            </>
          )}

          {/* Generic properties for other child types */}
          {child.type !== 'ContactMethod' && (
            <div className="prop-row">
              <label className="block text-xs font-medium text-gray-700 mb-1">Properties</label>
              <textarea
                value={JSON.stringify(localProps, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setLocalProps(parsed);
                    onUpdate({ props: parsed });
                  } catch (error) {
                    // Invalid JSON, don't update
                  }
                }}
                className="w-full text-xs font-mono border border-gray-300 rounded px-2 py-1 h-20"
                placeholder="Enter JSON properties"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Position and layout controls
 */
interface PositionControlsProps {
  component: CanvasComponent;
  onUpdate: (updates: Partial<CanvasComponent>) => void;
}

function PositionControls({ component, onUpdate }: PositionControlsProps) {
  const handlePositionChange = useCallback((axis: 'x' | 'y', value: number) => {
    const newPosition = {
      x: component.position?.x || 0,
      y: component.position?.y || 0,
      ...component.position,
      [axis]: value,
    };
    onUpdate({ position: newPosition });
  }, [component.position, onUpdate]);

  const handleSizeChange = useCallback((dimension: 'width' | 'height', value: number | 'auto') => {
    const currentSize = (component.props as any)?._size || { width: 'auto', height: 'auto' };
    const newSize = {
      ...currentSize,
      [dimension]: value,
    };
    // Store size in props with a special key
    onUpdate({
      props: {
        ...component.props,
        _size: newSize
      }
    });
  }, [component.props, onUpdate]);

  return (
    <div className="position-controls">
      <div className="control-group">
        <label className="control-label">Position</label>
        <div className="position-inputs">
          <div className="input-group">
            <span className="input-label">X:</span>
            <input
              type="number"
              value={component.position?.x || 0}
              onChange={(e) => handlePositionChange('x', Number(e.target.value))}
              className="number-input small"
            />
          </div>
          <div className="input-group">
            <span className="input-label">Y:</span>
            <input
              type="number"
              value={component.position?.y || 0}
              onChange={(e) => handlePositionChange('y', Number(e.target.value))}
              className="number-input small"
            />
          </div>
        </div>
      </div>

      <div className="control-group">
        <label className="control-label">Size</label>
        <div className="size-inputs">
          <div className="input-group">
            <span className="input-label">Width:</span>
            <input
              type="number"
              value={(component.props as any)?._size?.width === 'auto' ? '' : ((component.props as any)?._size?.width || '')}
              onChange={(e) => handleSizeChange('width', e.target.value ? Number(e.target.value) : 'auto')}
              placeholder="auto"
              className="number-input small"
            />
          </div>
          <div className="input-group">
            <span className="input-label">Height:</span>
            <input
              type="number"
              value={(component.props as any)?._size?.height === 'auto' ? '' : ((component.props as any)?._size?.height || '')}
              onChange={(e) => handleSizeChange('height', e.target.value ? Number(e.target.value) : 'auto')}
              placeholder="auto"
              className="number-input small"
            />
          </div>
        </div>
      </div>

      <div className="control-group">
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={(component.props as any)?._locked || false}
            onChange={(e) => onUpdate({
              props: { ...component.props, _locked: e.target.checked }
            })}
            className="checkbox-input"
          />
          <span className="checkbox-label">Lock position</span>
        </label>
      </div>

      <div className="control-group">
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={(component.props as any)?._hidden || false}
            onChange={(e) => onUpdate({
              props: { ...component.props, _hidden: e.target.checked }
            })}
            className="checkbox-input"
          />
          <span className="checkbox-label">Hide component</span>
        </label>
      </div>
    </div>
  );
}

// Helper functions

function mapSchemaTypeToFieldType(schemaType: string): PropertyFieldType {
  switch (schemaType) {
    case 'string': return 'text';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'enum': return 'select';
    default: return 'text';
  }
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function getPropertyDescription(componentType: string, propertyKey: string): string | undefined {
  const descriptions: Record<string, Record<string, string>> = {
    'ProfilePhoto': {
      size: 'Size of the profile photo (xs, sm, md, lg)',
      shape: 'Shape of the photo container',
    },
    'DisplayName': {
      as: 'HTML element to use for the display name',
      showLabel: 'Whether to show a label before the name',
    },
    'FlexContainer': {
      direction: 'Direction of flex items',
      align: 'Alignment of items on the cross axis',
      justify: 'Alignment of items on the main axis',
      gap: 'Space between flex items',
    },
    'GridLayout': {
      columns: 'Number of columns in the grid',
      gap: 'Space between grid items',
      responsive: 'Whether to adapt to screen size',
    },
    'GradientBox': {
      gradient: 'Predefined gradient to use',
      direction: 'Direction of the gradient',
      padding: 'Internal spacing',
      rounded: 'Whether to have rounded corners',
    },
  };

  return descriptions[componentType]?.[propertyKey];
}