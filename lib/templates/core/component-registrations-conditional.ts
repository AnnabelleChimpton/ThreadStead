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
    group: 'logic',
    description: 'Shows the first When inside it whose test passes, or the Otherwise if none do. Put only When and Otherwise inside, with Otherwise last.',
    example: '<Choose>\n  <When data="guestbook.length" greaterThan="0">\n    <p>Thanks to everyone who signed my guestbook.</p>\n  </When>\n  <Otherwise><p>Nobody has signed yet. Be the first.</p></Otherwise>\n</Choose>',
    props: {}
  });

  registry.register({
    name: 'When',
    component: When,
    group: 'logic',
    description: 'Goes inside Choose. Its content shows if its test passes and no When above it did. Best for page data like guestbook.length or viewer.isFriend: it doesn\'t update when a page variable changes, so use If for those.',
    example: '<Choose>\n  <When data="viewer.isFriend"><p>Hi friend, thanks for coming back.</p></When>\n  <When data="viewer.isFollowing"><p>Thanks for following along.</p></When>\n  <Otherwise><p>Welcome, stranger.</p></Otherwise>\n</Choose>',
    props: {
      // Simple condition expressions
      condition: { type: 'string', description: 'Older name for when.' },
      when: { type: 'string', description: 'A quick test: a value that must be on (not empty, 0 or false), like viewer.isFriend. For the opposite, start it with an exclamation mark, like !viewer.isFriend.' },
      data: { type: 'string', description: 'The value to test with the comparison props below, like guestbook.length. On its own, it must be on (not empty, 0 or false).' },

      // Comparison operators
      equals: { type: 'string', description: 'Passes when data is this, compared as text.' },
      notEquals: { type: 'string', description: 'Passes when data is anything else, or missing.' },
      greaterThan: { type: 'string', description: 'Passes when data is a number bigger than this.' },
      lessThan: { type: 'string', description: 'Passes when data is a number smaller than this.' },
      greaterThanOrEqual: { type: 'string', description: 'Passes when data is a number equal to this or bigger.' },
      lessThanOrEqual: { type: 'string', description: 'Passes when data is a number equal to this or smaller.' },

      // String operators
      contains: { type: 'string', description: 'Passes when data\'s text has this in it.' },
      startsWith: { type: 'string', description: 'Passes when data\'s text starts with this.' },
      endsWith: { type: 'string', description: 'Passes when data\'s text ends with this.' },
      matches: { type: 'string', description: 'Passes when data\'s text matches this pattern (a regular expression), like ^https.' },

      // Existence check
      exists: { type: 'string', description: 'A value that must be there at all, even if it\'s 0 or empty. Or write exists with no value next to data to check data.' },

      // Logical operators
      and: { type: 'string', description: 'Values separated by commas, like viewer.isFriend, viewer.isFollowing. Passes when all of them are on.' },
      or: { type: 'string', description: 'Values separated by commas. Passes when at least one of them is on.' },
      not: { type: 'string', description: 'A value that must be off (empty, 0, false or missing). Written with no value next to data, it flips the data test.' }
    }
  });

  registry.register({
    name: 'Otherwise',
    component: Otherwise,
    group: 'logic',
    description: 'Goes last inside Choose. Its content shows when no When above it passed.',
    example: '<Choose>\n  <When data="posts.length" greaterThan="0"><p>My latest thoughts are below.</p></When>\n  <Otherwise><p>No posts yet. I\'m still thinking.</p></Otherwise>\n</Choose>',
    props: {}
  });

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

  // Pattern Matching
  registry.register({
    name: 'Switch',
    component: Switch,
    group: 'logic',
    description: 'Inside an event like OnClick, compares a page variable with each Case and runs the first that matches, or Default if none do. Use it inside an event; on the page itself it doesn\'t show content reliably.',
    example: '<Var name="mood" type="string" initial="sleepy" />\n<Button>\n  <OnClick><Switch value="mood">\n    <Case value="sleepy"><Set var="mood" value="cozy" /></Case>\n    <Default><Set var="mood" value="sleepy" /></Default>\n  </Switch></OnClick>\n  Mood: <ShowVar name="mood" />\n</Button>',
    props: {
      value: { type: 'string', description: 'The name of the page variable to compare, like mood or $vars.mood.' },
      expression: { type: 'string', description: 'A calculation from page variables to compare instead, like $vars.likes % 3.' }
    },
    relationship: {
      type: 'conditional-action',
      acceptsChildren: true
    }
  });

  registry.register({
    name: 'Case',
    component: Case,
    group: 'logic',
    description: 'Goes inside Switch. Its actions run when its value matches the Switch\'s value (1 and "1" count as the same) and no Case above it matched. Instead of value, you can test something with when and a comparison prop.',
    example: '<Var name="likes" type="number" initial="0" />\n<Button>\n  <OnClick><Switch value="likes">\n    <Case when="$vars.likes" greaterThanOrEqual="5"><ShowToast message="That\'s plenty, thank you" /></Case>\n    <Default><Increment var="likes" /></Default>\n  </Switch></OnClick>\n  Like (<ShowVar name="likes" />)\n</Button>',
    props: {
      value: { type: 'string', description: 'The value to match against the Switch\'s value.' },
      when: { type: 'string', description: 'Used instead of value: what to test, like $vars.likes, with one comparison prop below. On its own, it must be on (not empty, 0 or false).' },
      equals: { type: 'string', description: 'Used with when: matches when it\'s this, compared as text.' },
      notEquals: { type: 'string', description: 'Used with when: matches when it\'s anything else, or missing.' },
      greaterThan: { type: 'string', description: 'Used with when: matches when it\'s a number bigger than this.' },
      lessThan: { type: 'string', description: 'Used with when: matches when it\'s a number smaller than this.' },
      greaterThanOrEqual: { type: 'string', description: 'Used with when: matches when it\'s a number equal to this or bigger.' },
      lessThanOrEqual: { type: 'string', description: 'Used with when: matches when it\'s a number equal to this or smaller.' },
      contains: { type: 'string', description: 'Used with when: matches when its text has this in it.' },
      startsWith: { type: 'string', description: 'Used with when: matches when its text starts with this.' },
      endsWith: { type: 'string', description: 'Used with when: matches when its text ends with this.' },
      matches: { type: 'string', description: 'Used with when: matches when its text fits this pattern (a regular expression).' }
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
    group: 'logic',
    description: 'Goes last inside Switch. Its actions run when no Case above it matched.',
    example: '<Var name="mood" type="string" initial="wired" />\n<Button>\n  <OnClick><Switch value="mood">\n    <Case value="wired"><Set var="mood" value="cozy" /></Case>\n    <Default><Set var="mood" value="wired" /></Default>\n  </Switch></OnClick>\n  Mood: <ShowVar name="mood" />\n</Button>',
    props: {},
    relationship: {
      type: 'conditional-action',
      acceptsChildren: true,
      requiresParent: 'Switch'
    }
  });
}
