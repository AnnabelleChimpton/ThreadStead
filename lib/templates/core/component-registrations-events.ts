// Event Handler, Loop, and Temporal Component Registrations
import { ComponentRegistry } from './template-registry-class';

// Import event handlers
import OnClick from '@/components/features/templates/state/events/OnClick';
import OnChange from '@/components/features/templates/state/events/OnChange';
import OnMount from '@/components/features/templates/state/events/OnMount';
import OnInterval from '@/components/features/templates/state/events/OnInterval';
import OnMouseEnter from '@/components/features/templates/state/events/OnMouseEnter';
import OnMouseLeave from '@/components/features/templates/state/events/OnMouseLeave';
import OnKeyPress from '@/components/features/templates/state/events/OnKeyPress';
import OnKeyUp from '@/components/features/templates/state/events/OnKeyUp';
import OnSwipe from '@/components/features/templates/state/events/OnSwipe';
import OnVisible from '@/components/features/templates/state/events/OnVisible';

// Import loop components
import ForEach from '@/components/features/templates/state/loops/ForEach';
import Break from '@/components/features/templates/state/loops/Break';

// Import validation
import Validate from '@/components/features/templates/state/validation/Validate';

// Import temporal controls
import Delay from '@/components/features/templates/state/temporal/Delay';
import Sequence from '@/components/features/templates/state/temporal/Sequence';
import Step from '@/components/features/templates/state/temporal/Step';

/**
 * Register all event handler, loop, and temporal components
 */
export function registerEventComponents(registry: ComponentRegistry) {
  // Event Handlers
  registry.register({
    name: 'OnClick',
    component: OnClick,
    group: 'logic',
    description: 'Says what happens when something is clicked: the actions inside run in order. Put it inside the thing people click (a Button, a picture\'s link, a card), or point it at something with target. Something that isn\'t a button or link already works like one for keyboards too: Tab reaches it, Enter or Space presses it. In a Button with more than one, only the last one runs.',
    example: '<Var name="waves" type="number" initial="0" />\n<div class="wave">\n  <OnClick><Increment var="waves" /><ShowToast message="Waved back" type="info" /></OnClick>\n  <img src="/assets/default-avatar.gif" alt="Wave hello">\n</div>\n<p>Waves so far: <ShowVar name="waves" /></p>',
    props: {
      target: { type: 'string', description: 'A CSS selector, like #cat or .card, for what to click instead of the element it sits in. Put it anywhere on the page. An <img> can\'t hold anything, so give it an id and use target="#its-id". Things that show up later count too.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'OnChange',
    component: OnChange,
    group: 'logic',
    description: 'Runs the actions inside when the visitor changes an input. It goes inside a TInput, Select, Slider, ColorPicker, RadioGroup or Checkbox. The input\'s own variable is already updated when it runs.',
    example: '<Var name="mood" type="string" initial="" />\n<Var name="changes" type="number" initial="0" />\n<Select var="mood" placeholder="Pick a mood">\n  <Option value="cozy">Cozy</Option>\n  <Option value="restless">Restless</Option>\n  <OnChange><Increment var="changes" /></OnChange>\n</Select>\n<p>Mood changes: <ShowVar name="changes" /></p>',
    props: {
      debounce: { type: 'number', default: 0, description: 'Wait this many milliseconds after the last change before running, so typing in a TInput runs it once at the end instead of on every key. 0 by default.' }
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
    group: 'logic',
    description: 'Runs the actions inside once, when the page loads. Put it after the Var tags it changes, or they won\'t exist yet.',
    example: '<Var name="visits" type="number" initial="0" persist="true" />\n<OnMount><Set var="visits" expression="$vars.visits + 1" /></OnMount>\n<p>You\'ve visited from this browser <ShowVar name="visits" /> times.</p>',
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
    group: 'logic',
    description: 'Runs the actions inside over and over on a timer, for as long as it\'s on the page. Inside an If it only runs while the If shows, so an If pauses it and starts it again: a game clock that stops at zero, or something that moves only while a key is held.',
    example: '<Var name="weather" type="string" initial="sunny" />\n<p>Outside my window it\'s <ShowVar name="weather" /></p>\n<OnInterval seconds="3"><Cycle var="weather" values="sunny, rainy, foggy, snowy" /></OnInterval>',
    props: {
      seconds: { type: 'number', min: 0.05, description: 'How many seconds between runs, at least 0.05. If you set neither this nor milliseconds, it\'s 1 second.' },
      milliseconds: { type: 'number', min: 50, description: 'How many milliseconds between runs, at least 50. Wins over seconds if you set both.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: true,
      childrenLabel: 'Actions to Execute'
    }
  });

  registry.register({
    name: 'OnMouseEnter',
    component: OnMouseEnter,
    group: 'logic',
    description: 'Runs the actions inside when the mouse moves onto the element it sits in, or the ones target points at. Pair it with OnMouseLeave to undo the change. Phones and keyboards don\'t hover, so don\'t hide anything important behind it.',
    example: '<Var name="sign" type="string" initial="Closed" />\n<div style="padding: 1em; border: 1px solid">\n  <OnMouseEnter><Set var="sign" value="Open, come in" /></OnMouseEnter>\n  <OnMouseLeave><Set var="sign" value="Closed" /></OnMouseLeave>\n  Shop sign: <ShowVar name="sign" />\n</div>',
    props: {
      target: { type: 'string', description: 'A CSS selector, like #cat or .card, for what to watch instead of the element it sits in. Put it anywhere on the page.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'OnMouseLeave',
    component: OnMouseLeave,
    group: 'logic',
    description: 'Runs the actions inside when the mouse moves off the element it sits in, or the ones target points at.',
    example: '<Var name="sign" type="string" initial="Closed" />\n<div style="padding: 1em; border: 1px solid">\n  <OnMouseEnter><Set var="sign" value="Open, come in" /></OnMouseEnter>\n  <OnMouseLeave><Set var="sign" value="Closed" /></OnMouseLeave>\n  Shop sign: <ShowVar name="sign" />\n</div>',
    props: {
      target: { type: 'string', description: 'A CSS selector, like #cat or .card, for what to watch instead of the element it sits in. Put it anywhere on the page.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'OnKeyPress',
    component: OnKeyPress,
    group: 'logic',
    description: 'Runs the actions inside when a certain key is pressed anywhere on the page, but not while someone is typing in a text box. Holding a key down runs it again and again, as fast as the keyboard repeats. To know a key is held, set a variable here and clear it in an OnKeyUp.',
    example: '<Var name="jumps" type="number" initial="0" />\n<OnKeyPress keyName="j"><Increment var="jumps" /></OnKeyPress>\n<p>Press j to jump. Jumps: <ShowVar name="jumps" /></p>',
    props: {
      keyName: { type: 'string', required: true, description: 'The key to listen for, named the way browsers name keys: Enter, Escape, ArrowUp, j, J (a capital means with Shift), " " for Space and so on. It has to match exactly.' },
      scroll: { type: 'boolean', default: true, description: 'Set false so the key doesn\'t also scroll the page, for arrow keys and Space in a game. It still presses a button or link that has the focus.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'OnKeyUp',
    component: OnKeyUp,
    group: 'logic',
    description: 'Runs the actions inside when a certain key is let go, anywhere on the page but not while someone is typing in a text box. With an OnKeyPress for the same key it tells you a key is held down: set a variable when it goes down, clear it when it comes up, and move things on an OnInterval while it\'s set.',
    example: '<Var name="x" type="number" initial="0" />\n<Var name="right" type="boolean" initial="false" />\n<OnKeyPress keyName="ArrowRight" scroll="false"><Set var="right" value="true" /></OnKeyPress>\n<OnKeyUp keyName="ArrowRight"><Set var="right" value="false" /></OnKeyUp>\n<If data="$vars.right">\n  <OnInterval milliseconds="50"><Set var="x" expression="Math.min(x + 1, 100)" /></OnInterval>\n</If>\n<p>Hold the right arrow: <ShowVar name="x" /></p>',
    props: {
      keyName: { type: 'string', required: true, description: 'The key to listen for, named the way browsers name keys: ArrowLeft, Shift, a and so on. It has to match exactly.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'OnSwipe',
    component: OnSwipe,
    group: 'logic',
    description: 'Runs the actions inside when someone swipes across the element it sits in: a finger on a phone or tablet, or dragging with the mouse held down. Put one inside the thing to swipe, or point it at something with target="…". Swiping across it doesn\'t scroll the page that way (left and right swipes still let the page scroll up and down), and a swipe doesn\'t count as a click too. Keyboards can\'t swipe, so give a game OnKeyPress arrows as well.',
    example: '<Var name="x" type="number" initial="0" />\n<div class="pad">\n  <OnSwipe direction="left"><Decrement var="x" /></OnSwipe>\n  <OnSwipe direction="right"><Increment var="x" /></OnSwipe>\n  Swipe me left or right: <ShowVar name="x" />\n</div>\n<OnKeyPress keyName="ArrowLeft"><Decrement var="x" /></OnKeyPress>\n<OnKeyPress keyName="ArrowRight"><Increment var="x" /></OnKeyPress>',
    props: {
      direction: { type: 'enum', values: ['left', 'right', 'up', 'down'], description: 'Which way: left, right, up or down. Without it, a swipe any way counts. Use one OnSwipe for each way.' },
      distance: { type: 'number', default: 30, min: 1, description: 'How far the swipe has to go, in pixels, before it counts. 30 by default.' },
      target: { type: 'string', description: 'A selector for what to swipe across instead of the element it sits in, like #board or .card. Things the page shows later count too.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'OnVisible',
    component: OnVisible,
    group: 'logic',
    description: 'Runs the actions inside when the spot where it sits scrolls into view. By default it only runs the first time.',
    example: '<p>Thanks for reading this far.</p>\n<OnVisible>\n  <ShowToast message="You made it to the bottom of my page" type="info" />\n</OnVisible>',
    props: {
      threshold: { type: 'number', default: 0.5, description: 'How much has to be on screen, from 0 to 1. The spot it watches has no size, so in practice it runs as soon as the spot is on screen whatever this is.' },
      once: { type: 'boolean', default: true, description: 'true (the default) runs it only the first time. With false it runs each time the spot comes back into view, and also again whenever any page variable changes while it\'s on screen, so an action here that changes a variable keeps repeating.' }
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
    group: 'logic',
    description: 'Repeats what\'s inside once for each item in a list variable. Inside, write {book} (your item name in curly brackets) in text or attributes, class and style too, for the item, {book.title} for one field of an object, and {i} or {i + 1} for the position if you set index. In a calculation, like Set expression="…" inside an OnClick, write the names without brackets: book, i. A ForEach inside another can use the outer one\'s names too. ShowVar can\'t show the item; use the curly brackets.',
    example: '<Var name="books" type="array" initial=\'["Earthsea", "Piranesi", "Momo"]\' />\n<ul>\n  <ForEach var="books" item="book" index="i">\n    <li>{i + 1}. {book}</li>\n  </ForEach>\n</ul>',
    props: {
      var: { type: 'string', required: true, description: 'The list variable to go through. If it isn\'t a list, nothing shows.' },
      item: { type: 'string', required: true, description: 'The name for the current item inside the loop, like book for {book}.' },
      index: { type: 'string', description: 'A name for the current position, counting from 0, like i for {i}. {i + 1} counts from 1; only + works in the brackets, so for more use CSS: style="left: calc({i} * 2em)". In a calculation it\'s just i, like expression="i * 2".' },
      className: { type: 'string', description: 'Not used yet.' }
    },
    relationship: {
      type: 'container',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'Break',
    component: Break,
    group: 'logic',
    description: 'Stops a ForEach early, so only the items before that point show. It must sit directly inside the ForEach, or inside plain HTML tags there; inside an If or an event it does nothing. With neither when nor condition set, the list shows no items at all.',
    example: '<Var name="books" type="array" initial=\'["Earthsea", "Piranesi", "Momo", "Watership Down"]\' />\n<ul>\n  <ForEach var="books" item="book">\n    <Break when="i >= 3" />\n    <li>{book}</li>\n  </ForEach>\n</ul>',
    props: {
      when: { type: 'string', description: 'Stop at the first item this is true for: a calculation on the item, its place (i) and your page variables, like i >= 5 or item.done.', example: 'i >= 5' },
      condition: { type: 'string', description: 'Only stop when this calculation on your page variables is true, like $vars.done or $vars.limit > 3.', example: '$vars.done' }
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
    group: 'logic',
    description: 'Checks a page variable and makes three more from it: name_valid (true or false), name_error (the first failing message, or empty) and name_errors (a list of all of them). It doesn\'t read the box it sits in, so always set var. Putting it inside the TInput it checks just keeps them together.',
    example: '<Var name="email" type="string" initial="" />\n<TInput var="email" type="email" placeholder="you@example.com">\n  <Validate var="email" pattern="email" message="That doesn\'t look like an email address" />\n</TInput>\n<p><ShowVar name="email_error" /></p>',
    props: {
      var: { type: 'string', description: 'The page variable to check. Needed: without it nothing is checked.' },
      pattern: { type: 'string', description: 'email, url (must start with http:// or https://), phone (digits, spaces and + - ( ) only), or your own regular expression.' },
      required: { type: 'boolean', default: false, description: 'When true, an empty value fails. Without it an empty value always passes, so the error shows only once something is typed.' },
      min: { type: 'number', description: 'The lowest number allowed.' },
      max: { type: 'number', description: 'The highest number allowed.' },
      minLength: { type: 'number', description: 'The fewest characters allowed.' },
      maxLength: { type: 'number', description: 'The most characters allowed.' },
      message: { type: 'string', required: true, description: 'The text put into name_error when this check fails. Use one Validate per message.' }
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
    group: 'logic',
    description: 'Waits, then runs the actions inside. It goes inside an event like OnClick or in a Sequence. Actions after it in the same event don\'t wait; inside a Sequence they do.',
    example: '<Var name="note" type="string" initial="" />\n<Button><OnClick>\n  <Set var="note" value="Knock knock..." />\n  <Delay seconds="2"><Set var="note" value="Who\'s there? Come on in." /></Delay>\n</OnClick>Knock</Button>\n<p><ShowVar name="note" /></p>',
    props: {
      seconds: { type: 'number', required: false, description: 'How many seconds to wait. With neither this nor milliseconds, it doesn\'t wait.' },
      milliseconds: { type: 'number', required: false, description: 'How many milliseconds to wait. Wins over seconds if you set both.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'Sequence',
    component: Sequence,
    group: 'logic',
    description: 'Runs actions one after another, with waits in between. It goes inside an event like OnClick. Either fill it with Step tags, or with actions and Delay tags, where each Delay pauses before the rest. If there\'s any Step inside, everything that isn\'t a Step is skipped.',
    example: '<Var name="kettle" type="string" initial="Cold" />\n<Button><OnClick><Sequence>\n  <Step><Set var="kettle" value="Boiling..." /></Step>\n  <Step delay="3000"><Set var="kettle" value="Tea\'s ready" /></Step>\n</Sequence></OnClick>Put the kettle on</Button>\n<p>Kettle: <ShowVar name="kettle" /></p>',
    props: {},
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'Step',
    component: Step,
    group: 'logic',
    description: 'One step in a Sequence: it waits, then runs the actions inside. It must sit directly inside a Sequence.',
    example: '<Var name="count" type="string" initial="Ready" />\n<Button><OnClick><Sequence>\n  <Step><Set var="count" value="3" /></Step>\n  <Step delay="1000"><Set var="count" value="2" /></Step>\n  <Step delay="1000"><Set var="count" value="1" /></Step>\n  <Step delay="1000"><Set var="count" value="Blast off" /></Step>\n</Sequence></OnClick>Count down</Button>\n<p><ShowVar name="count" /></p>',
    props: {
      delay: { type: 'number', default: 0, description: 'How many milliseconds to wait, counted from when the step before it ran. 0 by default. Waits add up: two steps with delay="1000" run 1 and 2 seconds after the click.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: true
    }
  });
}
