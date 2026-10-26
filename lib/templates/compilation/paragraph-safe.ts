/**
 * Components that can sit inside a <p>: they render text, inline elements
 * or nothing (actions, events and conditions render at most their
 * children, which are checked in their own right). Any other component
 * draws a box, and a browser won't keep a box inside a paragraph
 * (template-parser.ts, boxesOutOfParagraphs).
 *
 * tests/template-engine/__tests__/paragraph-components.test.tsx renders
 * each one inside a <p> to check. Left out on purpose: components that are
 * empty without data but draw a list with it (MyRings, ProfileBadges,
 * MutualFriends, NotificationCenter, NotificationBell, Breadcrumb), and
 * ones that render whatever tag they're given (CustomHTMLElement, DebugValue).
 * Components whose tag is a prop are safe when it's an inline one
 * (INLINE_WHEN: `<DisplayName as="span" />`).
 */
export const PARAGRAPH_SAFE_COMPONENTS: ReadonlySet<string> = new Set([
  // Text and inline pieces
  'ShowVar', 'Count', 'Sum', 'Get', 'Property', 'GlitchText', 'UserImage', 'HouseBadge', 'FriendBadge',
  'Button', 'Checkbox', 'Select', 'Option', 'CopyToClipboard',
  // Conditions: only their children
  'If', 'ElseIf', 'Else', 'IfOwner', 'IfVisitor', 'Choose', 'When', 'Otherwise', 'Switch', 'Case', 'Default',
  // Events: only their children
  'OnClick', 'OnChange', 'OnHover', 'OnInterval', 'OnKeyPress', 'OnKeyUp', 'OnMount', 'OnMouseEnter', 'OnMouseLeave',
  'OnTimeout', 'Timeout', 'Delay', 'Sequence', 'Step', 'Validate',
  // State and actions: nothing
  'Var', 'Set', 'Increment', 'Decrement', 'Toggle', 'Cycle', 'Reset', 'Push', 'Pop', 'Append', 'Prepend',
  'RemoveAt', 'Clone', 'Merge', 'Extract', 'Filter', 'Find', 'Sort', 'Transform', 'ObjectSet', 'Break', 'Continue',
  'AddClass', 'RemoveClass', 'ToggleClass', 'ConditionalAttr', 'SetCSSVar', 'SetURLHash', 'SetURLParam', 'ShowToast',
]);

/** Components whose tag is chosen by a prop: inline for these values */
export const INLINE_WHEN: Readonly<Record<string, { prop: string; values: readonly string[] }>> = {
  DisplayName: { prop: 'as', values: ['span'] },
  TextElement: { prop: 'tag', values: ['span'] },
};

/** Whether a component, written with these attributes, can sit inside a <p> */
export function paragraphSafe(name: string, attributes: Record<string, unknown> = {}): boolean {
  const inlineWhen = INLINE_WHEN[name];
  if (inlineWhen) return inlineWhen.values.includes(String(attributes[inlineWhen.prop] ?? '').toLowerCase());
  return PARAGRAPH_SAFE_COMPONENTS.has(name);
}
