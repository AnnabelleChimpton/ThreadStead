// Conditional Rendering Component Registrations
import { ComponentRegistry } from './template-registry-class';

// Import conditional rendering components
import IfOwner, { IfVisitor } from '@/components/features/templates/conditional/IfOwner';
import If from '@/components/features/templates/state/conditional/If';
import ElseIf from '@/components/features/templates/state/conditional/ElseIf';
import Else from '@/components/features/templates/state/conditional/Else';

/**
 * Register all conditional rendering components
 */
export function registerConditionalComponents(registry: ComponentRegistry) {
  registry.register({
    name: 'IfOwner',
    component: IfOwner,
    group: 'logic',
    description: 'Shown only when you\'re signed in and looking at your own page. Visitors don\'t see it, but its text is still sent with the page, so don\'t put anything private in it.',
    example: '<IfOwner>\n  <p>You\'re looking at your own page. Visitors don\'t see this note.</p>\n</IfOwner>',
    props: {}
  });

  registry.register({
    name: 'IfVisitor',
    component: IfVisitor,
    group: 'logic',
    description: 'Shown to everyone except you on your own page, including people who aren\'t signed in. It\'s hidden from you, not removed: its text is still sent with the page.',
    example: '<IfVisitor>\n  <p>Thanks for visiting. Sign my guestbook on the way out.</p>\n</IfVisitor>',
    props: {}
  });

  // Action Conditionals (for conditional action execution)
  registry.register({
    name: 'If',
    component: If,
    group: 'logic',
    description: 'Inside an event like OnClick, runs the actions in it only when its test passes; ElseIf and Else can follow it. On the page, it shows its content while the test passes and updates as page variables change. Use one comparison prop per If.',
    example: '<Var name="likes" type="number" initial="0" />\n<Button>\n  <OnClick><If data="$vars.likes" lessThan="10"><Increment var="likes" /></If></OnClick>\n  Like (<ShowVar name="likes" />)\n</Button>\n<If data="$vars.likes" greaterThanOrEqual="10"><p>Ten likes. You\'re too kind.</p></If>',
    props: {
      condition: { type: 'string', description: 'Same as data.' },
      data: { type: 'string', description: 'What to test: a page variable like $vars.likes, or page data like guestbook.length or viewer.isFriend. On its own, it must be on (not empty, 0 or false).' },
      equals: { type: 'string', description: 'Passes when data is this, compared as text.' },
      notEquals: { type: 'string', description: 'Passes when data is anything else, or missing.' },
      greaterThan: { type: 'string', description: 'Passes when data is a number bigger than this.' },
      lessThan: { type: 'string', description: 'Passes when data is a number smaller than this.' },
      greaterThanOrEqual: { type: 'string', description: 'Passes when data is a number equal to this or bigger.' },
      lessThanOrEqual: { type: 'string', description: 'Passes when data is a number equal to this or smaller.' },
      contains: { type: 'string', description: 'Passes when data\'s text has this in it.' },
      startsWith: { type: 'string', description: 'Passes when data\'s text starts with this.' },
      endsWith: { type: 'string', description: 'Passes when data\'s text ends with this.' },
      matches: { type: 'string', description: 'Passes when data\'s text matches this pattern (a regular expression), like ^https.' },
      exists: { type: 'boolean', description: 'true passes when data has any value at all, even 0 or empty text; false passes when it has none. Needs data.' },
      and: { type: 'string', description: 'Values separated by commas, like $vars.signed, viewer.isFriend. Passes when all of them are on.' },
      or: { type: 'string', description: 'Values separated by commas. Passes when at least one of them is on.' },
      not: { type: 'string', description: 'A value that must be off (empty, 0, false or missing). Written with no value next to data, it flips the data test.' }
    },
    relationship: {
      type: 'conditional-action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'ElseIf',
    component: ElseIf,
    group: 'logic',
    description: 'Goes right after an If, or another ElseIf, inside an event like OnClick. Its actions run when every test before it failed and its own passes. On the page itself it does nothing.',
    example: '<Var name="likes" type="number" initial="0" />\n<Button>\n  <OnClick>\n    <Increment var="likes" />\n    <If data="$vars.likes" equals="1"><ShowToast message="My first like" /></If>\n    <ElseIf data="$vars.likes" equals="10"><ShowToast message="Ten likes, wow" /></ElseIf>\n  </OnClick>\n  Like\n</Button>',
    props: {
      condition: { type: 'string', description: 'Same as data.' },
      data: { type: 'string', description: 'What to test: a page variable like $vars.likes, or page data like guestbook.length or viewer.isFriend. On its own, it must be on (not empty, 0 or false).' },
      equals: { type: 'string', description: 'Passes when data is this, compared as text.' },
      notEquals: { type: 'string', description: 'Passes when data is anything else, or missing.' },
      greaterThan: { type: 'string', description: 'Passes when data is a number bigger than this.' },
      lessThan: { type: 'string', description: 'Passes when data is a number smaller than this.' },
      greaterThanOrEqual: { type: 'string', description: 'Passes when data is a number equal to this or bigger.' },
      lessThanOrEqual: { type: 'string', description: 'Passes when data is a number equal to this or smaller.' },
      contains: { type: 'string', description: 'Passes when data\'s text has this in it.' },
      startsWith: { type: 'string', description: 'Passes when data\'s text starts with this.' },
      endsWith: { type: 'string', description: 'Passes when data\'s text ends with this.' },
      matches: { type: 'string', description: 'Passes when data\'s text matches this pattern (a regular expression), like ^https.' },
      exists: { type: 'boolean', description: 'true passes when data has any value at all, even 0 or empty text; false passes when it has none. Needs data.' },
      and: { type: 'string', description: 'Values separated by commas, like $vars.signed, viewer.isFriend. Passes when all of them are on.' },
      or: { type: 'string', description: 'Values separated by commas. Passes when at least one of them is on.' },
      not: { type: 'string', description: 'A value that must be off (empty, 0, false or missing). Written with no value next to data, it flips the data test.' }
    },
    relationship: {
      type: 'conditional-action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'Else',
    component: Else,
    group: 'logic',
    description: 'Goes right after an If or ElseIf inside an event like OnClick. Its actions run when none of the tests before it passed. On the page itself it does nothing.',
    example: '<Var name="open" type="boolean" initial="false" />\n<Button>\n  <OnClick>\n    <If data="$vars.open"><ShowToast message="The shop is open" /></If>\n    <Else><ShowToast message="Back tomorrow" type="info" /></Else>\n  </OnClick>\n  Is the shop open?\n</Button>',
    props: {},
    relationship: {
      type: 'conditional-action',
      acceptsChildren: true
    }
  });
}
