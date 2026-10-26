/**
 * The CSS pane's completions for restyling components (lib/templates/
 * styling/component-parts.ts): the --ts-* tokens anywhere a custom property
 * goes, and the .ts-* parts where a selector does. Only for a page of your
 * own HTML; the standard layout has neither.
 */
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { cssLanguage } from '@codemirror/lang-css';
import { PARTS, TOKENS } from '@/lib/templates/styling/component-parts';

const TOKEN_OPTIONS: Completion[] = Object.entries(TOKENS).map(([token, what]) => ({
  label: token,
  type: 'variable',
  info: what,
  boost: 1,
}));

/** One option per part, with the component it's in and what it is */
const PART_OPTIONS: Completion[] = [...new Map(PARTS.filter((part) => !part.state).map((part) => [part.part, part])).values()].map((part) => ({
  label: `.${part.part}`,
  type: 'class',
  detail: part.component,
  info: part.what,
}));

export function partCompletions(context: CompletionContext): CompletionResult | null {
  const token = context.matchBefore(/--ts[\w-]*/);
  if (token) return { from: token.from, options: TOKEN_OPTIONS, validFor: /^--[\w-]*$/ };
  // .ts never starts a CSS value, so wherever it's typed it's a selector
  const part = context.matchBefore(/\.ts[\w-]*/);
  if (part) return { from: part.from, options: PART_OPTIONS, validFor: /^\.[\w-]*$/ };
  return null;
}

/** The extension for the CSS pane: added to lang-css's own completions */
export const restylingCompletions = cssLanguage.data.of({ autocomplete: partCompletions });
