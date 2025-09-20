/**
 * VISUAL_BUILDER_PROGRESS: Property Panel
 * Phase 1: Visual Builder Foundation - UI Components
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
    const newSize = {
      width: 'auto' as const,
      height: 'auto' as const,
      ...component.size,
      [dimension]: value,
    };
    onUpdate({ size: newSize });
  }, [component.size, onUpdate]);

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
              value={component.size?.width === 'auto' ? '' : (component.size?.width || '')}
              onChange={(e) => handleSizeChange('width', e.target.value ? Number(e.target.value) : 'auto')}
              placeholder="auto"
              className="number-input small"
            />
          </div>
          <div className="input-group">
            <span className="input-label">Height:</span>
            <input
              type="number"
              value={component.size?.height === 'auto' ? '' : (component.size?.height || '')}
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
            checked={component.locked || false}
            onChange={(e) => onUpdate({ locked: e.target.checked })}
            className="checkbox-input"
          />
          <span className="checkbox-label">Lock position</span>
        </label>
      </div>

      <div className="control-group">
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={component.hidden || false}
            onChange={(e) => onUpdate({ hidden: e.target.checked })}
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