// Event Handler, Loop, and Temporal Component Registrations
import { ComponentRegistry } from './template-registry-class';

// Import event handlers
import OnClick from '@/components/features/templates/state/events/OnClick';
import OnChange from '@/components/features/templates/state/events/OnChange';
import OnMount from '@/components/features/templates/state/events/OnMount';
import OnInterval from '@/components/features/templates/state/events/OnInterval';
import OnHover from '@/components/features/templates/state/events/OnHover';
import OnMouseEnter from '@/components/features/templates/state/events/OnMouseEnter';
import OnMouseLeave from '@/components/features/templates/state/events/OnMouseLeave';
import OnKeyPress from '@/components/features/templates/state/events/OnKeyPress';
import OnVisible from '@/components/features/templates/state/events/OnVisible';

// Import loop components
import ForEach from '@/components/features/templates/state/loops/ForEach';
import Break from '@/components/features/templates/state/loops/Break';
import Continue from '@/components/features/templates/state/loops/Continue';

// Import validation
import Validate from '@/components/features/templates/state/validation/Validate';

// Import temporal controls
import Delay from '@/components/features/templates/state/temporal/Delay';
import Sequence from '@/components/features/templates/state/temporal/Sequence';
import Step from '@/components/features/templates/state/temporal/Step';
import Timeout from '@/components/features/templates/state/temporal/Timeout';
import OnTimeout from '@/components/features/templates/state/temporal/OnTimeout';

/**
 * Register all event handler, loop, and temporal components
 */
export function registerEventComponents(registry: ComponentRegistry) {
  // Event Handlers
  registry.register({
    name: 'OnClick',
    component: OnClick,
    props: {},
    relationship: {
      type: 'container',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'OnChange',
    component: OnChange,
    props: {
      debounce: { type: 'number', default: 0 }
    },
    relationship: {
      type: 'action',
      acceptsChildren: true,
      childrenLabel: 'Actions to Execute'
    }
  });

  registry.register({
    name: 'OnMount',
    component: OnMount,
    props: {},
    relationship: {
      type: 'action',
      acceptsChildren: true,
      childrenLabel: 'Actions to Execute'
    }
  });

  registry.register({
    name: 'OnInterval',
    component: OnInterval,
    props: {
      seconds: { type: 'number' },
      milliseconds: { type: 'number' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: true,
      childrenLabel: 'Actions to Execute'
    }
  });

  registry.register({
    name: 'OnHover',
    component: OnHover,
    props: {},
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'OnMouseEnter',
    component: OnMouseEnter,
    props: {},
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'OnMouseLeave',
    component: OnMouseLeave,
    props: {},
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'OnKeyPress',
    component: OnKeyPress,
    props: {
      keyName: { type: 'string', required: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'OnVisible',
    component: OnVisible,
    props: {
      threshold: { type: 'number', default: 0.5 },
      once: { type: 'boolean', default: true }
    },
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  // Loop Components
  registry.register({
    name: 'ForEach',
    component: ForEach,
    props: {
      var: { type: 'string', required: true },
      item: { type: 'string', required: true },
      index: { type: 'string' },
      className: { type: 'string' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'Break',
    component: Break,
    props: {
      when: { type: 'string', required: false },
      condition: { type: 'string', required: false }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Continue',
    component: Continue,
    props: {
      when: { type: 'string', required: false }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  // Validation
  registry.register({
    name: 'Validate',
    component: Validate,
    props: {
      var: { type: 'string' },
      pattern: { type: 'string' },
      required: { type: 'boolean', default: false },
      min: { type: 'number' },
      max: { type: 'number' },
      minLength: { type: 'number' },
      maxLength: { type: 'number' },
      message: { type: 'string', required: true }
    },
    relationship: {
      type: 'leaf',
      acceptsChildren: false
    }
  });

  // Temporal Controls
  registry.register({
    name: 'Delay',
    component: Delay,
    props: {
      seconds: { type: 'number', required: false },
      milliseconds: { type: 'number', required: false }
    },
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'Sequence',
    component: Sequence,
    props: {},
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'Step',
    component: Step,
    props: {
      delay: { type: 'number', default: 0 }
    },
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'Timeout',
    component: Timeout,
    props: {
      seconds: { type: 'number', required: false },
      milliseconds: { type: 'number', required: false }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'OnTimeout',
    component: OnTimeout,
    props: {},
    relationship: {
      type: 'action',
      acceptsChildren: true,
      childrenLabel: 'Actions to Execute'
    }
  });
}
