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
    group: 'logic',
    description: 'Changes a page variable to a new value. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="mood" type="string" initial="sleepy" />\n<Button>\n  <OnClick><Set var="mood" value="cozy" /></OnClick>\n  Make tea\n</Button>\n<p>Current mood: <ShowVar name="mood" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The page variable to change.' },
      value: { type: 'string', description: 'The new value, used as written.' },
      expression: { type: 'string', description: 'A calculation from page variables to use instead, like $vars.likes * 2. Text wrapped in [ ] or { } is read as a list or object. Wins over value.' }
    },
    relationship: {
      type: 'leaf',
      acceptsChildren: []
    }
  });

  registry.register({
    name: 'Increment',
    component: Increment,
    group: 'logic',
    description: 'Adds to a number page variable. Runs inside an event like OnClick or OnMount, and only works on a Var with type="number".',
    example: '<Var name="likes" type="number" initial="0" />\n<Button>\n  <OnClick><Increment var="likes" /></OnClick>\n  Like (<ShowVar name="likes" />)\n</Button>',
    props: {
      var: { type: 'string', required: true, description: 'The number page variable to add to.' },
      by: { type: 'number', default: 1, description: 'How much to add each time. Default 1.' },
      min: { type: 'number', description: 'The lowest the number can be.' },
      max: { type: 'number', description: 'The highest the number can go. It stops there.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Decrement',
    component: Decrement,
    group: 'logic',
    description: 'Takes away from a number page variable. Runs inside an event like OnClick or OnMount, and only works on a Var with type="number".',
    example: '<Var name="cookies" type="number" initial="12" />\n<Button>\n  <OnClick><Decrement var="cookies" min="0" /></OnClick>\n  Take a cookie (<ShowVar name="cookies" /> left)\n</Button>',
    props: {
      var: { type: 'string', required: true, description: 'The number page variable to take away from.' },
      by: { type: 'number', default: 1, description: 'How much to take away each time. Default 1.' },
      min: { type: 'number', description: 'The lowest the number can go. It stops there.' },
      max: { type: 'number', description: 'The highest the number can be.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Toggle',
    component: Toggle,
    group: 'logic',
    description: 'Flips a true/false page variable: true becomes false and false becomes true. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="showSecret" type="boolean" initial="false" />\n<Button>\n  <OnClick><Toggle var="showSecret" /></OnClick>\n  A confession\n</Button>\n<If data="$vars.showSecret"><p>I still have my Tamagotchi.</p></If>',
    props: {
      var: { type: 'string', required: true, description: 'The true/false page variable to flip.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'ShowToast',
    component: ShowToast,
    group: 'logic',
    description: 'Pops up a short message on the screen. Runs inside an event like OnClick or OnMount.',
    example: '<Button>\n  <OnClick><ShowToast message="Thanks for the wave" type="info" /></OnClick>\n  Wave hello\n</Button>',
    props: {
      message: { type: 'string', required: true, description: 'The text to show.' },
      type: { type: 'enum', values: ['success', 'error', 'warning', 'info', 'loading'], default: 'success', description: 'The look of the message: success, error, warning, info or loading. loading looks the same as info. Default success.' },
      duration: { type: 'number', default: 3000, description: 'Not used yet.' },
      position: { type: 'enum', values: ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'], description: 'Not used yet.' }
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
    group: 'logic',
    description: 'Adds an item to the end of a list page variable. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="books" type="array" initial=\'["Kindred"]\' />\n<Var name="newBook" type="string" initial="" />\n<TInput var="newBook" placeholder="Book title" />\n<Button>\n  <OnClick><Push var="books" value="$vars.newBook" /></OnClick>\n  Add to my list\n</Button>\n<p><ShowVar name="books" format="{value.length} books to read" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The list page variable to add to.' },
      value: { type: 'string', description: 'The item to add. If it has $vars in it, like $vars.newBook, it\'s worked out first; otherwise it\'s used as written.' },
      expression: { type: 'string', description: 'Same as value, and wins if you give both.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Pop',
    component: Pop,
    group: 'logic',
    description: 'Removes the last item from a list page variable. Does nothing if the list is empty. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="books" type="array" initial=\'["Kindred", "Piranesi", "Beloved"]\' />\n<Button>\n  <OnClick><Pop var="books" /></OnClick>\n  Take the last one off\n</Button>\n<p><ShowVar name="books" format="{value.length} books to read" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The list page variable to shorten.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'RemoveAt',
    component: RemoveAt,
    group: 'logic',
    description: 'Removes the item at one position from a list page variable. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="books" type="array" initial=\'["Kindred", "Piranesi"]\' />\n<Button>\n  <OnClick><RemoveAt var="books" index="0" /></OnClick>\n  Finished the first one\n</Button>\n<p>Still to read: <ShowVar name="books" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The list page variable to remove from.' },
      index: { type: 'string', description: 'The position to remove, counting from 0. Can be $vars.name to use a number page variable. Inside a ForEach you can leave it out to remove the current item.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'ArrayAt',
    component: ArrayAt,
    group: 'logic',
    description: 'Keeps a page variable set to one item of a list, and updates it whenever the list or the position changes. Put it on the page, not inside an event; inside an event it does nothing.',
    example: '<Var name="quotes" type="array" initial=\'["Stay weird", "Drink water", "Call a friend"]\' />\n<Var name="n" type="number" initial="0" />\n<Var name="quote" type="string" initial="" />\n<ArrayAt var="quote" array="quotes" index="n" />\n<p><ShowVar name="quote" /></p>\n<Button><OnClick><Increment var="n" max="2" /></OnClick>Another one</Button>',
    props: {
      var: { type: 'string', required: true, description: 'The page variable to keep filled with the item.' },
      array: { type: 'string', required: true, description: 'The name of the list page variable.' },
      index: { type: 'string', required: true, description: 'Which item, counting from 0: a number, or the name of a number page variable. Negative numbers count back from the end.' }
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
    group: 'logic',
    description: 'Adds text to the end of a text page variable. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="stars" type="string" initial="" />\n<Button>\n  <OnClick><Append var="stars" value="*" /></OnClick>\n  Leave a star\n</Button>\n<p>Stars so far: <ShowVar name="stars" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The text page variable to add to.' },
      value: { type: 'string', required: true, description: 'The text to add to the end. Write $vars.name to add another page variable\'s value.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Prepend',
    component: Prepend,
    group: 'logic',
    description: 'Adds text to the start of a text page variable. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="feeling" type="string" initial="happy" />\n<Button>\n  <OnClick><Prepend var="feeling" value="very " /></OnClick>\n  More\n</Button>\n<p>I\'m <ShowVar name="feeling" /> you stopped by.</p>',
    props: {
      var: { type: 'string', required: true, description: 'The text page variable to add to.' },
      value: { type: 'string', required: true, description: 'The text to put in front. Write $vars.name to use another page variable\'s value.' }
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
    group: 'logic',
    description: 'Moves a page variable to the next value in a list, going back to the first after the last. If the current value isn\'t in the list, it starts at the first. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="mood" type="string" initial="sleepy" />\n<Button>\n  <OnClick><Cycle var="mood" values="sleepy, cozy, wired" /></OnClick>\n  Mood: <ShowVar name="mood" />\n</Button>',
    props: {
      var: { type: 'string', required: true, description: 'The page variable to change.' },
      values: { type: 'string', required: true, description: 'The values to step through, separated by commas, like sleepy, cozy, wired. Numbers are stored as numbers.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Reset',
    component: Reset,
    group: 'logic',
    description: 'Puts a page variable back to its starting value, and clears any saved copy. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="likes" type="number" initial="0" />\n<Button><OnClick><Increment var="likes" /></OnClick>Like (<ShowVar name="likes" />)</Button>\n<Button><OnClick><Reset var="likes" /></OnClick>Start over</Button>',
    props: {
      var: { type: 'string', description: 'The page variable to reset. Leave it out to reset every page variable on the page.' }
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
    group: 'logic',
    description: 'Adds a CSS class to elements on your page. Runs inside an event like OnClick or OnMount.',
    example: '<div id="lamp" class="lamp">a little lamp</div>\n<Button>\n  <OnClick><AddClass target="#lamp" className="lit" /></OnClick>\n  Turn on the lamp\n</Button>',
    props: {
      target: { type: 'string', required: true, description: 'A CSS selector, like #lamp or .note. Every match gets the class. "this" doesn\'t work here.' },
      className: { type: 'string', required: true, description: 'One class name to add, like lit.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'RemoveClass',
    component: RemoveClass,
    group: 'logic',
    description: 'Takes a CSS class off elements on your page. Runs inside an event like OnClick or OnMount.',
    example: '<div id="lamp" class="lamp lit">a little lamp</div>\n<Button>\n  <OnClick><RemoveClass target="#lamp" className="lit" /></OnClick>\n  Turn off the lamp\n</Button>',
    props: {
      target: { type: 'string', required: true, description: 'A CSS selector, like #lamp or .note. Every match loses the class. "this" doesn\'t work here.' },
      className: { type: 'string', required: true, description: 'One class name to remove, like lit.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'ToggleClass',
    component: ToggleClass,
    group: 'logic',
    description: 'Adds a CSS class to elements that don\'t have it and removes it from ones that do. Runs inside an event like OnClick or OnMount.',
    example: '<nav id="menu" class="menu"><a href="/links">links</a></nav>\n<Button>\n  <OnClick><ToggleClass target="#menu" className="open" /></OnClick>\n  Menu\n</Button>',
    props: {
      target: { type: 'string', required: true, description: 'A CSS selector, like #menu or .note. Every match is switched. "this" doesn\'t work here.' },
      className: { type: 'string', required: true, description: 'One class name to switch on and off, like open.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'SetCSSVar',
    component: SetCSSVar,
    group: 'logic',
    description: 'Sets a CSS variable, so everything in your CSS that uses it changes at once. Runs inside an event like OnClick or OnMount.',
    example: '<Button>\n  <OnClick><SetCSSVar name="--accent" value="#ff77aa" /></OnClick>\n  Pink mode\n</Button>\n<p style="color: var(--accent)">This text follows the accent color.</p>',
    props: {
      name: { type: 'string', required: true, description: 'The CSS variable to set, like --accent.' },
      value: { type: 'string', description: 'Its new value, like #ff77aa or 18px.' },
      expression: { type: 'string', description: 'A calculation from page variables to use instead, like $vars.size + \'px\'. Wins over value.' },
      target: { type: 'string', default: ':root', description: 'A selector for the element to set it on; only the first match is used. Default :root, the whole page. Id selectors like #box don\'t match here, so use a class.' }
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
    group: 'logic',
    description: 'Copies text to the visitor\'s clipboard, ready to paste. Runs inside an event like OnClick.',
    example: '<Button>\n  <OnClick>\n    <CopyToClipboard value="https://homepageagain.com/resident/moth" />\n    <ShowToast message="Link copied" type="info" />\n  </OnClick>\n  Copy my link\n</Button>',
    props: {
      value: { type: 'string', description: 'The text to copy, used as written.' },
      expression: { type: 'string', description: 'A calculation from page variables to copy instead, like $vars.code. Wins over value.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'SetURLParam',
    component: SetURLParam,
    group: 'logic',
    description: 'Sets a ?name=value part of the page address without reloading the page. Runs inside an event like OnClick or OnMount.',
    example: '<Button>\n  <OnClick><SetURLParam key="tab" value="guestbook" /></OnClick>\n  Guestbook tab\n</Button>',
    props: {
      // React keeps `key` for itself, so the component gets it as param
      key: { type: 'string', required: true, componentProp: 'param', description: 'The name in the address, like tab in ?tab=guestbook.' },
      value: { type: 'string', description: 'The value, used as written.' },
      expression: { type: 'string', description: 'A calculation from page variables to use instead, like $vars.page + 1. Wins over value.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'SetURLHash',
    component: SetURLHash,
    group: 'logic',
    description: 'Changes the #part at the end of the page address. Runs inside an event like OnClick or OnMount.',
    example: '<Button>\n  <OnClick><SetURLHash value="guestbook" /></OnClick>\n  Link to my guestbook\n</Button>',
    props: {
      value: { type: 'string', description: 'The part after the #, like guestbook. A # at the start is dropped.' },
      expression: { type: 'string', description: 'A calculation from page variables to use instead. Wins over value.' }
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
    group: 'logic',
    description: 'Counts the items in a list page variable, or only the ones that pass a test, and puts the number in another page variable. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="books" type="array" initial=\'[{"title": "Kindred", "read": true}, {"title": "Piranesi", "read": false}]\' />\n<Var name="readCount" type="number" initial="0" />\n<Button>\n  <OnClick><Count var="books" target="readCount" where="item.read" /></OnClick>\n  Count finished books\n</Button>\n<p>Finished: <ShowVar name="readCount" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The list page variable to count.' },
      target: { type: 'string', required: true, description: 'The page variable to put the count in. Made for you if it doesn\'t exist.' },
      where: { type: 'string', required: false, description: 'A test for each item, written with item, like item.read. Leave it out to count everything.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Sum',
    component: Sum,
    group: 'logic',
    description: 'Adds up the numbers in a list page variable and puts the total in another page variable. Items that aren\'t numbers are skipped. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="books" type="array" initial=\'[{"title": "Kindred", "pages": 264}, {"title": "Piranesi", "pages": 245}]\' />\n<Var name="total" type="number" initial="0" />\n<Button>\n  <OnClick><Sum var="books" target="total" property="pages" /></OnClick>\n  Add up my pages\n</Button>\n<p><ShowVar name="total" format="{value} pages this year" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The list page variable to add up.' },
      target: { type: 'string', required: true, description: 'The page variable to put the total in. Made for you if it doesn\'t exist.' },
      property: { type: 'string', required: false, description: 'For a list of objects, the field to add up, like pages. Leave it out for a plain list of numbers.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Get',
    component: Get,
    group: 'logic',
    description: 'Copies one item from a list, or one field from an object, into another page variable. An object comes out as text. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="moods" type="array" initial=\'["sleepy", "cozy", "wired"]\' />\n<Var name="pick" type="number" initial="0" />\n<Var name="mood" type="string" initial="sleepy" />\n<Button>\n  <OnClick><Increment var="pick" max="2" /><Get from="moods" at="$vars.pick" target="mood" /></OnClick>\n  Next mood\n</Button>\n<p>Today: <ShowVar name="mood" /></p>',
    props: {
      from: { type: 'string', required: true, description: 'The list or object page variable, by name or as $vars.name.' },
      at: { type: 'string', required: true, description: 'Which item: a position counting from 0, a field name, or $vars.name to use another page variable\'s value.' },
      target: { type: 'string', required: true, description: 'The page variable to put it in. Made for you if it doesn\'t exist.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Filter',
    component: Filter,
    group: 'logic',
    description: 'Keeps only the items of a list that pass a test and puts them in another page variable. The original list stays as it was. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="books" type="array" initial=\'[{"title": "Kindred", "read": true}, {"title": "Piranesi", "read": false}]\' />\n<Var name="unread" type="array" initial="[]" />\n<Button>\n  <OnClick><Filter var="books" target="unread" where="!item.read" /></OnClick>\n  What\'s left?\n</Button>\n<p><ShowVar name="unread" format="{value.length} still to read" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The list page variable to look through.' },
      target: { type: 'string', required: true, description: 'The page variable to put the matching items in. Made for you if it doesn\'t exist.' },
      where: { type: 'string', required: true, description: 'The test each item must pass, written with item, like !item.read or item.pages > 300.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Find',
    component: Find,
    group: 'logic',
    description: 'Puts the first item of a list that passes a test into another page variable. If that item is an object, it\'s saved as text. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="books" type="array" initial=\'["Kindred", "Piranesi", "Beloved"]\' />\n<Var name="pick" type="string" initial="" />\n<Button>\n  <OnClick><Find var="books" target="pick" where="item.startsWith(\'P\')" /></OnClick>\n  Find a P book\n</Button>\n<p>Found: <ShowVar name="pick" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The list page variable to look through.' },
      target: { type: 'string', required: true, description: 'The page variable to put the item in. Made for you if it doesn\'t exist; left empty if nothing passes.' },
      where: { type: 'string', required: true, description: 'The test, written with item, like item.startsWith(\'P\') or item.read.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Transform',
    component: Transform,
    group: 'logic',
    description: 'Changes every item of a list the same way and puts the new list in another page variable. The original list stays as it was. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="tags" type="array" initial=\'["cats", "zines", "midi"]\' />\n<Var name="loud" type="array" initial="[]" />\n<Button>\n  <OnClick><Transform var="tags" target="loud" expression="item.toUpperCase()" /></OnClick>\n  Shout my tags\n</Button>\n<p><ShowVar name="loud" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The list page variable to start from.' },
      target: { type: 'string', required: true, description: 'The page variable to put the new list in. Made for you if it doesn\'t exist.' },
      expression: { type: 'string', required: true, description: 'What each item becomes, written with item, like item.toUpperCase() or item.pages * 2.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Sort',
    component: Sort,
    group: 'logic',
    description: 'Puts a sorted copy of a list into another page variable. The original list stays as it was. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="books" type="array" initial=\'["Piranesi", "Beloved", "Kindred"]\' />\n<Var name="sorted" type="array" initial="[]" />\n<Button>\n  <OnClick><Sort var="books" target="sorted" by="item" order="asc" /></OnClick>\n  A to Z\n</Button>\n<p><ShowVar name="sorted" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The list page variable to sort.' },
      target: { type: 'string', required: true, description: 'The page variable to put the sorted list in. Made for you if it doesn\'t exist.' },
      by: { type: 'string', required: true, description: 'What to sort by, written with item: item for plain text or numbers, or a field like item.title.' },
      order: { type: 'enum', values: ['asc', 'desc'], default: 'asc', description: 'asc for A to Z and smallest first, desc for the other way. Default asc.' },
      'order-var': { type: 'string', description: 'The name of a page variable holding asc or desc. Wins over order.' }
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
    group: 'logic',
    description: 'Copies a page variable into another one, so later changes to one don\'t touch the other. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="note" type="string" initial="gone fishing" />\n<Var name="saved" type="string" initial="" />\n<TInput var="note" />\n<Button>\n  <OnClick><Clone var="note" target="saved" /></OnClick>\n  Save\n</Button>\n<p>Saved: <ShowVar name="saved" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The page variable to copy.' },
      target: { type: 'string', required: true, description: 'The page variable to copy it into. Made for you if it doesn\'t exist.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Merge',
    component: Merge,
    group: 'logic',
    description: 'Combines several object page variables into one. Where they share a field, the later one wins. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="defaults" type="object" initial=\'{"color": "teal", "font": "serif"}\' />\n<Var name="mine" type="object" initial=\'{"color": "plum"}\' />\n<Var name="theme" type="object" initial="{}" />\n<Button>\n  <OnClick><Merge sources="defaults, mine" target="theme" /></OnClick>\n  Apply my colors\n</Button>\n<p><ShowVar name="theme" format="{value.color} in {value.font}" /></p>',
    props: {
      sources: { type: 'string', required: true, description: 'The object page variables to combine, separated by commas, like defaults, mine. Ones that aren\'t objects are skipped.' },
      target: { type: 'string', required: true, description: 'The page variable to put the combined object in. Made for you if it doesn\'t exist.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'ObjectSet',
    component: ObjectSet,
    group: 'logic',
    description: 'Changes one field inside an object page variable. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="me" type="object" initial=\'{"mood": "sleepy", "drink": "tea"}\' />\n<Button>\n  <OnClick><ObjectSet var="me" path="drink" value="coffee" /></OnClick>\n  Switch drinks\n</Button>\n<p><ShowVar name="me" format="Drinking {value.drink}, feeling {value.mood}" /></p>',
    props: {
      var: { type: 'string', required: true, description: 'The object page variable to change.' },
      path: { type: 'string', required: true, description: 'The field to set, with dots for fields inside fields, like links.home. Missing parts are made for you.' },
      value: { type: 'string', required: false, description: 'The new value, used as written.' },
      expression: { type: 'string', required: false, description: 'A calculation from page variables to use instead, like $vars.likes + 1. Wins over value.' }
    },
    relationship: {
      type: 'action',
      acceptsChildren: false
    }
  });

  registry.register({
    name: 'Extract',
    component: Extract,
    group: 'logic',
    description: 'Copies fields out of an object into their own page variables, one Property inside it per field. Runs inside an event like OnClick or OnMount.',
    example: '<Var name="song" type="object" initial=\'{"title": "Teardrop", "artist": "Massive Attack"}\' />\n<Var name="artist" type="string" initial="?" />\n<Button>\n  <OnClick><Extract from="song"><Property path="artist" as="artist" /></Extract></OnClick>\n  Who made my song?\n</Button>\n<p>By: <ShowVar name="artist" /></p>',
    props: {
      from: { type: 'string', required: true, description: 'The object to read: a page variable name, or a path like $vars.song.album.' }
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
    group: 'logic',
    description: 'Goes inside Extract and copies one field of its object into a page variable. If the field is missing, nothing changes.',
    example: '<Var name="song" type="object" initial=\'{"title": "Teardrop", "by": {"name": "Massive Attack"}}\' />\n<Var name="title" type="string" initial="" />\n<Var name="artist" type="string" initial="" />\n<Button>\n  <OnClick><Extract from="song"><Property path="title" as="title" /><Property path="by.name" as="artist" /></Extract></OnClick>\n  Now playing\n</Button>\n<p><ShowVar name="title" /> by <ShowVar name="artist" /></p>',
    props: {
      path: { type: 'string', required: true, description: 'The field to copy, with dots for fields inside fields, like by.name.' },
      as: { type: 'string', required: true, description: 'The page variable to copy it into. Made for you if it doesn\'t exist.' }
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
    group: 'logic',
    description: 'Puts an attribute on an element while a test passes and takes it off when it doesn\'t, following page variables as they change. Put it on the page; inside an event it only sets the attribute once.',
    example: '<Var name="likes" type="number" initial="0" />\n<Button><OnClick><Increment var="likes" /></OnClick>Like</Button>\n<p id="thanks">Thank you, that made my day.</p>\n<ConditionalAttr element="#thanks" attribute="hidden" when="$vars.likes === 0" />',
    props: {
      element: { type: 'string', required: true, description: 'A CSS selector for the element or elements, like #thanks or .note. "this" doesn\'t work here.' },
      attribute: { type: 'string', required: true, description: 'The attribute to set, like hidden, disabled or aria-expanded.' },
      when: { type: 'string', required: false, description: 'The test. With =, !, < or > in it, it\'s worked out as a calculation, like $vars.likes === 0. Otherwise it names a value that must be on, like $vars.open. Leave it out and the attribute is never set.' },
      value: { type: 'string', default: 'true', description: 'The attribute\'s value while the test passes. Default true.' }
    },
    relationship: {
      type: 'interactive',
      acceptsChildren: false
    }
  });
}
