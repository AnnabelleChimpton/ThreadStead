// Type definitions and validation utilities for template registry
import React from 'react';

// Import new standardized component interfaces
import {
  StandardComponentProps,
} from '@/lib/templates/core/standard-component-interface';

// Define the shape of prop schemas
export type PropType = 'string' | 'number' | 'boolean' | 'enum';

export interface PropSchema {
  type: PropType;
  required?: boolean;
  default?: unknown;
  values?: readonly string[]; // for enum type
  min?: number; // for number type
  max?: number; // for number type
}

// Component relationship metadata for parent-child relationships
export interface ComponentRelationship {
  type: 'container' | 'parent' | 'child' | 'leaf' | 'text' | 'action' | 'interactive' | 'conditional-action';
  acceptsChildren?: string[] | true | false; // Array of allowed child types, true for any, false for none
  requiresParent?: string;           // Required parent type
  defaultChildren?: Array<{          // Auto-created children when component is added
    type: string;
    props: Record<string, unknown>;
  }>;
  minChildren?: number;              // Minimum required children
  maxChildren?: number;              // Maximum allowed children
  childrenLabel?: string;            // UI label for children section in PropertyPanel
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ComponentRegistration {
  name: string;
  component: React.ComponentType<any>; // Components have varying prop types
  props: Record<string, PropSchema>;
  fromAttrs?: (attrs: Record<string, string>) => Record<string, unknown>;
  relationship?: ComponentRelationship; // Parent-child relationship metadata
}

/**
 * NEW: Standardized component registration using web-standard interfaces
 * This replaces the old PropSchema system with CSS-native prop interfaces
 */
export interface StandardizedComponentRegistration<T extends StandardComponentProps = StandardComponentProps> {
  name: string;
  component: React.ComponentType<T>;
  category: 'layout' | 'content' | 'media' | 'interactive' | 'decorative';
  description?: string;
  // No prop schema needed - TypeScript interface defines the props
  relationship?: ComponentRelationship;
  visualBuilderCapabilities?: {
    resizable?: boolean;
    positionable?: boolean;
    editable?: boolean;
    draggable?: boolean;
  };
  // Examples for the Visual Builder property panel
  examples?: {
    [propName: string]: Array<{
      label: string;
      value: any;
      description?: string;
    }>;
  };
}

// Prop validation and coercion utilities
export function validateAndCoerceProp(value: unknown, schema: PropSchema): unknown {
  if (value === undefined || value === null) {
    if (schema.required) {
      throw new Error(`Required prop is missing`);
    }
    return schema.default;
  }

  switch (schema.type) {
    case 'string':
      return String(value);

    case 'number':
      const num = Number(value);
      if (isNaN(num)) {
        if (schema.default !== undefined) return schema.default;
        throw new Error(`Invalid number: ${value}`);
      }
      if (schema.min !== undefined && num < schema.min) return schema.min;
      if (schema.max !== undefined && num > schema.max) return schema.max;
      return num;

    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === '') return true;
      if (value === 'false') return false;
      return schema.default ?? false;

    case 'enum':
      const strValue = String(value);
      if (schema.values && schema.values.includes(strValue)) {
        return strValue;
      }
      return schema.default;

    default:
      return value;
  }
}

/**
 * Basic CSS value validation for legacy components (reused from standardized validation)
 */
function validateCSSValueForLegacy(propName: string, value: unknown): unknown {
  if (value === undefined || value === null) {
    return value;
  }

  const stringValue = String(value);

  // Color properties
  if (propName.toLowerCase().includes('color') || propName === 'backgroundColor') {
    // Allow hex colors, rgb, rgba, hsl, named colors
    if (/^(#[0-9a-fA-F]{3,8}|rgb|rgba|hsl|hsla|\w+)/.test(stringValue)) {
      return stringValue;
    }
  }

  // Size/length properties
  if (['fontSize', 'width', 'height', 'padding', 'margin', 'gap', 'top', 'left', 'right', 'bottom'].includes(propName)) {
    // Allow CSS length units: px, rem, em, %, vh, vw, etc.
    if (/^-?\d*\.?\d+(px|rem|em|%|vh|vw|vmin|vmax|ch|ex|in|cm|mm|pt|pc)$/.test(stringValue) || stringValue === 'auto') {
      return stringValue;
    }
  }

  // Numeric properties
  if (['zIndex', 'opacity', 'fontWeight'].includes(propName)) {
    const num = Number(value);
    if (!isNaN(num)) {
      return num;
    }
  }

  // For other properties, just return the value as-is (allow flexibility)
  return stringValue;
}

export function validateAndCoerceProps(
  attrs: Record<string, unknown>,
  propSchemas: Record<string, PropSchema>,
  options?: {
    hasChildren?: boolean;
    componentType?: string;
  }
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const warnings: string[] = [];

  // Normalize prop names for case sensitivity issues (especially for CustomHTMLElement)
  const normalizedAttrs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    // Handle lowercase cssrendermode -> cssRenderMode conversion
    if (key.toLowerCase() === 'cssrendermode') {
      normalizedAttrs['cssRenderMode'] = value;
    } else {
      normalizedAttrs[key] = value;
    }
  }


  // Universal CSS properties that should be allowed on all components
  const universalCSSProperties = [
    // Standard HTML attributes
    'className', 'id', 'title', 'style', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby',

    // Standard CSS properties as props
    'backgroundColor', 'color', 'fontSize', 'fontFamily', 'fontWeight', 'textAlign', 'lineHeight',
    'padding', 'margin', 'border', 'borderRadius', 'boxShadow', 'opacity',
    'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'zIndex',
    'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
    'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow', 'gridArea',
    'gridAutoColumns', 'gridAutoRows', 'gridAutoFlow', 'rowGap', 'columnGap',
    'alignContent', 'justifyItems', 'justifySelf', 'alignSelf',
    'overflow', 'overflowX', 'overflowY',

    // Text decoration and styling
    'textDecoration', 'fontStyle', 'textTransform', 'letterSpacing', 'wordSpacing',
    'textIndent', 'whiteSpace', 'wordBreak', 'wordWrap', 'textOverflow',

    // Border styling
    'borderColor', 'borderWidth', 'borderStyle', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',

    // Legacy props that need to pass through during migration
    'contentEditable', 'tabIndex'
  ];

  // DEBUG: Log incoming attrs for Show component
  if (options?.componentType === 'Show') {
    console.log('[validateAndCoerceProps] Show component attrs:', normalizedAttrs);
    console.log('[validateAndCoerceProps] Show component propSchemas:', Object.keys(propSchemas));
  }

  // Validate provided attrs
  for (const [key, value] of Object.entries(normalizedAttrs)) {
    let schema = propSchemas[key];

    // Try case-insensitive lookup if exact match not found (for legacy templates)
    if (!schema) {
      const lowerKey = key.toLowerCase();
      const correctKey = Object.keys(propSchemas).find(k => k.toLowerCase() === lowerKey);
      if (correctKey) {
        schema = propSchemas[correctKey];
        // Use the correct casing for the result
        const correctedValue = value;
        try {
          result[correctKey] = validateAndCoerceProp(correctedValue, schema);
        } catch (error) {
          result[correctKey] = schema.default;
        }
        continue;
      }
    }

    if (!schema) {
      // Allow special props to pass through for all components without warning
      // Note: data-* attributes get converted to camelCase (data-component-id -> dataComponentId) by HTML parser
      if (key === 'className' || key.startsWith('_') || key.startsWith('data-') || key.startsWith('data')) {
        // Allow className, internal props (like _size, _positioningMode, etc.), and data attributes
        result[key] = value;
        continue;
      }

      // NEW: Allow universal CSS properties to pass through for legacy components
      if (universalCSSProperties.includes(key)) {
        // Apply basic CSS value validation (same as standardized components)
        result[key] = validateCSSValueForLegacy(key, value);
        continue;
      }

      warnings.push(`Unknown prop: ${key}`);
      continue;
    }

    try {
      result[key] = validateAndCoerceProp(value, schema);
    } catch (error) {
      warnings.push(`Invalid prop ${key}: ${error}`);
      result[key] = schema.default;
    }
  }

  // Add defaults for missing required props
  for (const [key, schema] of Object.entries(propSchemas)) {
    if (!(key in result)) {
      if (schema.required) {
        warnings.push(`Missing required prop: ${key}`);
      }
      if (schema.default !== undefined) {
        // Skip content defaults for text components when children are present
        const isTextComponent = options?.componentType && ['TextElement', 'Heading', 'Paragraph'].includes(options.componentType);
        const isContentProp = key === 'content';
        const shouldSkipDefault = isTextComponent && isContentProp && options?.hasChildren;

        if (!shouldSkipDefault) {
          result[key] = schema.default;
        }
      }
    }
  }

  if (warnings.length > 0) {
    console.warn('Template prop validation warnings:', warnings);
  }

  return result;
}

/**
 * NEW: Validation function for standardized components
 * This replaces the old schema-based validation for components using CSS property interfaces
 */
export function validateStandardizedProps(
  attrs: Record<string, unknown>,
  componentType: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const warnings: string[] = [];

  // For standardized components, we accept CSS property names and standard HTML attributes
  const allowedCSSProperties = [
    // Standard HTML attributes
    'className', 'id', 'title', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby',

    // Standard CSS properties as props
    'backgroundColor', 'color', 'fontSize', 'fontFamily', 'fontWeight', 'textAlign', 'lineHeight',
    'padding', 'margin', 'border', 'borderRadius', 'boxShadow', 'opacity',
    'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'zIndex',
    'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
    'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow', 'gridArea',
    'gridAutoColumns', 'gridAutoRows', 'gridAutoFlow', 'rowGap', 'columnGap',
    'alignContent', 'justifyItems', 'justifySelf', 'alignSelf',

    // Component-specific props that should be allowed
    'content', 'editable', 'placeholder', 'contentEditable',
    'src', 'alt', 'loading', 'objectFit', 'objectPosition',
    'disabled', 'onClick', 'onFocus', 'onBlur', 'tabIndex',
    'overflow', 'overflowX', 'overflowY',

    // Legacy props that need to pass through during migration
    '_positioning', '_size', '_isInVisualBuilder', '_positioningMode', '_onContentChange'
  ];

  // Validate and coerce each property
  for (const [key, value] of Object.entries(attrs)) {
    // Allow internal props (prefixed with _) to pass through
    if (key.startsWith('_')) {
      result[key] = value;
      continue;
    }

    // Allow data attributes to pass through
    if (key.startsWith('data-')) {
      result[key] = value;
      continue;
    }

    // Check if it's a known CSS property or HTML attribute
    if (allowedCSSProperties.includes(key)) {
      // Basic CSS value validation
      result[key] = validateCSSValue(key, value);
    } else {
      // Unknown property - warn but allow (for component-specific props)
      warnings.push(`Unknown prop for standardized component ${componentType}: ${key}`);
      result[key] = value;
    }
  }

  if (warnings.length > 0) {
    console.warn('Standardized component prop validation warnings:', warnings);
  }

  return result;
}

/**
 * Basic CSS value validation
 */
function validateCSSValue(propName: string, value: unknown): unknown {
  if (value === undefined || value === null) {
    return value;
  }

  const stringValue = String(value);

  // Color properties
  if (propName.toLowerCase().includes('color') || propName === 'backgroundColor') {
    // Allow hex colors, rgb, rgba, hsl, named colors
    if (/^(#[0-9a-fA-F]{3,8}|rgb|rgba|hsl|hsla|\w+)/.test(stringValue)) {
      return stringValue;
    }
  }

  // Size/length properties
  if (['fontSize', 'width', 'height', 'padding', 'margin', 'gap', 'top', 'left', 'right', 'bottom'].includes(propName)) {
    // Allow CSS length units: px, rem, em, %, vh, vw, etc.
    if (/^-?\d*\.?\d+(px|rem|em|%|vh|vw|vmin|vmax|ch|ex|in|cm|mm|pt|pc)$/.test(stringValue) || stringValue === 'auto') {
      return stringValue;
    }
  }

  // Numeric properties
  if (['zIndex', 'opacity', 'fontWeight'].includes(propName)) {
    const num = Number(value);
    if (!isNaN(num)) {
      return num;
    }
  }

  // For everything else, return as string
  return stringValue;
}
