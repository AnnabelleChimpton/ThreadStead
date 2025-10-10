// State and Interactive Component Registrations
import { ComponentRegistry } from './template-registry-class';
import { mergeWithUniversalProps } from '@/lib/templates/visual-builder/universal-styling';

// Import state/interactive components
import Var, { Option } from '@/components/features/templates/state/Var';
import ShowVar from '@/components/features/templates/state/ShowVar';
import Button from '@/components/features/templates/Button';
import EventDiv from '@/components/features/templates/EventDiv';
import TInput from '@/components/features/templates/state/inputs/TInput';
import Checkbox from '@/components/features/templates/state/inputs/Checkbox';
import DynamicImage from '@/components/features/templates/state/DynamicImage';
import RadioGroup, { Radio } from '@/components/features/templates/state/inputs/RadioGroup';
import Slider from '@/components/features/templates/state/inputs/Slider';
import Select from '@/components/features/templates/state/inputs/Select';
import ColorPicker from '@/components/features/templates/state/inputs/ColorPicker';
import CustomHTMLElement from '@/components/features/templates/CustomHTMLElement';
import DebugValue from '@/components/features/templates/DebugValue';

/**
 * Register all state and interactive components
 */
export function registerStateComponents(registry: ComponentRegistry) {
  // Debug Components
  registry.register({
    name: 'DebugValue',
    component: DebugValue,
    props: {
      path: { type: 'string' },
      name: { type: 'string' },
      var: { type: 'string' }
    }
  });

  // Variable Components
  registry.register({
    name: 'Var',
    component: Var,
    props: {
      name: { type: 'string', required: true },
      type: {
        type: 'enum',
        values: ['number', 'string', 'boolean', 'array', 'object', 'date', 'computed', 'random', 'urlParam'],
        required: true
      },
      initial: { type: 'string' },
      persist: { type: 'boolean', default: false },
      expression: { type: 'string' },
      param: { type: 'string' },
      default: { type: 'string' },
      coerce: {
        type: 'enum',
        values: ['number', 'boolean', 'array']
      },
      separator: { type: 'string', default: ',' }
    },
    relationship: {
      type: 'leaf',
      acceptsChildren: true
    }
  });

  registry.register({
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

  registry.register({
    name: 'ShowVar',
    component: ShowVar,
    props: {
      name: { type: 'string', required: true },
      format: { type: 'string' },
      fallback: { type: 'string' },
      dateFormat: {
        type: 'enum',
        values: ['short', 'long', 'time', 'datetime', 'relative', 'iso']
      }
    },
    relationship: {
      type: 'leaf',
      acceptsChildren: []
    }
  });

  // Interactive Components
  registry.register({
    name: 'Button',
    component: Button,
    props: {
      id: { type: 'string' },
      type: { type: 'enum', values: ['button', 'submit', 'reset'], default: 'button' },
      disabled: { type: 'boolean', default: false },
      className: { type: 'string' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'EventDiv',
    component: EventDiv,
    props: {
      className: { type: 'string' },
      class: { type: 'string' },
      id: { type: 'string' },
      style: { type: 'string' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true
    }
  });

  // Input Components
  registry.register({
    name: 'TInput',
    component: TInput,
    props: {
      var: { type: 'string', required: true },
      type: { type: 'enum', values: ['text', 'email', 'number', 'password', 'url', 'tel'], default: 'text' },
      placeholder: { type: 'string' },
      min: { type: 'number' },
      max: { type: 'number' },
      step: { type: 'number' },
      multiline: { type: 'boolean', default: false },
      rows: { type: 'number', default: 3 },
      disabled: { type: 'boolean', default: false },
      className: { type: 'string' }
    },
    relationship: {
      type: 'interactive',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Checkbox',
    component: Checkbox,
    props: {
      var: { type: 'string', required: true },
      label: { type: 'string' },
      disabled: { type: 'boolean', default: false },
      className: { type: 'string' }
    },
    relationship: {
      type: 'interactive',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'DynamicImage',
    component: DynamicImage,
    props: {
      var: { type: 'string', required: true },
      alt: { type: 'string' },
      width: { type: 'string' },
      height: { type: 'string' },
      className: { type: 'string' }
    },
    relationship: {
      type: 'interactive',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'RadioGroup',
    component: RadioGroup,
    props: {
      var: { type: 'string', required: true },
      direction: { type: 'enum', values: ['vertical', 'horizontal'], default: 'vertical' },
      className: { type: 'string' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Radio Options'
    }
  });

  registry.register({
    name: 'Radio',
    component: Radio,
    props: {
      value: { type: 'string', required: true },
      label: { type: 'string' },
      disabled: { type: 'boolean', default: false },
      className: { type: 'string' }
    },
    relationship: {
      type: 'leaf',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Slider',
    component: Slider,
    props: {
      var: { type: 'string', required: true },
      min: { type: 'number', required: true },
      max: { type: 'number', required: true },
      step: { type: 'number', default: 1 },
      showValue: { type: 'boolean', default: false },
      label: { type: 'string' },
      className: { type: 'string' },
      disabled: { type: 'boolean', default: false }
    },
    relationship: {
      type: 'leaf',
      acceptsChildren: true,
      childrenLabel: 'OnChange Handler'
    }
  });

  registry.register({
    name: 'Select',
    component: Select,
    props: {
      var: { type: 'string', required: true },
      placeholder: { type: 'string' },
      className: { type: 'string' },
      disabled: { type: 'boolean', default: false }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true,
      childrenLabel: 'Options'
    }
  });

  registry.register({
    name: 'ColorPicker',
    component: ColorPicker,
    props: {
      var: { type: 'string', required: true },
      label: { type: 'string' },
      className: { type: 'string' },
      disabled: { type: 'boolean', default: false }
    },
    relationship: {
      type: 'leaf',
      acceptsChildren: true,
      childrenLabel: 'OnChange Handler'
    }
  });

  // Custom HTML
  registry.register({
    name: 'CustomHTMLElement',
    component: CustomHTMLElement,
    props: mergeWithUniversalProps({
      tagName: { type: 'enum', values: ['div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main'], default: 'div' },
      innerHTML: { type: 'string', default: '' },
      content: { type: 'string', default: '' },
      className: { type: 'string', default: '' },
      cssRenderMode: { type: 'enum', values: ['auto', 'inherit', 'custom'] },
    }, 'container'),
    relationship: {
      type: 'container',
      acceptsChildren: [],
    }
  });
}
