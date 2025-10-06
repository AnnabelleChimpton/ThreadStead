// Component registry for user templates
import React from 'react';

// Import universal styling system (DEPRECATED - for backward compatibility)
import { mergeWithUniversalProps } from '@/lib/templates/visual-builder/universal-styling';

// Import new standardized component interfaces
import {
  StandardComponentProps,
  TextContentProps,
  ContainerProps,
  MediaProps,
  InteractiveProps,
} from '@/lib/templates/core/standard-component-interface';

// Import template components
import ProfilePhoto from '@/components/features/templates/ProfilePhoto';
import DisplayName from '@/components/features/templates/DisplayName';
import Bio from '@/components/features/templates/Bio';
import BlogPosts from '@/components/features/templates/BlogPosts';
import Guestbook from '@/components/features/templates/Guestbook';
import FollowButton from '@/components/features/templates/FollowButton';
import MutualFriends from '@/components/features/templates/MutualFriends';
import FriendBadge from '@/components/features/templates/FriendBadge';
import FriendDisplay from '@/components/features/templates/FriendDisplay';
import WebsiteDisplay from '@/components/features/templates/WebsiteDisplay';
import NotificationCenter from '@/components/features/templates/NotificationCenter';
import NotificationBell from '@/components/features/templates/NotificationBell';
import UserAccount from '@/components/features/templates/UserAccount';
import SiteBranding from '@/components/features/templates/SiteBranding';
import Breadcrumb from '@/components/features/templates/Breadcrumb';
import FlexContainer from '@/components/features/templates/FlexContainer';
import GridLayout from '@/components/features/templates/GridLayout';
import { Grid, GridItem } from '@/components/features/templates/layout/Grid';
import SplitLayout from '@/components/features/templates/SplitLayout';
import CenteredBox from '@/components/features/templates/CenteredBox';
import GradientBox from '@/components/features/templates/GradientBox';
import NeonBorder from '@/components/features/templates/NeonBorder';
import RetroTerminal from '@/components/features/templates/RetroTerminal';
import PolaroidFrame from '@/components/features/templates/PolaroidFrame';
import StickyNote from '@/components/features/templates/StickyNote';
import RevealBox from '@/components/features/templates/RevealBox';
import FloatingBadge from '@/components/features/templates/FloatingBadge';
import WaveText from '@/components/features/templates/WaveText';
import GlitchText from '@/components/features/templates/GlitchText';
import Tabs, { Tab } from '@/components/features/templates/Tabs';
import ProfileHero from '@/components/features/templates/ProfileHero';
import ProfileHeader from '@/components/features/templates/ProfileHeader';
import MediaGrid from '@/components/features/templates/MediaGrid';
import ProfileBadges from '@/components/features/templates/ProfileBadges';
import RetroCard from '@/components/ui/layout/RetroCard';
import UserImage from '@/components/features/templates/UserImage';
import ProgressTracker, { ProgressItem } from '@/components/features/templates/ProgressTracker';
import ImageCarousel, { CarouselImage } from '@/components/features/templates/ImageCarousel';
import ContactCard, { ContactMethod } from '@/components/features/templates/ContactCard';
import SkillChart, { Skill } from '@/components/features/templates/SkillChart';
import CRTMonitor from '@/components/features/templates/CRTMonitor';
import NeonSign from '@/components/features/templates/NeonSign';
import ArcadeButton from '@/components/features/templates/ArcadeButton';
import PixelArtFrame from '@/components/features/templates/PixelArtFrame';
import RetroGrid from '@/components/features/templates/RetroGrid';
import VHSTape from '@/components/features/templates/VHSTape';
import CassetteTape from '@/components/features/templates/CassetteTape';
import RetroTV from '@/components/features/templates/RetroTV';
import Boombox from '@/components/features/templates/Boombox';
import MatrixRain from '@/components/features/templates/MatrixRain';

// Import HTML element components
import TextElement from '@/components/features/templates/TextElement';
import Heading from '@/components/features/templates/Heading';
import Paragraph from '@/components/features/templates/Paragraph';
import CustomHTMLElement from '@/components/features/templates/CustomHTMLElement';

// Import conditional rendering components
import Show from '@/components/features/templates/conditional/Show';
import Choose, { When, Otherwise } from '@/components/features/templates/conditional/Choose';
import IfOwner, { IfVisitor } from '@/components/features/templates/conditional/IfOwner';

// Import template state/variable components
import Var, { Option } from '@/components/features/templates/state/Var';
import ShowVar from '@/components/features/templates/state/ShowVar';
import Set from '@/components/features/templates/state/actions/Set';
import OnClick from '@/components/features/templates/state/events/OnClick';
import Button from '@/components/features/templates/Button';

// Import debug components
import DebugValue from '@/components/features/templates/DebugValue';

// Import navigation component for Visual Builder
import NavigationPreview from '@/components/features/templates/NavigationPreview';

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
  type: 'container' | 'parent' | 'child' | 'leaf' | 'text';
  acceptsChildren?: string[] | true; // Array of allowed child types, or true for any
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

// Component registry class
export class ComponentRegistry {
  private components = new Map<string, ComponentRegistration>();
  private standardizedComponents = new Map<string, StandardizedComponentRegistration<any>>();

  register(registration: ComponentRegistration) {
    this.components.set(registration.name, registration);
  }

  /**
   * NEW: Register standardized components using web-standard interfaces
   */
  registerStandardized<T extends StandardComponentProps>(registration: StandardizedComponentRegistration<T>) {
    this.standardizedComponents.set(registration.name, registration);
  }

  get(name: string): ComponentRegistration | undefined {
    // First try exact match
    const registration = this.components.get(name);
    if (registration) return registration;

    // Try case-insensitive match for template compatibility
    const lowerName = name.toLowerCase();
    for (const [key, value] of this.components.entries()) {
      if (key.toLowerCase() === lowerName) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * NEW: Get standardized component registration
   */
  getStandardized(name: string): StandardizedComponentRegistration | undefined {
    // First try exact match
    const registration = this.standardizedComponents.get(name);
    if (registration) return registration;

    // Try case-insensitive match for template compatibility
    const lowerName = name.toLowerCase();
    for (const [key, value] of this.standardizedComponents.entries()) {
      if (key.toLowerCase() === lowerName) {
        return value;
      }
    }

    return undefined;
  }

  /**
   * Get any component (standardized or legacy) - checks both registries
   */
  getAnyComponent(name: string): { type: 'standardized'; registration: StandardizedComponentRegistration } | { type: 'legacy'; registration: ComponentRegistration } | undefined {
    // Check standardized components first (preferred)
    const standardized = this.getStandardized(name);
    if (standardized) {
      return { type: 'standardized', registration: standardized };
    }

    // Fall back to legacy components
    const legacy = this.get(name);
    if (legacy) {
      return { type: 'legacy', registration: legacy };
    }

    return undefined;
  }

  getAllowedTags(): string[] {
    // Combine both legacy and standardized component names
    const legacyTags = Array.from(this.components.keys());
    const standardizedTags = Array.from(this.standardizedComponents.keys());
    return [...legacyTags, ...standardizedTags];
  }

  getAllowedAttributes(tagName: string): string[] {
    // First check for standardized component
    const standardized = this.getStandardized(tagName);
    if (standardized) {
      // For standardized components, return common CSS/HTML attributes
      return [
        // Standard HTML attributes
        'className', 'id', 'title', 'role', 'aria-label',
        // Standard CSS properties as props
        'backgroundColor', 'color', 'fontSize', 'fontFamily', 'fontWeight', 'textAlign',
        'padding', 'margin', 'border', 'borderRadius', 'boxShadow', 'opacity',
        'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'zIndex',
        'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
        'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow'
      ];
    }

    // Fall back to legacy component
    const registration = this.components.get(tagName);
    if (!registration) return [];
    return Object.keys(registration.props);
  }

  getAllRegistrations(): Map<string, ComponentRegistration> {
    return new Map(this.components);
  }

  // Relationship utility methods
  getRelationship(componentType: string): ComponentRelationship | undefined {
    const registration = this.get(componentType);
    return registration?.relationship;
  }

  canAcceptChild(parentType: string, childType: string): boolean {
    const parentRegistration = this.get(parentType);
    if (!parentRegistration?.relationship) return false;

    const { acceptsChildren } = parentRegistration.relationship;
    if (acceptsChildren === true) return true;
    if (Array.isArray(acceptsChildren)) {
      return acceptsChildren.includes(childType);
    }
    return false;
  }

  getValidChildTypes(parentType: string): string[] {
    const parentRegistration = this.get(parentType);
    if (!parentRegistration?.relationship) return [];

    const { acceptsChildren } = parentRegistration.relationship;
    if (acceptsChildren === true) {
      // Return all registered component types
      return this.getAllowedTags();
    }
    if (Array.isArray(acceptsChildren)) {
      return acceptsChildren;
    }
    return [];
  }

  getRequiredParent(childType: string): string | undefined {
    const childRegistration = this.get(childType);
    return childRegistration?.relationship?.requiresParent;
  }

  getDefaultChildren(parentType: string): Array<{ type: string; props: Record<string, unknown> }> {
    const parentRegistration = this.get(parentType);
    return parentRegistration?.relationship?.defaultChildren || [];
  }

  isParentComponent(componentType: string): boolean {
    const relationship = this.getRelationship(componentType);
    return relationship?.type === 'parent' || relationship?.type === 'container';
  }

  isChildComponent(componentType: string): boolean {
    const relationship = this.getRelationship(componentType);
    return relationship?.type === 'child';
  }
}

// Create the default registry instance
export const componentRegistry = new ComponentRegistry();

// Register HTML Element Components (Basic Elements)
componentRegistry.register({
  name: 'TextElement',
  component: TextElement,
  props: mergeWithUniversalProps({
    content: { type: 'string', default: 'Edit this text' },
    tag: { type: 'enum', values: ['div', 'span', 'p'], default: 'div' }
  }, 'text'),
  relationship: {
    type: 'text',
    acceptsChildren: true,
    childrenLabel: 'Text Content'
  }
});

componentRegistry.register({
  name: 'Heading',
  component: Heading,
  props: mergeWithUniversalProps({
    content: { type: 'string', default: 'Heading Text' },
    level: { type: 'enum', values: ['1', '2', '3', '4', '5', '6'], default: '2' }
  }, 'text'),
  relationship: {
    type: 'text',
    acceptsChildren: true,
    childrenLabel: 'Heading Content'
  }
});

componentRegistry.register({
  name: 'Paragraph',
  component: Paragraph,
  props: mergeWithUniversalProps({
    content: { type: 'string', default: 'This is a paragraph. Click to edit this text and add your own content.' },
    style: { type: 'string' } // Accept JSON string for style object
  }, 'text'),
  relationship: {
    type: 'text',
    acceptsChildren: true,
    childrenLabel: 'Paragraph Content'
  }
});

// Register all other components
componentRegistry.register({
  name: 'ProfilePhoto',
  component: ProfilePhoto,
  props: {
    size: { type: 'enum', values: ['xs', 'sm', 'md', 'lg'], default: 'md' },
    shape: { type: 'enum', values: ['circle', 'square'], default: 'circle' }
  }
});

componentRegistry.register({
  name: 'DisplayName',
  component: DisplayName,
  props: mergeWithUniversalProps({
    as: { type: 'enum', values: ['h1', 'h2', 'h3', 'span', 'div'], default: 'h2' },
    showLabel: { type: 'boolean', default: false }
  }, 'text')
});

componentRegistry.register({
  name: 'Bio',
  component: Bio,
  props: mergeWithUniversalProps({}, 'text')
});

componentRegistry.register({
  name: 'BlogPosts',
  component: BlogPosts,
  props: {
    limit: { type: 'number', min: 1, max: 20, default: 5 },
    mode: { type: 'enum', values: ['full', 'count'], default: 'full' }
  }
});

componentRegistry.register({
  name: 'Guestbook',
  component: Guestbook,
  props: {}
});

componentRegistry.register({
  name: 'FollowButton',
  component: FollowButton,
  props: {}
});

componentRegistry.register({
  name: 'MutualFriends',
  component: MutualFriends,
  props: {}
});

componentRegistry.register({
  name: 'FriendBadge',
  component: FriendBadge,
  props: {}
});

componentRegistry.register({
  name: 'FriendDisplay',
  component: FriendDisplay,
  props: {}
});

componentRegistry.register({
  name: 'WebsiteDisplay',
  component: WebsiteDisplay,
  props: {}
});

componentRegistry.register({
  name: 'NotificationCenter',
  component: NotificationCenter,
  props: {}
});

componentRegistry.register({
  name: 'NotificationBell',
  component: NotificationBell,
  props: {}
});

componentRegistry.register({
  name: 'UserAccount',
  component: UserAccount,
  props: {}
});

componentRegistry.register({
  name: 'SiteBranding',
  component: SiteBranding,
  props: {}
});

componentRegistry.register({
  name: 'Breadcrumb',
  component: Breadcrumb,
  props: {}
});

componentRegistry.register({
  name: 'FlexContainer',
  component: FlexContainer,
  props: {
    direction: { type: 'enum', values: ['row', 'column', 'row-reverse', 'column-reverse'], default: 'row' },
    align: { type: 'enum', values: ['start', 'center', 'end', 'stretch'], default: 'start' },
    justify: { type: 'enum', values: ['start', 'center', 'end', 'between', 'around', 'evenly'], default: 'start' },
    wrap: { type: 'boolean', default: false },
    gap: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' },
    responsive: { type: 'boolean', default: true }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true, // Can accept any children
    childrenLabel: 'Container Content'
  }
});

componentRegistry.register({
  name: 'GridLayout',
  component: GridLayout,
  props: {
    columns: { type: 'number', min: 1, max: 6, default: 2 },
    gap: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' },
    responsive: { type: 'boolean', default: true }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true, // Can accept any children
    childrenLabel: 'Grid Items'
  }
});

// PHASE 4.3: CSS Grid Component (Standardized)
componentRegistry.register({
  name: 'Grid',
  component: Grid,
  props: {
    // CSS Grid template properties
    gridTemplateColumns: { type: 'string', default: 'repeat(3, 1fr)' },
    gridTemplateRows: { type: 'string', default: 'auto' },
    gridTemplateAreas: { type: 'string' },
    gap: { type: 'string', default: '1rem' },
    rowGap: { type: 'string' },
    columnGap: { type: 'string' },
    // Alignment properties
    alignItems: { type: 'enum', values: ['start', 'end', 'center', 'stretch'], default: 'stretch' },
    justifyItems: { type: 'enum', values: ['start', 'end', 'center', 'stretch'], default: 'stretch' },
    alignContent: { type: 'enum', values: ['start', 'end', 'center', 'stretch', 'space-between', 'space-around', 'space-evenly'] },
    justifyContent: { type: 'enum', values: ['start', 'end', 'center', 'stretch', 'space-between', 'space-around', 'space-evenly'] },
    // Convenience shorthand
    columns: { type: 'number', min: 1, max: 12, default: 3 }, // Shorthand for repeat(n, 1fr)
    rows: { type: 'number', min: 1, max: 12 }
  },
  relationship: {
    type: 'container',
    acceptsChildren: ['GridItem'], // Prefer GridItem children, but can accept others
    childrenLabel: 'Grid Cells',
    defaultChildren: [
      { type: 'GridItem', props: {} },
      { type: 'GridItem', props: {} },
      { type: 'GridItem', props: {} }
    ]
  }
});

// PHASE 4.3: CSS Grid Item Component (Standardized)
componentRegistry.register({
  name: 'GridItem',
  component: GridItem,
  props: {
    // CSS Grid item properties
    gridColumn: { type: 'string' },
    gridRow: { type: 'string' },
    gridArea: { type: 'string' },
    justifySelf: { type: 'enum', values: ['start', 'end', 'center', 'stretch'] },
    alignSelf: { type: 'enum', values: ['start', 'end', 'center', 'stretch'] },
    // Convenience shorthand
    column: { type: 'number', min: 1 },
    row: { type: 'number', min: 1 },
    colSpan: { type: 'number', min: 1, default: 1 },
    rowSpan: { type: 'number', min: 1, default: 1 }
  },
  relationship: {
    type: 'child',
    requiresParent: 'Grid',
    acceptsChildren: true,
    childrenLabel: 'Cell Content'
  }
});

componentRegistry.register({
  name: 'SplitLayout',
  component: SplitLayout,
  props: {
    ratio: { type: 'enum', values: ['1:1', '1:2', '2:1', '1:3', '3:1'], default: '1:1' },
    vertical: { type: 'boolean', default: false },
    gap: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' },
    responsive: { type: 'boolean', default: true }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true, // Can accept any children
    childrenLabel: 'Split Content'
  }
});

componentRegistry.register({
  name: 'CenteredBox',
  component: CenteredBox,
  props: {
    maxWidth: { type: 'enum', values: ['sm', 'md', 'lg', 'xl', '2xl', 'full'], default: 'lg' },
    padding: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true, // Can accept any children
    childrenLabel: 'Centered Content'
  }
});

componentRegistry.register({
  name: 'GradientBox',
  component: GradientBox,
  props: {
    // Legacy props (backward compatibility)
    gradient: { type: 'enum', values: ['sunset', 'ocean', 'forest', 'neon', 'rainbow', 'fire'], default: 'sunset' },
    direction: { type: 'enum', values: ['r', 'l', 'b', 't', 'br', 'bl', 'tr', 'tl'], default: 'br' },
    padding: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' },
    rounded: { type: 'boolean', default: true },
    // New flexible props
    colors: { type: 'string' },
    opacity: { type: 'string' }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true, // Can accept any children
    childrenLabel: 'Content'
  }
});

componentRegistry.register({
  name: 'NeonBorder',
  component: NeonBorder,
  props: {
    color: { type: 'enum', values: ['blue', 'pink', 'green', 'purple', 'cyan', 'yellow'], default: 'blue' },
    intensity: { type: 'enum', values: ['soft', 'medium', 'bright'], default: 'medium' },
    padding: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' },
    rounded: { type: 'boolean', default: true }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true, // Can accept any children
    childrenLabel: 'Content'
  }
});

componentRegistry.register({
  name: 'RetroTerminal',
  component: RetroTerminal,
  props: {
    variant: { type: 'enum', values: ['green', 'amber', 'blue', 'white'], default: 'green' },
    showHeader: { type: 'boolean', default: true },
    padding: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true, // Can accept any children
    childrenLabel: 'Terminal Content'
  }
});

componentRegistry.register({
  name: 'PolaroidFrame',
  component: PolaroidFrame,
  props: {
    caption: { type: 'string', default: '' },
    rotation: { type: 'number', min: -15, max: 15, default: 0 },
    shadow: { type: 'boolean', default: true }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true, // Can accept any children
    childrenLabel: 'Frame Content'
  }
});

componentRegistry.register({
  name: 'StickyNote',
  component: StickyNote,
  props: {
    color: { type: 'enum', values: ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'], default: 'yellow' },
    size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' },
    rotation: { type: 'number', min: -15, max: 15, default: 0 }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true, // Can accept any children
    childrenLabel: 'Note Content'
  }
});

componentRegistry.register({
  name: 'RevealBox',
  component: RevealBox,
  props: {
    buttonText: { type: 'string', default: 'Click to reveal' },
    revealText: { type: 'string', default: 'Hide' },
    variant: { type: 'enum', values: ['slide', 'fade', 'grow'], default: 'fade' },
    buttonStyle: { type: 'enum', values: ['button', 'link', 'minimal'], default: 'button' }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true, // Can accept any children
    childrenLabel: 'Hidden Content'
  }
});

componentRegistry.register({
  name: 'FloatingBadge',
  component: FloatingBadge,
  props: {
    color: { type: 'enum', values: ['blue', 'green', 'red', 'yellow', 'purple', 'pink'], default: 'blue' },
    size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' },
    animation: { type: 'enum', values: ['bounce', 'pulse', 'float', 'none'], default: 'float' },
    position: { type: 'enum', values: ['top-left', 'top-right', 'bottom-left', 'bottom-right'], default: 'top-right' }
  }
});

componentRegistry.register({
  name: 'WaveText',
  component: WaveText,
  props: {
    text: { type: 'string', required: true },
    speed: { type: 'enum', values: ['slow', 'medium', 'fast'], default: 'medium' },
    amplitude: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
    color: { type: 'string', default: 'currentColor' }
  }
});

componentRegistry.register({
  name: 'GlitchText',
  component: GlitchText,
  props: {
    text: { type: 'string', required: true },
    intensity: { type: 'enum', values: ['low', 'medium', 'high'], default: 'medium' },
    color: { type: 'string', default: 'currentColor' },
    glitchColor1: { type: 'string', default: '#ff0000' },
    glitchColor2: { type: 'string', default: '#00ffff' }
  }
});

componentRegistry.register({
  name: 'Tabs',
  component: Tabs,
  props: {},
  relationship: {
    type: 'parent',
    acceptsChildren: ['Tab'],
    defaultChildren: [
      { type: 'Tab', props: { title: 'Tab 1' } },
      { type: 'Tab', props: { title: 'Tab 2' } }
    ],
    minChildren: 1,
    childrenLabel: 'Tab Pages'
  }
});

componentRegistry.register({
  name: 'Tab',
  component: Tab,
  props: {
    title: { type: 'string', required: true }
  },
  relationship: {
    type: 'child',
    requiresParent: 'Tabs',
    acceptsChildren: true // Tab can contain any content
  }
});

componentRegistry.register({
  name: 'ProfileHero',
  component: ProfileHero,
  props: {
    variant: { type: 'enum', values: ['tape', 'plain'], default: 'plain' }
  }
});

componentRegistry.register({
  name: 'ProfileHeader',
  component: ProfileHeader,
  props: {
    showPhoto: { type: 'boolean', default: true },
    showBio: { type: 'boolean', default: true },
    showActions: { type: 'boolean', default: true },
    photoSize: { type: 'enum', values: ['xs', 'sm', 'md', 'lg'], default: 'md' }
  }
});

componentRegistry.register({
  name: 'MediaGrid',
  component: MediaGrid,
  props: {}
});

componentRegistry.register({
  name: 'ProfileBadges',
  component: ProfileBadges,
  props: {
    showTitle: { type: 'boolean', default: false },
    layout: { type: 'enum', values: ['grid', 'list'], default: 'grid' }
  }
});


componentRegistry.register({
  name: 'RetroCard',
  component: RetroCard,
  props: {
    title: { type: 'string' }
  }
});

componentRegistry.register({
  name: 'UserImage',
  component: UserImage,
  props: {
    src: { type: 'string' },
    data: { type: 'string' },
    index: { type: 'number', default: 0 },
    alt: { type: 'string', default: '' },
    width: { type: 'string' },
    height: { type: 'string' },
    size: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl', 'full'], default: 'md' },
    rounded: { type: 'enum', values: ['none', 'sm', 'md', 'lg', 'full'], default: 'sm' },
    border: { type: 'boolean', default: false },
    shadow: { type: 'enum', values: ['none', 'sm', 'md', 'lg'], default: 'none' },
    fit: { type: 'enum', values: ['cover', 'contain', 'fill', 'scale-down'], default: 'cover' },
    fallback: { type: 'string', default: '/assets/default-image.png' }
  }
});

// Register conditional rendering components
componentRegistry.register({
  name: 'Show',
  component: Show,
  props: {
    // Simple condition expressions
    when: { type: 'string' },
    data: { type: 'string' },

    // Comparison operators
    equals: { type: 'string' },
    notEquals: { type: 'string' },
    greaterThan: { type: 'string' }, // Can be number or string
    lessThan: { type: 'string' },
    greaterThanOrEqual: { type: 'string' },
    lessThanOrEqual: { type: 'string' },

    // String operators
    contains: { type: 'string' },
    startsWith: { type: 'string' },
    endsWith: { type: 'string' },
    matches: { type: 'string' }, // regex pattern

    // Existence check
    exists: { type: 'string' },

    // Logical operators
    and: { type: 'string' }, // comma-separated data paths
    or: { type: 'string' },  // comma-separated data paths
    not: { type: 'string' }
  }
});

componentRegistry.register({
  name: 'Choose',
  component: Choose,
  props: {}
});

componentRegistry.register({
  name: 'When',
  component: When,
  props: {
    // Simple condition expressions
    condition: { type: 'string' }, // backwards compatibility
    when: { type: 'string' },
    data: { type: 'string' },

    // Comparison operators
    equals: { type: 'string' },
    notEquals: { type: 'string' },
    greaterThan: { type: 'string' },
    lessThan: { type: 'string' },
    greaterThanOrEqual: { type: 'string' },
    lessThanOrEqual: { type: 'string' },

    // String operators
    contains: { type: 'string' },
    startsWith: { type: 'string' },
    endsWith: { type: 'string' },
    matches: { type: 'string' },

    // Existence check
    exists: { type: 'string' },

    // Logical operators
    and: { type: 'string' },
    or: { type: 'string' },
    not: { type: 'string' }
  }
});

componentRegistry.register({
  name: 'Otherwise',
  component: Otherwise,
  props: {}
});

componentRegistry.register({
  name: 'IfOwner',
  component: IfOwner,
  props: {}
});

componentRegistry.register({
  name: 'IfVisitor',
  component: IfVisitor,
  props: {}
});

// Debug components
componentRegistry.register({
  name: 'DebugValue',
  component: DebugValue,
  props: {
    path: { type: 'string', default: 'posts.length' }
  }
});

// Template State/Variable components
componentRegistry.register({
  name: 'Var',
  component: Var,
  props: {
    name: { type: 'string', required: true },
    type: {
      type: 'enum',
      values: ['number', 'string', 'boolean', 'array', 'date', 'computed', 'random', 'urlParam'],
      required: true
    },
    initial: { type: 'string' },
    persist: { type: 'boolean', default: false },
    expression: { type: 'string' },
    param: { type: 'string' },
    default: { type: 'string' }
  },
  relationship: {
    type: 'leaf',
    acceptsChildren: true  // For Option children in random type
  }
});

componentRegistry.register({
  name: 'Option',
  component: Option,
  props: {
    value: { type: 'string' }
  },
  relationship: {
    type: 'leaf',
    acceptsChildren: true
  }
});

componentRegistry.register({
  name: 'ShowVar',
  component: ShowVar,
  props: {
    name: { type: 'string', required: true },
    format: { type: 'string' },
    fallback: { type: 'string' }
  },
  relationship: {
    type: 'leaf',
    acceptsChildren: []
  }
});

componentRegistry.register({
  name: 'Set',
  component: Set,
  props: {
    var: { type: 'string', required: true },
    value: { type: 'string' },
    expression: { type: 'string' }
  },
  relationship: {
    type: 'leaf',  // Action component (used in event handlers)
    acceptsChildren: []
  }
});

componentRegistry.register({
  name: 'OnClick',
  component: OnClick,
  props: {},  // No props, only children (actions)
  relationship: {
    type: 'container',  // Event handler component
    acceptsChildren: true  // Accepts action components as children
  }
});

componentRegistry.register({
  name: 'Button',
  component: Button,
  props: {
    type: { type: 'enum', values: ['button', 'submit', 'reset'], default: 'button' },
    disabled: { type: 'boolean', default: false },
    className: { type: 'string' }
  },
  relationship: {
    type: 'container',  // Interactive component
    acceptsChildren: true  // Accepts content and OnClick
  }
});

componentRegistry.register({
  name: 'ProgressTracker',
  component: ProgressTracker,
  props: {
    title: { type: 'string' },
    display: { type: 'enum', values: ['bars', 'stars', 'circles', 'dots'], default: 'bars' },
    theme: { type: 'enum', values: ['modern', 'retro', 'neon', 'minimal'], default: 'modern' },
    showValues: { type: 'boolean', default: true },
    layout: { type: 'enum', values: ['vertical', 'horizontal'], default: 'vertical' },
    size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' }
  },
  relationship: {
    type: 'parent',
    acceptsChildren: ['ProgressItem'],
    defaultChildren: [
      { type: 'ProgressItem', props: { label: 'JavaScript', value: 85, max: 100 } },
      { type: 'ProgressItem', props: { label: 'React', value: 90, max: 100 } },
      { type: 'ProgressItem', props: { label: 'TypeScript', value: 75, max: 100 } }
    ],
    minChildren: 1,
    childrenLabel: 'Skills'
  }
});

componentRegistry.register({
  name: 'ProgressItem',
  component: ProgressItem,
  props: {
    label: { type: 'string', required: true },
    value: { type: 'number', required: true, min: 0 },
    max: { type: 'number', min: 1 },
    color: { type: 'enum', values: ['blue', 'green', 'red', 'purple', 'pink', 'yellow'], default: 'blue' },
    description: { type: 'string' }
  },
  relationship: {
    type: 'child',
    requiresParent: 'ProgressTracker'
  }
});

componentRegistry.register({
  name: 'ImageCarousel',
  component: ImageCarousel,
  props: {
    autoplay: { type: 'boolean', default: false },
    interval: { type: 'number', min: 1, max: 30, default: 5 },
    showThumbnails: { type: 'boolean', default: true },
    showDots: { type: 'boolean', default: true },
    showArrows: { type: 'boolean', default: true },
    height: { type: 'enum', values: ['sm', 'md', 'lg', 'xl'], default: 'md' },
    transition: { type: 'enum', values: ['slide', 'fade', 'zoom'], default: 'slide' },
    loop: { type: 'boolean', default: true },
    controls: { type: 'enum', values: ['arrows', 'dots', 'thumbnails', 'all'], default: 'all' }
  },
  relationship: {
    type: 'parent',
    acceptsChildren: ['CarouselImage'],
    defaultChildren: [
      { type: 'CarouselImage', props: { src: '/placeholder1.jpg', alt: 'Image 1', caption: 'Sample image 1' } },
      { type: 'CarouselImage', props: { src: '/placeholder2.jpg', alt: 'Image 2', caption: 'Sample image 2' } }
    ],
    minChildren: 1,
    childrenLabel: 'Images'
  }
});

componentRegistry.register({
  name: 'CarouselImage',
  component: CarouselImage,
  props: {
    src: { type: 'string', required: true },
    alt: { type: 'string' },
    caption: { type: 'string' },
    link: { type: 'string' }
  },
  relationship: {
    type: 'child',
    requiresParent: 'ImageCarousel'
  }
});

componentRegistry.register({
  name: 'ContactCard',
  component: ContactCard,
  props: {
    expanded: { type: 'boolean', default: false },
    theme: { type: 'enum', values: ['modern', 'business', 'creative', 'minimal'], default: 'modern' },
    layout: { type: 'enum', values: ['compact', 'detailed', 'grid'], default: 'compact' },
    showHeader: { type: 'boolean', default: true },
    collapsible: { type: 'boolean', default: true },
    maxMethods: { type: 'number', min: 1, max: 10, default: 3 },
    title: { type: 'string', default: 'Contact Me' }
  },
  relationship: {
    type: 'parent',
    acceptsChildren: ['ContactMethod'],
    defaultChildren: [
      { type: 'ContactMethod', props: { type: 'email', value: 'user@example.com', label: 'Email' } }
    ],
    minChildren: 1,
    maxChildren: 10,
    childrenLabel: 'Contact Methods'
  }
});

componentRegistry.register({
  name: 'ContactMethod',
  component: ContactMethod,
  props: {
    type: { type: 'enum', values: ['email', 'phone', 'linkedin', 'github', 'twitter', 'website', 'discord', 'custom'], required: true },
    value: { type: 'string', required: true },
    label: { type: 'string' },
    icon: { type: 'string' },
    copyable: { type: 'boolean', default: true },
    priority: { type: 'number', min: 1, max: 10, default: 5 }
  },
  relationship: {
    type: 'child',
    requiresParent: 'ContactCard'
  }
});

componentRegistry.register({
  name: 'SkillChart',
  component: SkillChart,
  props: {
    title: { type: 'string', default: 'Skills' },
    display: { type: 'enum', values: ['bars', 'radial', 'bubbles', 'tags'], default: 'bars' },
    theme: { type: 'enum', values: ['modern', 'neon', 'professional', 'minimal'], default: 'modern' },
    layout: { type: 'enum', values: ['grid', 'columns', 'flow'], default: 'grid' },
    showValues: { type: 'boolean', default: true },
    showCategories: { type: 'boolean', default: true },
    sortBy: { type: 'enum', values: ['proficiency', 'category', 'name', 'custom'], default: 'proficiency' },
    maxDisplay: { type: 'number', min: 1, max: 50 },
    size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' }
  }
});

componentRegistry.register({
  name: 'Skill',
  component: Skill,
  props: {
    name: { type: 'string', required: true },
    level: { type: 'number', required: true, min: 0 },
    category: { type: 'string' },
    color: { type: 'string' },
    icon: { type: 'string' },
    description: { type: 'string' },
    yearsExperience: { type: 'number', min: 0, max: 50 },
    priority: { type: 'number', min: 1, max: 10, default: 5 },
    max: { type: 'number', min: 1, default: 100 }
  }
});

componentRegistry.register({
  name: 'CRTMonitor',
  component: CRTMonitor,
  props: {
    content: { type: 'string', default: 'System initialized...\n> Ready for input' },
    screenColor: { type: 'enum', values: ['green', 'amber', 'blue', 'white'], default: 'green' },
    intensity: { type: 'enum', values: ['low', 'medium', 'high'], default: 'medium' },
    scanlines: { type: 'boolean', default: true },
    phosphorGlow: { type: 'boolean', default: true },
    curvature: { type: 'boolean', default: true },
    fontSize: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
    fontFamily: { type: 'enum', values: ['monospace', 'terminal'], default: 'monospace' }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true,
    childrenLabel: 'Terminal Content'
  }
});

componentRegistry.register({
  name: 'NeonSign',
  component: NeonSign,
  props: {
    text: { type: 'string', default: 'NEON SIGN' },
    color: { type: 'enum', values: ['blue', 'pink', 'green', 'purple', 'cyan', 'yellow', 'red', 'white'], default: 'blue' },
    intensity: { type: 'enum', values: ['dim', 'bright', 'blazing'], default: 'bright' },
    animation: { type: 'enum', values: ['steady', 'flicker', 'pulse', 'buzz'], default: 'steady' },
    fontSize: { type: 'enum', values: ['small', 'medium', 'large', 'xl'], default: 'medium' },
    fontWeight: { type: 'enum', values: ['normal', 'bold', 'black'], default: 'bold' },
    uppercase: { type: 'boolean', default: true },
    outline: { type: 'boolean', default: true },
    background: { type: 'boolean', default: false }
  },
  relationship: {
    type: 'text',
    acceptsChildren: true,
    childrenLabel: 'Neon Text'
  }
});

componentRegistry.register({
  name: 'ArcadeButton',
  component: ArcadeButton,
  props: {
    text: { type: 'string', default: 'START' },
    color: { type: 'enum', values: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'white', 'black'], default: 'red' },
    size: { type: 'enum', values: ['small', 'medium', 'large', 'xl'], default: 'medium' },
    shape: { type: 'enum', values: ['circle', 'square', 'rectangle'], default: 'circle' },
    style3D: { type: 'boolean', default: true },
    glowing: { type: 'boolean', default: false },
    clickEffect: { type: 'boolean', default: true },
    sound: { type: 'boolean', default: false },
    href: { type: 'string' }
  },
  relationship: {
    type: 'leaf',
    acceptsChildren: true,
    childrenLabel: 'Button Text'
  }
});

componentRegistry.register({
  name: 'PixelArtFrame',
  component: PixelArtFrame,
  props: {
    content: { type: 'string', default: '' },
    frameColor: { type: 'enum', values: ['classic', 'gold', 'silver', 'copper', 'neon', 'rainbow'], default: 'classic' },
    frameWidth: { type: 'enum', values: ['thin', 'medium', 'thick', 'ultra'], default: 'medium' },
    borderStyle: { type: 'enum', values: ['solid', 'dashed', 'dotted', 'double'], default: 'solid' },
    cornerStyle: { type: 'enum', values: ['square', 'beveled', 'rounded', 'ornate'], default: 'square' },
    shadowEffect: { type: 'boolean', default: true },
    glowEffect: { type: 'boolean', default: false },
    animated: { type: 'boolean', default: false },
    innerPadding: { type: 'enum', values: ['none', 'small', 'medium', 'large'], default: 'medium' },
    backgroundColor: { type: 'string', default: 'transparent' }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true,
    childrenLabel: 'Frame Content'
  }
});

componentRegistry.register({
  name: 'RetroGrid',
  component: RetroGrid,
  props: {
    gridStyle: { type: 'enum', values: ['synthwave', 'outrun', 'cyberpunk', 'vaporwave', 'matrix', 'tron'], default: 'synthwave' },
    perspective: { type: 'enum', values: ['none', 'shallow', 'deep', 'extreme'], default: 'deep' },
    animation: { type: 'enum', values: ['none', 'pulse', 'scroll', 'wave', 'glitch'], default: 'none' },
    opacity: { type: 'enum', values: ['subtle', 'medium', 'strong', 'intense'], default: 'medium' },
    size: { type: 'enum', values: ['small', 'medium', 'large', 'xlarge'], default: 'medium' },
    horizon: { type: 'enum', values: ['high', 'middle', 'low', 'hidden'], default: 'middle' },
    scanlines: { type: 'boolean', default: false },
    glow: { type: 'boolean', default: true },
    content: { type: 'string', default: '' }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true,
    childrenLabel: 'Grid Overlay Content'
  }
});

componentRegistry.register({
  name: 'VHSTape',
  component: VHSTape,
  props: {
    title: { type: 'string', default: 'HOME VIDEO' },
    year: { type: 'string', default: '1985' },
    genre: { type: 'enum', values: ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Documentary'], default: 'Action' },
    duration: { type: 'string', default: '120 min' },
    tapeColor: { type: 'enum', values: ['black', 'white', 'clear', 'blue', 'red'], default: 'black' },
    labelStyle: { type: 'enum', values: ['classic', 'rental', 'homemade', 'premium'], default: 'classic' },
    wear: { type: 'enum', values: ['mint', 'good', 'worn', 'damaged'], default: 'good' },
    showBarcode: { type: 'boolean', default: true }
  },
  relationship: {
    type: 'text',
    acceptsChildren: true,
    childrenLabel: 'VHS Title'
  }
});

componentRegistry.register({
  name: 'CassetteTape',
  component: CassetteTape,
  props: {
    title: { type: 'string', default: 'MIX TAPE' },
    artist: { type: 'string', default: 'Various Artists' },
    album: { type: 'string', default: '' },
    year: { type: 'string', default: '1985' },
    side: { type: 'enum', values: ['A', 'B'], default: 'A' },
    duration: { type: 'string', default: '45 min' },
    tapeColor: { type: 'enum', values: ['black', 'white', 'clear', 'chrome', 'metal'], default: 'black' },
    labelStyle: { type: 'enum', values: ['classic', 'handwritten', 'typed', 'minimal'], default: 'classic' },
    wear: { type: 'enum', values: ['mint', 'good', 'worn', 'damaged'], default: 'good' },
    showSpokesToRotate: { type: 'boolean', default: true }
  },
  relationship: {
    type: 'text',
    acceptsChildren: true,
    childrenLabel: 'Cassette Title'
  }
});

componentRegistry.register({
  name: 'RetroTV',
  component: RetroTV,
  props: {
    screenColor: { type: 'enum', values: ['green', 'amber', 'white', 'blue', 'red'], default: 'green' },
    tvStyle: { type: 'enum', values: ['crt', 'vintage', 'portable', 'console'], default: 'crt' },
    channelNumber: { type: 'string', default: '3' },
    showStatic: { type: 'boolean', default: false },
    showScanlines: { type: 'boolean', default: true },
    curvature: { type: 'enum', values: ['none', 'slight', 'medium', 'heavy'], default: 'medium' },
    brightness: { type: 'number', default: 100 },
    contrast: { type: 'number', default: 100 }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true,
    childrenLabel: 'TV Screen Content'
  }
});

componentRegistry.register({
  name: 'Boombox',
  component: Boombox,
  props: {
    boomboxStyle: { type: 'enum', values: ['classic', 'modern', 'portable', 'monster'], default: 'classic' },
    color: { type: 'enum', values: ['black', 'silver', 'red', 'blue', 'white'], default: 'black' },
    showEqualizer: { type: 'boolean', default: true },
    showCassetteDeck: { type: 'boolean', default: true },
    showRadio: { type: 'boolean', default: true },
    isPlaying: { type: 'boolean', default: false },
    currentTrack: { type: 'string', default: 'Track 01' },
    volume: { type: 'number', default: 75 }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true,
    childrenLabel: 'Boombox Content'
  }
});

componentRegistry.register({
  name: 'MatrixRain',
  component: MatrixRain,
  props: {
    color: { type: 'enum', values: ['green', 'blue', 'red', 'purple', 'cyan', 'white'], default: 'green' },
    speed: { type: 'enum', values: ['slow', 'medium', 'fast', 'ultra'], default: 'medium' },
    density: { type: 'enum', values: ['low', 'medium', 'high', 'extreme'], default: 'medium' },
    characters: { type: 'enum', values: ['katakana', 'binary', 'hex', 'ascii', 'custom'], default: 'katakana' },
    customCharacters: { type: 'string', default: '' },
    fadeEffect: { type: 'boolean', default: true },
    glowEffect: { type: 'boolean', default: true },
    backgroundOpacity: { type: 'number', default: 95 }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true,
    childrenLabel: 'Matrix Content'
  }
});

// Custom HTML component
componentRegistry.register({
  name: 'CustomHTMLElement',
  component: CustomHTMLElement,
  props: mergeWithUniversalProps({
    tagName: { type: 'enum', values: ['div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main'], default: 'div' },
    innerHTML: { type: 'string', default: '' },
    content: { type: 'string', default: '' }, // Alias for innerHTML (used by CanvasRenderer)
    className: { type: 'string', default: '' },
    cssRenderMode: { type: 'enum', values: ['auto', 'inherit', 'custom'] }, // No default - let component handle it
  }, 'container'),
  relationship: {
    type: 'container',
    acceptsChildren: [], // Uses innerHTML instead of React children
  }
});

// Navigation component for Visual Builder
componentRegistry.register({
  name: 'ThreadsteadNavigation',
  component: NavigationPreview,
  props: {
    backgroundColor: { type: 'string', default: 'rgba(0, 0, 0, 0.1)' },
    textColor: { type: 'string', default: 'inherit' },
    opacity: { type: 'number', min: 0, max: 1, default: 1 },
    blur: { type: 'number', min: 0, max: 20, default: 10 },
    borderColor: { type: 'string', default: 'rgba(255, 255, 255, 0.2)' },
    borderWidth: { type: 'number', min: 0, max: 10, default: 1 },
    dropdownBackgroundColor: { type: 'string', default: 'white' },
    dropdownTextColor: { type: 'string', default: '#374151' },
    dropdownBorderColor: { type: 'string', default: '#e5e7eb' },
    dropdownHoverColor: { type: 'string', default: '#f3f4f6' }
  },
  relationship: {
    type: 'leaf' // Navigation cannot have children and cannot be moved
  }
});

/**
 * NOTE: Grid and GridItem are now registered above using the legacy register() method
 * in Phase 4.3. The standardized registration approach will be used in future phases.
 */

/*
// FUTURE: When standardized registration is fully implemented, use this approach:
// Additional examples for when other components are ready:
// Example: Register standardized FlexContainer
componentRegistry.registerStandardized<ContainerProps>({
  name: 'FlexContainer',
  component: FlexContainer,
  category: 'layout',
  description: 'CSS Flexbox container with web-standard properties',
  relationship: {
    type: 'container',
    acceptsChildren: true,
    childrenLabel: 'Flex Items'
  },
  visualBuilderCapabilities: {
    resizable: true,
    positionable: true,
    draggable: true
  },
  examples: {
    flexDirection: [
      { label: 'Row', value: 'row', description: 'Items flow horizontally' },
      { label: 'Column', value: 'column', description: 'Items flow vertically' },
      { label: 'Row Reverse', value: 'row-reverse' },
      { label: 'Column Reverse', value: 'column-reverse' }
    ],
    justifyContent: [
      { label: 'Start', value: 'flex-start' },
      { label: 'Center', value: 'center' },
      { label: 'End', value: 'flex-end' },
      { label: 'Space Between', value: 'space-between' },
      { label: 'Space Around', value: 'space-around' },
      { label: 'Space Evenly', value: 'space-evenly' }
    ],
    gap: [
      { label: 'None', value: '0' },
      { label: 'Small', value: '0.5rem' },
      { label: 'Medium', value: '1rem' },
      { label: 'Large', value: '2rem' }
    ]
  }
});

// Example: Register standardized Paragraph
componentRegistry.registerStandardized<TextContentProps>({
  name: 'Paragraph',
  component: Paragraph,
  category: 'content',
  description: 'Enhanced HTML paragraph element with editable content',
  relationship: {
    type: 'text',
    acceptsChildren: true,
    childrenLabel: 'Text Content'
  },
  visualBuilderCapabilities: {
    resizable: false,
    positionable: true,
    editable: true,
    draggable: true
  },
  examples: {
    fontSize: [
      { label: 'Small', value: '0.875rem' },
      { label: 'Base', value: '1rem' },
      { label: 'Large', value: '1.125rem' },
      { label: 'XL', value: '1.25rem' }
    ],
    color: [
      { label: 'Black', value: '#000000' },
      { label: 'Gray', value: '#6b7280' },
      { label: 'Blue', value: '#3b82f6' }
    ]
  }
});

// Example: Register standardized Grid
componentRegistry.registerStandardized<ContainerProps>({
  name: 'Grid',
  component: Grid,
  category: 'layout',
  description: 'CSS Grid container with web-standard properties',
  relationship: {
    type: 'container',
    acceptsChildren: true, // Accept any component - will auto-wrap in GridItem
    childrenLabel: 'Grid Items',
    defaultChildren: [
      { type: 'GridItem', props: { gridColumn: '1', children: 'Item 1' } },
      { type: 'GridItem', props: { gridColumn: '2', children: 'Item 2' } }
    ]
  },
  visualBuilderCapabilities: {
    resizable: true,
    positionable: true,
    draggable: true
  },
  examples: {
    gridTemplateColumns: [
      { label: '2 Equal Columns', value: 'repeat(2, 1fr)' },
      { label: '3 Equal Columns', value: 'repeat(3, 1fr)' },
      { label: 'Sidebar + Content', value: '200px 1fr' },
      { label: 'Auto Fit', value: 'repeat(auto-fit, minmax(250px, 1fr))' }
    ],
    gap: [
      { label: 'Small', value: '0.5rem' },
      { label: 'Medium', value: '1rem' },
      { label: 'Large', value: '2rem' }
    ]
  }
});
*/