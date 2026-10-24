// State and Interactive Component Registrations
import { ComponentRegistry } from './template-registry-class';
import { mergeWithUniversalProps } from '@/lib/templates/core/universal-styling';

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
    group: 'logic',
    description: 'Shows a page variable or a piece of page data, with its type, in a small grey box. Handy while you build; take it out when you\'re done.',
    example: '<Var name="books" type="array" initial=\'["Kindred", "Piranesi"]\' />\n<DebugValue var="books" />\n<DebugValue path="guestbook.length" />',
    props: {
      path: { type: 'string', description: 'Page data to show, like owner.displayName or guestbook.length. $vars.name works too.' },
      name: { type: 'string', description: 'A page variable to show.' },
      var: { type: 'string', description: 'Same as name. Wins if you give both.' }
    }
  });

  // Variable Components
  registry.register({
    name: 'Var',
    component: Var,
    group: 'interactive',
    description: 'Makes a page variable: a named value that other components can show and change. It shows nothing itself. Put your Var tags near the top of the page, before anything that uses them.',
    example: '<Var name="cookies" type="number" initial="0" />\n<Button><OnClick><Increment var="cookies" /></OnClick>Leave a cookie</Button>\n<p>Cookies on my porch: <ShowVar name="cookies" /></p>',
    props: {
      name: { type: 'string', required: true, description: 'The variable\'s name. Other components use it to find the value, so keep it unique on the page.' },
      type: {
        description: 'What it holds: number, string (text), boolean (true or false), array (a list), object, date, computed (worked out from other variables), random (one Option picked on each page load) or urlParam (read from the page address). Leave it out and it\'s worked out from initial: initial="0" is a number, "true" a boolean, anything else text. date, computed, random and urlParam always need it.',
        type: 'enum',
        values: ['number', 'string', 'boolean', 'array', 'object', 'date', 'computed', 'random', 'urlParam']
      },
      initial: { type: 'string', description: 'The starting value. For array or object, write JSON in single quotes, like initial=\'["a", "b"]\'; JSON that doesn\'t parse gives an empty one. For date, a day alone like 2024-03-14 counts as midnight UTC and can show as the day before, so add a time: 2024-03-14T12:00.' },
      persist: { type: 'boolean', default: false, description: 'When true, the value is saved in the visitor\'s own browser and comes back on their next visit. Each visitor has their own copy that nobody else sees. Not used for computed, random or urlParam.' },
      expression: { type: 'string', description: 'For type computed: a sum worked out from other variables, like $vars.price * $vars.qty. It updates when they change. You can use + - * / %, comparisons, a ? b : c, Math.round, floor, ceil, min, max, abs, sqrt and pow, Number(), String(), and text and list methods like .toUpperCase(), .trim(), .includes(), .slice(), .replace(), .split(), .padStart(), .join() and .toFixed().' },
      param: { type: 'string', description: 'For type urlParam: the name to read from the page address, like mood for ?mood=sunny.' },
      default: { type: 'string', description: 'For type urlParam: the value to use when the address doesn\'t have that param.' },
      coerce: {
        description: 'For type urlParam: turn the text from the address into a number, a boolean (only the word true counts as true) or an array (split on separator). Without it you get text.',
        type: 'enum',
        values: ['number', 'boolean', 'array']
      },
      separator: { type: 'string', default: ',', description: 'For urlParam with coerce="array": the character that splits the text into a list. A comma by default.' }
    },
    relationship: {
      type: 'leaf',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'Option',
    component: Option,
    group: 'interactive',
    description: 'One choice inside a Select, or one of the values a random Var picks from. It shows nothing on its own.',
    example: '<Var name="tip" type="random">\n  <Option value="Water your plants." />\n  <Option value="Drink some water too." />\n  <Option value="Sign my guestbook." />\n</Var>\n<p>Today\'s tip: <ShowVar name="tip" /></p>',
    props: {
      value: { type: 'string', description: 'What this choice stands for. Always set it: in a Select, text between the tags is only the label, and a random Var keeps text between the tags with brackets around it.' }
    },
    relationship: {
      type: 'leaf',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'ShowVar',
    component: ShowVar,
    group: 'interactive',
    description: 'Shows the current value of a page variable as text, and updates when it changes. Lists and objects show as JSON, and true or false show as the words.',
    example: '<Var name="cookies" type="number" initial="3" />\n<Var name="guest" type="string" />\n<p><ShowVar name="cookies" format="{value} cookies on the porch" /></p>\n<p>Hello, <ShowVar name="guest" fallback="stranger" /></p>',
    props: {
      name: { type: 'string', description: 'The page variable to show. Inside a ForEach, write {book} for the item instead: ShowVar with the item or index name stays blank.' },
      var: { type: 'string', description: 'The same as name. The tags that change a variable say var=, so ShowVar takes it too.' },
      format: { type: 'string', description: 'Text around the value, with {value} where it goes, like "{value} cookies". For an object, {value.title} shows one field.' },
      fallback: { type: 'string', description: 'Text to show while the variable has no value yet. Empty text counts as a value, so then it shows nothing.' },
      dateFormat: {
        description: 'For date variables: short, long, time, datetime, relative (like "3 days ago") or iso. Dates use the visitor\'s own language and time zone. When set on a date, format is ignored.',
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
    group: 'interactive',
    description: 'A clickable button. Put an OnClick inside to say what a click does; everything else inside is the button\'s label.',
    example: '<Var name="lamp" type="boolean" initial="false" />\n<Button><OnClick><Toggle var="lamp" /></OnClick>Flip the lamp</Button>\n<p>Lamp on: <ShowVar name="lamp" /></p>',
    props: {
      id: { type: 'string', description: 'An id for the button, as on any HTML tag.' },
      type: { type: 'enum', values: ['button', 'submit', 'reset'], default: 'button', description: 'button, submit or reset, as in HTML. Leave it as button unless it\'s inside a form.' },
      disabled: { type: 'boolean', default: false, description: 'When true, the button is greyed out and can\'t be clicked.' },
      className: { type: 'string', description: 'Extra classes for your own CSS. It always has the class template-button as well.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'EventDiv',
    component: EventDiv,
    group: 'interactive',
    description: 'A box like a div that reacts to the mouse. Put OnHover, OnMouseEnter or OnMouseLeave directly inside it. OnClick doesn\'t work here; use a Button for clicks.',
    example: '<Var name="pets" type="number" initial="0" />\n<EventDiv style="padding: 1em; border: 2px dashed pink">\n  <OnMouseEnter><Increment var="pets" /></OnMouseEnter>\n  Pet the cat. Pets so far: <ShowVar name="pets" />\n</EventDiv>',
    props: {
      className: { type: 'string', description: 'Extra classes for your own CSS. It always has the class template-event-div as well.' },
      id: { type: 'string', description: 'An id for the box, as on any HTML tag.' },
      style: { type: 'string', css: true, description: 'Inline CSS, written the same way as a div\'s style attribute.' }
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
    group: 'interactive',
    description: 'A text box. Whatever the visitor types goes straight into a page variable. Put an OnChange inside to run actions as they type, or a Validate to check what they typed.',
    example: '<Var name="guest" type="string" />\n<TInput var="guest" placeholder="Your name" />\n<p>Hello, <ShowVar name="guest" fallback="stranger" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The page variable that holds what\'s typed.' },
      type: { type: 'enum', values: ['text', 'email', 'number', 'password', 'url', 'tel'], default: 'text', description: 'text, email, number, password, url or tel, as in HTML. With number the value is saved as a number, and if the Var is a number, clearing the box sets it to 0.' },
      placeholder: { type: 'string', description: 'Grey hint text shown while the box is empty.' },
      min: { type: 'number', description: 'For type number: the lowest value the arrows go to. Visitors can still type a lower one.' },
      max: { type: 'number', description: 'For type number: the highest value the arrows go to. Visitors can still type a higher one.' },
      step: { type: 'number', description: 'For type number: how much each arrow click changes the value.' },
      multiline: { type: 'boolean', default: false, description: 'When true, shows a bigger box for several lines of text. type, min, max and step are then ignored.' },
      rows: { type: 'number', default: 3, description: 'With multiline: how many lines tall the box is. 3 by default.' },
      disabled: { type: 'boolean', default: false, description: 'When true, the box is greyed out and can\'t be typed in.' },
      className: { type: 'string', description: 'Extra classes for your own CSS.' }
    },
    relationship: {
      type: 'interactive',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Checkbox',
    component: Checkbox,
    group: 'interactive',
    description: 'A tick box with a label. Ticking it sets a page variable to true and unticking sets it to false. It doesn\'t take an OnChange.',
    example: '<Var name="watered" type="boolean" initial="false" />\n<Checkbox var="watered" label="I watered the plants today" />\n<p>Watered: <ShowVar name="watered" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The page variable to set. Use a boolean Var.' },
      label: { type: 'string', description: 'Text next to the box. Clicking the text ticks the box too.' },
      disabled: { type: 'boolean', default: false, description: 'When true, the box is greyed out and can\'t be changed.' },
      className: { type: 'string', description: 'Extra classes for your own CSS.' }
    },
    relationship: {
      type: 'interactive',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'DynamicImage',
    component: DynamicImage,
    group: 'interactive',
    description: 'An image whose address comes from a page variable, so a button or timer can swap the picture. While the variable is empty it shows a grey "No image" box.',
    example: '<Var name="pet" type="string" initial="https://example.com/cat.png" />\n<DynamicImage var="pet" alt="One of my pets" width="200px" />\n<Button><OnClick><Cycle var="pet" values="https://example.com/cat.png, https://example.com/dog.png" /></OnClick>Next pet</Button>',
    props: {
      var: { type: 'string', required: true, description: 'The page variable holding the image address.' },
      alt: { type: 'string', description: 'Text describing the image, for screen readers and for when it doesn\'t load.' },
      width: { type: 'string', description: 'A CSS width with a unit, like 200px or 50%. A bare number like 200 is ignored.' },
      height: { type: 'string', description: 'A CSS height with a unit, like 150px. A bare number like 150 is ignored.' },
      className: { type: 'string', description: 'Extra classes for your own CSS.' }
    },
    relationship: {
      type: 'interactive',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'RadioGroup',
    component: RadioGroup,
    group: 'interactive',
    description: 'A set of round buttons where only one can be picked. Put Radio tags inside; the picked one\'s value goes into a page variable. An OnChange inside runs when the pick changes.',
    example: '<Var name="tea" type="string" initial="green" />\n<RadioGroup var="tea" direction="horizontal">\n  <Radio value="green" label="Green" />\n  <Radio value="black" label="Black" />\n  <Radio value="mint" label="Mint" />\n</RadioGroup>\n<p>Brewing: <ShowVar name="tea" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The page variable that holds the picked value.' },
      direction: { type: 'enum', values: ['vertical', 'horizontal'], default: 'vertical', description: 'vertical (stacked, the default) or horizontal (side by side).' },
      className: { type: 'string', description: 'Extra classes for your own CSS.' }
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
    group: 'interactive',
    description: 'One choice in a RadioGroup. It must sit inside a RadioGroup; on its own it shows an error box instead.',
    example: '<Var name="weather" type="string" initial="rain" />\n<RadioGroup var="weather">\n  <Radio value="rain" label="Rainy" />\n  <Radio value="sun" label="Sunny" />\n  <Radio value="snow" label="Snowy (not this year)" disabled="true" />\n</RadioGroup>',
    props: {
      value: { type: 'string', required: true, description: 'The value saved into the group\'s variable when this one is picked.' },
      label: { type: 'string', description: 'Text next to the button. Leave it out to show the value.' },
      disabled: { type: 'boolean', default: false, description: 'When true, this choice is greyed out and can\'t be picked.' },
      className: { type: 'string', description: 'Extra classes for your own CSS.' }
    },
    relationship: {
      type: 'leaf',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Slider',
    component: Slider,
    group: 'interactive',
    description: 'A slider for picking a number between min and max. The page variable updates as it slides. An OnChange inside runs when the visitor lets go of it with the mouse or a finger; moving it with the keyboard doesn\'t run OnChange.',
    example: '<Var name="cozy" type="number" initial="5" />\n<Slider var="cozy" min="0" max="10" label="How cozy is it in here" showValue="true" />\n<p>Cozy level: <ShowVar name="cozy" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The page variable to set. Use a number Var; otherwise the slider starts at min.' },
      min: { type: 'number', required: true, description: 'The lowest value. It\'s also shown under the left end.' },
      max: { type: 'number', required: true, description: 'The highest value. It\'s also shown under the right end.' },
      step: { type: 'number', default: 1, description: 'How far each notch moves. 1 by default.' },
      showValue: { type: 'boolean', default: false, description: 'When true, shows the current number next to the label. It only shows if label is set too.' },
      label: { type: 'string', description: 'Text above the slider.' },
      className: { type: 'string', description: 'Extra classes for your own CSS.' },
      disabled: { type: 'boolean', default: false, description: 'When true, the slider is greyed out and can\'t be moved.' }
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
    group: 'interactive',
    description: 'A drop-down list. Put Option tags inside for the choices; the picked one\'s value goes into a page variable. An OnChange inside runs when the pick changes.',
    example: '<Var name="mood" type="string" initial="" />\n<Select var="mood" placeholder="How are you today?">\n  <Option value="cozy">Cozy</Option>\n  <Option value="sleepy">Sleepy</Option>\n  <Option value="giddy">Giddy</Option>\n</Select>\n<p>Feeling: <ShowVar name="mood" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The page variable that holds the picked Option\'s value.' },
      placeholder: { type: 'string', description: 'A greyed-out first line shown while nothing is picked. It can\'t be picked itself.' },
      className: { type: 'string', description: 'Extra classes for your own CSS.' },
      disabled: { type: 'boolean', default: false, description: 'When true, the list is greyed out and can\'t be changed.' }
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
    group: 'interactive',
    description: 'A color swatch that opens the browser\'s color chooser. The picked color goes into a page variable as a code like #ff99cc, and the code shows next to the swatch.',
    example: '<Var name="fave" type="string" initial="#ff99cc" />\n<ColorPicker var="fave" label="Pick my new favorite color" />\n<p>You picked <ShowVar name="fave" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The page variable to set. Start it with a six-digit code like #ff99cc; anything else shows as black.' },
      label: { type: 'string', description: 'Text before the swatch.' },
      className: { type: 'string', description: 'Extra classes for your own CSS.' },
      disabled: { type: 'boolean', default: false, description: 'When true, the swatch is greyed out and can\'t be changed.' }
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
    group: 'interactive',
    description: 'Left from an older editor. For new pages, write the HTML straight into your page instead.',
    example: '<CustomHTMLElement tagName="aside" content="Now playing: Cocteau Twins" />',
    props: mergeWithUniversalProps({
      tagName: { type: 'enum', values: ['div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main'], default: 'div', description: 'Which tag wraps the HTML: div (the default), span, section, article, aside, header, footer or main.' },
      innerHTML: { type: 'string', default: '', description: 'What goes inside, written as text in the attribute.' },
      content: { type: 'string', default: '', description: 'Same as innerHTML. If both are set, content wins.' },
      className: { type: 'string', default: '', description: 'Extra classes for your own CSS.' },
      cssRenderMode: { type: 'enum', values: ['auto', 'inherit', 'custom'], description: 'How headings, paragraphs and lists inside are styled: auto (the default) gives them normal browser-like sizes and spacing, custom does a lighter version of that, and inherit leaves them to your own CSS.' },
    }, 'container'),
    relationship: {
      type: 'container',
      acceptsChildren: [],
    }
  });
}
