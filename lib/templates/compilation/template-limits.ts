// How much one "your own HTML" page may hold, checked on every compile. Set
// for ordinary old-web pages: a links page of 400 links, a 150-row table, a
// journal of 150 entries, a dozen layout tables nested inside each other.
// Parse + sanitize of a 164 KB, 7,000-tag page takes about 16 ms, so tags and
// nesting are capped only against runaway pages; components are the real
// cost, since each one renders (and some hydrate) on every visit.
import { MAX_TEMPLATE_CHARS } from '../limits';

export const TEMPLATE_LIMITS = {
  /** Same number the save checks, so the editor and the save agree */
  maxChars: MAX_TEMPLATE_CHARS,
  /** HTML tags and components; text between them doesn't count */
  maxElements: 10_000,
  /** Tags inside tags; the <tbody> the browser adds to every table doesn't count */
  maxDepth: 60,
  maxComponents: 400,
} as const;

export type LimitType = 'size' | 'elements' | 'depth' | 'components';

const n = (value: number) => value.toLocaleString('en-US');
const kb = (chars: number) => Math.round(chars / 1000);

/** The message for a page over one limit: what was counted, the most allowed, and what to try. */
export function formatLimitError(limitType: LimitType, currentValue: number, maxValue: number): string {
  switch (limitType) {
    case 'size':
      return `Your page is ${kb(currentValue)} KB of HTML; the most is ${kb(maxValue)} KB. Big <style> blocks can move to the CSS tab, or trim a section.`;
    case 'elements':
      return `Your page has ${n(currentValue)} tags; the most is ${n(maxValue)}. Try trimming a long list or table.`;
    case 'depth':
      return `Your page has tags nested ${currentValue} deep; the most is ${maxValue}. Look for tags that were opened but never closed, or tables inside tables.`;
    case 'components':
      return `Your page uses ${n(currentValue)} components; the most is ${n(maxValue)}. Try removing a few.`;
  }
}
