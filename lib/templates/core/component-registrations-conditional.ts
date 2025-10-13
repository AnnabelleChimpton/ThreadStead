// Conditional Rendering Component Registrations
import { ComponentRegistry } from './template-registry-class';

// Import conditional rendering components
import Choose, { When, Otherwise } from '@/components/features/templates/conditional/Choose';
import IfOwner, { IfVisitor } from '@/components/features/templates/conditional/IfOwner';
import If from '@/components/features/templates/state/conditional/If';
import ElseIf from '@/components/features/templates/state/conditional/ElseIf';
import Else from '@/components/features/templates/state/conditional/Else';
import Switch from '@/components/features/templates/state/conditional/Switch';
import Case from '@/components/features/templates/state/conditional/Case';
import Default from '@/components/features/templates/state/conditional/Default';

/**
 * Register all conditional rendering components
 */
export function registerConditionalComponents(registry: ComponentRegistry) {
  // Display Conditionals (for rendering UI conditionally)
  registry.register({
    name: 'Choose',
    component: Choose,
    props: {}
  });

  registry.register({
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

  registry.register({
    name: 'Otherwise',
    component: Otherwise,
    props: {}
  });

  registry.register({
    name: 'IfOwner',
    component: IfOwner,
    props: {}
  });

  registry.register({
    name: 'IfVisitor',
    component: IfVisitor,
    props: {}
  });

  // Action Conditionals (for conditional action execution)
  registry.register({
    name: 'If',
    component: If,
    props: {
      condition: { type: 'string' },
      data: { type: 'string' },
      equals: { type: 'string' },
      notEquals: { type: 'string' },
      greaterThan: { type: 'string' },
      lessThan: { type: 'string' },
      greaterThanOrEqual: { type: 'string' },
      lessThanOrEqual: { type: 'string' },
      contains: { type: 'string' },
      startsWith: { type: 'string' },
      endsWith: { type: 'string' },
      matches: { type: 'string' },
      exists: { type: 'boolean' },
      and: { type: 'string' },
      or: { type: 'string' },
      not: { type: 'string' }
    },
    relationship: {
      type: 'conditional-action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'ElseIf',
    component: ElseIf,
    props: {
      condition: { type: 'string' },
      data: { type: 'string' },
      equals: { type: 'string' },
      notEquals: { type: 'string' },
      greaterThan: { type: 'string' },
      lessThan: { type: 'string' },
      greaterThanOrEqual: { type: 'string' },
      lessThanOrEqual: { type: 'string' },
      contains: { type: 'string' },
      startsWith: { type: 'string' },
      endsWith: { type: 'string' },
      matches: { type: 'string' },
      exists: { type: 'boolean' },
      and: { type: 'string' },
      or: { type: 'string' },
      not: { type: 'string' }
    },
    relationship: {
      type: 'conditional-action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'Else',
    component: Else,
    props: {},
    relationship: {
      type: 'conditional-action',
      acceptsChildren: true
    }
  });

  // Pattern Matching
  registry.register({
    name: 'Switch',
    component: Switch,
    props: {
      value: { type: 'string' },
      expression: { type: 'string' }
    },
    relationship: {
      type: 'conditional-action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'Case',
    component: Case,
    props: {
      value: { type: 'string' },
      when: { type: 'string' },
      equals: { type: 'string' },
      notEquals: { type: 'string' },
      greaterThan: { type: 'string' },
      lessThan: { type: 'string' },
      greaterThanOrEqual: { type: 'string' },
      lessThanOrEqual: { type: 'string' },
      contains: { type: 'string' },
      startsWith: { type: 'string' },
      endsWith: { type: 'string' },
      matches: { type: 'string' }
    },
    relationship: {
      type: 'conditional-action',
      acceptsChildren: true,
      requiresParent: 'Switch'
    }
  });

  registry.register({
    name: 'Default',
    component: Default,
    props: {},
    relationship: {
      type: 'conditional-action',
      acceptsChildren: true,
      requiresParent: 'Switch'
    }
  });
}
