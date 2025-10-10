// Action Component Registrations
import { ComponentRegistry } from './template-registry-class';

// Import action components
import Set from '@/components/features/templates/state/actions/Set';
import Increment from '@/components/features/templates/state/actions/Increment';
import Decrement from '@/components/features/templates/state/actions/Decrement';
import Toggle from '@/components/features/templates/state/actions/Toggle';
import ShowToast from '@/components/features/templates/state/actions/ShowToast';
import Push from '@/components/features/templates/state/actions/Push';
import Pop from '@/components/features/templates/state/actions/Pop';
import RemoveAt from '@/components/features/templates/state/actions/RemoveAt';
import ArrayAt from '@/components/features/templates/state/actions/ArrayAt';
import Append from '@/components/features/templates/state/actions/Append';
import Prepend from '@/components/features/templates/state/actions/Prepend';
import Cycle from '@/components/features/templates/state/actions/Cycle';
import Reset from '@/components/features/templates/state/actions/Reset';
import AddClass from '@/components/features/templates/state/actions/AddClass';
import RemoveClass from '@/components/features/templates/state/actions/RemoveClass';
import ToggleClass from '@/components/features/templates/state/actions/ToggleClass';
import SetCSSVar from '@/components/features/templates/state/actions/SetCSSVar';
import CopyToClipboard from '@/components/features/templates/state/actions/CopyToClipboard';
import SetURLParam from '@/components/features/templates/state/actions/SetURLParam';
import SetURLHash from '@/components/features/templates/state/actions/SetURLHash';
import Count from '@/components/features/templates/state/actions/Count';
import Sum from '@/components/features/templates/state/actions/Sum';
import Get from '@/components/features/templates/state/actions/Get';
import Filter from '@/components/features/templates/state/actions/Filter';
import Find from '@/components/features/templates/state/actions/Find';
import Transform from '@/components/features/templates/state/actions/Transform';
import Sort from '@/components/features/templates/state/actions/Sort';
import Clone from '@/components/features/templates/state/actions/Clone';
import Merge from '@/components/features/templates/state/actions/Merge';
import ObjectSet from '@/components/features/templates/state/actions/ObjectSet';
import Extract from '@/components/features/templates/state/actions/Extract';
import Property from '@/components/features/templates/state/actions/Property';
import ConditionalAttr from '@/components/features/templates/state/actions/ConditionalAttr';

/**
 * Register all action components
 */
export function registerActionComponents(registry: ComponentRegistry) {
  // Basic Actions
  registry.register({
    name: 'Set',
    component: Set,
    props: {
      var: { type: 'string', required: true },
      value: { type: 'string' },
      expression: { type: 'string' }
    },
    relationship: {
      type: 'leaf',
      acceptsChildren: []
    }
  });

  registry.register({
    name: 'Increment',
    component: Increment,
    props: {
      var: { type: 'string', required: true },
      by: { type: 'number', default: 1 },
      min: { type: 'number' },
      max: { type: 'number' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Decrement',
    component: Decrement,
    props: {
      var: { type: 'string', required: true },
      by: { type: 'number', default: 1 },
      min: { type: 'number' },
      max: { type: 'number' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Toggle',
    component: Toggle,
    props: {
      var: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'ShowToast',
    component: ShowToast,
    props: {
      message: { type: 'string', required: true },
      type: { type: 'enum', values: ['success', 'error', 'warning', 'info', 'loading'], default: 'success' },
      duration: { type: 'number', default: 3000 },
      position: { type: 'enum', values: ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  // Array Actions
  registry.register({
    name: 'Push',
    component: Push,
    props: {
      var: { type: 'string', required: true },
      value: { type: 'string' },
      expression: { type: 'string' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Pop',
    component: Pop,
    props: {
      var: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'RemoveAt',
    component: RemoveAt,
    props: {
      var: { type: 'string', required: true },
      index: { type: 'string' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'ArrayAt',
    component: ArrayAt,
    props: {
      var: { type: 'string', required: true },
      array: { type: 'string', required: true },
      index: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  // String Actions
  registry.register({
    name: 'Append',
    component: Append,
    props: {
      var: { type: 'string', required: true },
      value: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Prepend',
    component: Prepend,
    props: {
      var: { type: 'string', required: true },
      value: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  // Other Basic Actions
  registry.register({
    name: 'Cycle',
    component: Cycle,
    props: {
      var: { type: 'string', required: true },
      values: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Reset',
    component: Reset,
    props: {
      var: { type: 'string' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  // CSS Manipulation Actions
  registry.register({
    name: 'AddClass',
    component: AddClass,
    props: {
      target: { type: 'string', required: true },
      className: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'RemoveClass',
    component: RemoveClass,
    props: {
      target: { type: 'string', required: true },
      className: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'ToggleClass',
    component: ToggleClass,
    props: {
      target: { type: 'string', required: true },
      className: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'SetCSSVar',
    component: SetCSSVar,
    props: {
      name: { type: 'string', required: true },
      value: { type: 'string' },
      expression: { type: 'string' },
      target: { type: 'string', default: ':root' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  // Utility Actions
  registry.register({
    name: 'CopyToClipboard',
    component: CopyToClipboard,
    props: {
      value: { type: 'string' },
      expression: { type: 'string' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'SetURLParam',
    component: SetURLParam,
    props: {
      key: { type: 'string', required: true },
      value: { type: 'string' },
      expression: { type: 'string' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'SetURLHash',
    component: SetURLHash,
    props: {
      value: { type: 'string' },
      expression: { type: 'string' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  // Collection Operations
  registry.register({
    name: 'Count',
    component: Count,
    props: {
      var: { type: 'string', required: true },
      target: { type: 'string', required: true },
      where: { type: 'string', required: false }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Sum',
    component: Sum,
    props: {
      var: { type: 'string', required: true },
      target: { type: 'string', required: true },
      property: { type: 'string', required: false }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Get',
    component: Get,
    props: {
      from: { type: 'string', required: true },
      at: { type: 'string', required: true },
      target: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Filter',
    component: Filter,
    props: {
      var: { type: 'string', required: true },
      target: { type: 'string', required: true },
      where: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Find',
    component: Find,
    props: {
      var: { type: 'string', required: true },
      target: { type: 'string', required: true },
      where: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Transform',
    component: Transform,
    props: {
      var: { type: 'string', required: true },
      target: { type: 'string', required: true },
      expression: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Sort',
    component: Sort,
    props: {
      var: { type: 'string', required: true },
      target: { type: 'string', required: true },
      by: { type: 'string', required: true },
      order: { type: 'enum', values: ['asc', 'desc'], default: 'asc' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  // Advanced State Management
  registry.register({
    name: 'Clone',
    component: Clone,
    props: {
      var: { type: 'string', required: true },
      target: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Merge',
    component: Merge,
    props: {
      sources: { type: 'string', required: true },
      target: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'ObjectSet',
    component: ObjectSet,
    props: {
      var: { type: 'string', required: true },
      path: { type: 'string', required: true },
      value: { type: 'string', required: false },
      expression: { type: 'string', required: false }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Extract',
    component: Extract,
    props: {
      from: { type: 'string', required: true }
    },
    relationship: {
      type: 'container',
      acceptsChildren: ['Property'],
      childrenLabel: 'Properties to Extract'
    }
  });

  registry.register({
    name: 'Property',
    component: Property,
    props: {
      path: { type: 'string', required: true },
      as: { type: 'string', required: true }
    },
    relationship: {
      type: 'child',
      requiresParent: 'Extract',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'ConditionalAttr',
    component: ConditionalAttr,
    props: {
      element: { type: 'string', required: true },
      attribute: { type: 'string', required: true },
      when: { type: 'string', required: false },
      value: { type: 'string', default: 'true' }
    },
    relationship: {
      type: 'interactive',
      acceptsChildren: false
    }
  });
}
