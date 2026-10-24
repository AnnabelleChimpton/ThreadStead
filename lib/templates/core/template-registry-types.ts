// Type definitions and validation utilities for template registry
import React from 'react';

// Import new standardized component interfaces
import {
  StandardComponentProps,
} from '@/lib/templates/core/standard-component-interface';

// Define the shape of prop schemas
/** 'url': a link or image address; only web, mailto and relative ones get through */
export type PropType = 'string' | 'number' | 'boolean' | 'enum' | 'url';

export interface PropSchema {
  type: PropType;
  required?: boolean;
  default?: unknown;
  values?: readonly string[]; // for enum type
  min?: number; // for number type
  max?: number; // for number type
  /** What it does, in one plain sentence. Shown in the component reference and the editor. */
  description?: string;
  /** A value worth showing in snippets, when the default isn't a good example. */
  example?: string;
  /**
   * The name the component's implementation reads, when it isn't the name
   * authors write. `<FlexContainer gap="lg">` reaches FlexContainer as
   * `gapSize`: the component renamed its prop so its own CSS handling
   * wouldn't read the size as CSS `gap`. Authors may write either name.
   */
  componentProp?: string;
  /**
   * The value is CSS (a colour, a length…) and becomes the component's inline
   * style, the way a CSS-named attribute does on plain HTML. Without this, a
   * declared prop always reaches the component as a prop, even when it's
   * named like a CSS property (`color`, `gap`, `display`).
   */
  css?: boolean;
}

/** Where a component sits in the public component reference. */
export type ComponentGroup =
  | 'connected'
  | 'profile'
  | 'layout'
  | 'decorative'
  | 'interactive'
  | 'logic'
  | 'site';

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

export interface ComponentRegistration {
  name: string;
  component: React.ComponentType<any>; // Components have varying prop types
  props: Record<string, PropSchema>;
  fromAttrs?: (attrs: Record<string, string>) => Record<string, unknown>;
  relationship?: ComponentRelationship; // Parent-child relationship metadata
  /** What it shows or does, in a sentence or two, for the component reference and the editor palette. */
  description?: string;
  /** A snippet to copy: the component the way someone would usually write it. */
  example?: string;
  /** Section in the component reference. Without one, it's listed under its registration file's area. */
  group?: ComponentGroup;
  /**
   * Puts it at the top of its group in the component reference and the
   * editor palette, lowest number first: the ones people reach for first.
   * The rest follow in registry order.
   */
  featured?: number;
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

/** A prop name the way authors vary it: `fontSize`, `fontsize` and `font-size` are one name. */
export function propNameKey(name: string): string {
  return name.toLowerCase().replace(/-/g, '');
}

/**
 * The declared prop an attribute sets, matched regardless of case and
 * dashes, by the name authors write or by the implementation's own name
 * (componentProp). The HTML parser lowercases attribute names, so an exact
 * lookup missed every camelCase prop: `tvStyle` arrives as `tvstyle`.
 */
export function findPropSchema(
  schemas: Record<string, PropSchema>,
  attrName: string
): [string, PropSchema] | undefined {
  if (Object.prototype.hasOwnProperty.call(schemas, attrName)) return [attrName, schemas[attrName]];
  const wanted = propNameKey(attrName);
  const entries = Object.entries(schemas);
  return (
    entries.find(([key]) => propNameKey(key) === wanted) ??
    entries.find(([, schema]) => schema.componentProp !== undefined && propNameKey(schema.componentProp) === wanted)
  );
}

export interface CoercedProp {
  value: unknown;
  /**
   * Why the value written wasn't used as written, in words for the page's
   * owner (the editor shows it). Undefined when the value was fine.
   */
  problem?: string;
}

function listOf(values: readonly string[]): string {
  return values.length <= 1 ? values.join('') : `${values.slice(0, -1).join(', ')} or ${values[values.length - 1]}`;
}

function using(fallback: unknown): string {
  return fallback === undefined ? 'It\'s left out.' : `Using ${String(fallback)}.`;
}

/**
 * One attribute value, made into what the component gets. Never throws: a
 * value that doesn't fit falls back to the default and says so in `problem`.
 * Enum values match regardless of case (`color="Pink"` is pink).
 */
export function coercePropValue(value: unknown, schema: PropSchema, name: string): CoercedProp {
  if (value === undefined || value === null) {
    return schema.required
      ? { value: schema.default, problem: `${name} is needed.` }
      : { value: schema.default };
  }

  switch (schema.type) {
    case 'string':
      // The parser keeps space-separated attributes (class) as a list; String()
      // made class="a b" into "a,b"
      return { value: Array.isArray(value) ? value.join(' ') : String(value) };

    case 'url': {
      const text = String(value).trim();
      // Browsers skip spaces and control characters inside a scheme ("java script:")
      const scheme = text.replace(/[\u0000-\u0020]/g, '').match(/^([a-z][a-z0-9+.-]*):/i)?.[1].toLowerCase();
      if (!scheme || ['http', 'https', 'mailto'].includes(scheme)) return { value: text };
      return { value: schema.default, problem: `${name} needs a web address (https://…). ${using(schema.default)}` };
    }

    case 'number': {
      const num = Number(value);
      if (isNaN(num)) {
        return { value: schema.default, problem: `${name} needs a number. ${using(schema.default)}` };
      }
      const tooLow = schema.min !== undefined && num < schema.min;
      const tooHigh = schema.max !== undefined && num > schema.max;
      if (tooLow || tooHigh) {
        const clamped = tooLow ? schema.min! : schema.max!;
        const range =
          schema.min !== undefined && schema.max !== undefined
            ? `goes from ${schema.min} to ${schema.max}`
            : schema.min !== undefined
              ? `is at least ${schema.min}`
              : `is at most ${schema.max}`;
        return { value: clamped, problem: `${name} ${range}. Using ${clamped}.` };
      }
      return { value: num };
    }

    case 'boolean': {
      if (typeof value === 'boolean') return { value };
      const text = String(value).trim().toLowerCase();
      // A bare attribute (`loop`) or HTML's `loop="loop"` is on
      if (text === 'true' || text === '' || text === name.toLowerCase()) return { value: true };
      if (text === 'false') return { value: false };
      const fallback = schema.default ?? false;
      return { value: fallback, problem: `${name} is true or false. Using ${String(fallback)}.` };
    }

    case 'enum': {
      const text = String(value).trim();
      const match = schema.values?.find((v) => v === text) ?? schema.values?.find((v) => v.toLowerCase() === text.toLowerCase());
      if (match !== undefined) return { value: match };
      return {
        value: schema.default,
        problem: `${name} can be ${listOf(schema.values || [])}. ${using(schema.default)}`,
      };
    }

    default:
      return { value };
  }
}

export function validateAndCoerceProp(value: unknown, schema: PropSchema): unknown {
  if ((value === undefined || value === null) && schema.required) {
    throw new Error(`Required prop is missing`);
  }
  const { value: coerced, problem } = coercePropValue(value, schema, 'value');
  if (problem && schema.type === 'number' && coerced === undefined) {
    throw new Error(`Invalid number: ${value}`);
  }
  return coerced;
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

/**
 * Universal CSS properties every component accepts without declaring them.
 * They become the component's inline style (island-detector), as on plain HTML.
 */
export const UNIVERSAL_CSS_ATTRIBUTES: readonly string[] = [
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

export function validateAndCoerceProps(
  attrs: Record<string, unknown>,
  propSchemas: Record<string, PropSchema>,
  options?: {
    hasChildren?: boolean;
    componentType?: string;
    /**
     * Where problems go. The compiler passes its own: the template parser
     * has already told the page's owner about each one, with line numbers
     * (template-parser reportComponentProps). Without it they go to the console.
     */
    report?: (problems: string[]) => void;
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

  // Validate provided attrs
  for (const [key, value] of Object.entries(normalizedAttrs)) {
    const declared = findPropSchema(propSchemas, key);

    if (declared) {
      // Stored under the registry's name, whatever case or spelling was written
      const [propName, schema] = declared;
      const { value: coerced, problem } = coercePropValue(value, schema, propName);
      if (problem) warnings.push(`Invalid prop ${propName}: ${problem}`);
      result[propName] = coerced;
      continue;
    }

    // Allow special props to pass through for all components without warning
    // Note: data-* attributes get converted to camelCase (data-component-id -> dataComponentId) by HTML parser
    if (key === 'className' || key.startsWith('_') || key.startsWith('data-') || key.startsWith('data')) {
      // Allow className, internal props (like _onContentChange), and data attributes.
      // The parser gives a class list as an array: one string, or a component
      // that writes `x ${className}` rendered "a,b" (template audit 06 #2)
      result[key] = key === 'className' && Array.isArray(value) ? value.join(' ') : value;
      continue;
    }

    // Universal CSS properties pass through for every component
    if (UNIVERSAL_CSS_ATTRIBUTES.includes(key)) {
      // Apply basic CSS value validation (same as standardized components)
      result[key] = validateCSSValueForLegacy(key, value);
      continue;
    }

    warnings.push(`Unknown prop: ${key}`);
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
    if (options?.report) {
      options.report(warnings);
    } else {
      console.warn('Template prop validation warnings:', warnings);
    }
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
    '_onContentChange'
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
