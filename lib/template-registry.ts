// Component registry for user templates
import React from 'react';

// Import template components
import ProfilePhoto from '@/components/template/ProfilePhoto';
import DisplayName from '@/components/template/DisplayName';
import Bio from '@/components/template/Bio';
import BlogPosts from '@/components/template/BlogPosts';
import Guestbook from '@/components/template/Guestbook';
import Tabs, { Tab } from '@/components/template/Tabs';
import ProfileHero from '@/components/template/ProfileHero';
import SimpleTest from '@/components/template/SimpleTest';
import DataDebug from '@/components/template/DataDebug';

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