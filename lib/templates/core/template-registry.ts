// Component registry for user templates
import React from 'react';

// Import universal styling system
import { mergeWithUniversalProps } from '@/lib/templates/visual-builder/universal-styling';

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

// Import conditional rendering components
import Show from '@/components/features/templates/conditional/Show';
import Choose, { When, Otherwise } from '@/components/features/templates/conditional/Choose';
import IfOwner, { IfVisitor } from '@/components/features/templates/conditional/IfOwner';

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


  // Validate provided attrs
  for (const [key, value] of Object.entries(attrs)) {
    const schema = propSchemas[key];
    if (!schema) {
      // Allow special props to pass through for all components without warning
      if (key === 'className' || key.startsWith('_')) {
        // Allow className and internal props (like _size, _positioningMode, etc.)
        result[key] = value;
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

// Component registry class
export class ComponentRegistry {
  private components = new Map<string, ComponentRegistration>();

  register(registration: ComponentRegistration) {
    this.components.set(registration.name, registration);
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

  getAllowedTags(): string[] {
    return Array.from(this.components.keys());
  }

  getAllowedAttributes(tagName: string): string[] {
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
  props: {
    content: { type: 'string', default: 'Edit this text' },
    tag: { type: 'enum', values: ['div', 'span', 'p'], default: 'div' }
  },
  relationship: {
    type: 'text',
    acceptsChildren: true,
    childrenLabel: 'Text Content'
  }
});

componentRegistry.register({
  name: 'Heading',
  component: Heading,
  props: {
    content: { type: 'string', default: 'Heading Text' },
    level: { type: 'enum', values: ['1', '2', '3', '4', '5', '6'], default: '2' }
  },
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
  props: {
    as: { type: 'enum', values: ['h1', 'h2', 'h3', 'span', 'div'], default: 'h2' },
    showLabel: { type: 'boolean', default: false }
  }
});

componentRegistry.register({
  name: 'Bio',
  component: Bio,
  props: {}
});

componentRegistry.register({
  name: 'BlogPosts',
  component: BlogPosts,
  props: {
    limit: { type: 'number', min: 1, max: 20, default: 5 }
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
    columns: { type: 'enum', values: ['1', '2', '3', '4', '5', '6'], default: '2' },
    gap: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' },
    responsive: { type: 'boolean', default: true }
  },
  relationship: {
    type: 'container',
    acceptsChildren: true, // Can accept any children
    childrenLabel: 'Grid Items'
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
    when: { type: 'string' },
    data: { type: 'string' },
    equals: { type: 'string' },
    exists: { type: 'string' }
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
    condition: { type: 'string' },
    data: { type: 'string' },
    equals: { type: 'string' },
    exists: { type: 'boolean' }
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