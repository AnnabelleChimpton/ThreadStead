// Component registry for user templates
import React from 'react';

// Import template components
import ProfilePhoto from '@/components/template/ProfilePhoto';
import DisplayName from '@/components/template/DisplayName';
import Bio from '@/components/template/Bio';
import BlogPosts from '@/components/template/BlogPosts';
import Guestbook from '@/components/template/Guestbook';
import FollowButton from '@/components/template/FollowButton';
import MutualFriends from '@/components/template/MutualFriends';
import FriendBadge from '@/components/template/FriendBadge';
import FriendDisplay from '@/components/template/FriendDisplay';
import WebsiteDisplay from '@/components/template/WebsiteDisplay';
import NotificationCenter from '@/components/template/NotificationCenter';
import NotificationBell from '@/components/template/NotificationBell';
import UserAccount from '@/components/template/UserAccount';
import SiteBranding from '@/components/template/SiteBranding';
import NavigationLinks from '@/components/template/NavigationLinks';
import Breadcrumb from '@/components/template/Breadcrumb';
import FlexContainer from '@/components/template/FlexContainer';
import GridLayout from '@/components/template/GridLayout';
import SplitLayout from '@/components/template/SplitLayout';
import CenteredBox from '@/components/template/CenteredBox';
import GradientBox from '@/components/template/GradientBox';
import NeonBorder from '@/components/template/NeonBorder';
import RetroTerminal from '@/components/template/RetroTerminal';
import PolaroidFrame from '@/components/template/PolaroidFrame';
import StickyNote from '@/components/template/StickyNote';
import RevealBox from '@/components/template/RevealBox';
import FloatingBadge from '@/components/template/FloatingBadge';
import WaveText from '@/components/template/WaveText';
import GlitchText from '@/components/template/GlitchText';
import Tabs, { Tab } from '@/components/template/Tabs';
import ProfileHero from '@/components/template/ProfileHero';
import SimpleTest from '@/components/template/SimpleTest';
import DataDebug from '@/components/template/DataDebug';
import RetroCard from '@/components/layout/RetroCard';

// Define the shape of prop schemas
export type PropType = 'string' | 'number' | 'boolean' | 'enum';

export interface PropSchema {
  type: PropType;
  required?: boolean;
  default?: any;
  values?: readonly string[]; // for enum type
  min?: number; // for number type
  max?: number; // for number type
}

export interface ComponentRegistration {
  name: string;
  component: React.ComponentType<any>;
  props: Record<string, PropSchema>;
  fromAttrs?: (attrs: Record<string, string>) => Record<string, any>;
}

// Prop validation and coercion utilities
export function validateAndCoerceProp(value: any, schema: PropSchema): any {
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
  attrs: Record<string, any>, 
  propSchemas: Record<string, PropSchema>
): Record<string, any> {
  const result: Record<string, any> = {};
  const warnings: string[] = [];

  // Validate provided attrs
  for (const [key, value] of Object.entries(attrs)) {
    const schema = propSchemas[key];
    if (!schema) {
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
        result[key] = schema.default;
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
    return this.components.get(name);
  }

  getAllowedTags(): string[] {
    return Array.from(this.components.keys());
  }

  getAllowedAttributes(tagName: string): string[] {
    const registration = this.components.get(tagName);
    if (!registration) return [];
    return Object.keys(registration.props);
  }
}

// Create the default registry instance
export const componentRegistry = new ComponentRegistry();

// Register all components
componentRegistry.register({
  name: 'ProfilePhoto',
  component: ProfilePhoto,
  props: {
    size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' },
    shape: { type: 'enum', values: ['circle', 'square'], default: 'circle' }
  }
});

componentRegistry.register({
  name: 'DisplayName',
  component: DisplayName,
  props: {}
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
  name: 'NavigationLinks',
  component: NavigationLinks,
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
    gap: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' }
  }
});

componentRegistry.register({
  name: 'GridLayout',
  component: GridLayout,
  props: {
    columns: { type: 'enum', values: ['1', '2', '3', '4', '5', '6'], default: '2' },
    gap: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' },
    responsive: { type: 'boolean', default: true }
  }
});

componentRegistry.register({
  name: 'SplitLayout',
  component: SplitLayout,
  props: {
    ratio: { type: 'enum', values: ['1:1', '1:2', '2:1', '1:3', '3:1'], default: '1:1' },
    vertical: { type: 'boolean', default: false },
    gap: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' }
  }
});

componentRegistry.register({
  name: 'CenteredBox',
  component: CenteredBox,
  props: {
    maxWidth: { type: 'enum', values: ['sm', 'md', 'lg', 'xl', '2xl', 'full'], default: 'lg' },
    padding: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' }
  }
});

componentRegistry.register({
  name: 'GradientBox',
  component: GradientBox,
  props: {
    gradient: { type: 'enum', values: ['sunset', 'ocean', 'forest', 'neon', 'rainbow', 'fire'], default: 'sunset' },
    direction: { type: 'enum', values: ['r', 'l', 'b', 't', 'br', 'bl', 'tr', 'tl'], default: 'br' },
    padding: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' },
    rounded: { type: 'boolean', default: true }
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
  }
});

componentRegistry.register({
  name: 'RetroTerminal',
  component: RetroTerminal,
  props: {
    variant: { type: 'enum', values: ['green', 'amber', 'blue', 'white'], default: 'green' },
    showHeader: { type: 'boolean', default: true },
    padding: { type: 'enum', values: ['xs', 'sm', 'md', 'lg', 'xl'], default: 'md' }
  }
});

componentRegistry.register({
  name: 'PolaroidFrame',
  component: PolaroidFrame,
  props: {
    caption: { type: 'string', default: '' },
    rotation: { type: 'number', min: -15, max: 15, default: 0 },
    shadow: { type: 'boolean', default: true }
  }
});

componentRegistry.register({
  name: 'StickyNote',
  component: StickyNote,
  props: {
    color: { type: 'enum', values: ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'], default: 'yellow' },
    size: { type: 'enum', values: ['sm', 'md', 'lg'], default: 'md' },
    rotation: { type: 'number', min: -15, max: 15, default: 0 }
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
  props: {}
});

componentRegistry.register({
  name: 'Tab',
  component: Tab,
  props: {
    title: { type: 'string', required: true }
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
  name: 'SimpleTest',
  component: SimpleTest,
  props: {
    message: { type: 'string', default: 'Hello from SimpleTest!' }
  }
});

componentRegistry.register({
  name: 'DataDebug',
  component: DataDebug,
  props: {}
});

componentRegistry.register({
  name: 'RetroCard',
  component: RetroCard,
  props: {}
});