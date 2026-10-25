// How much one "your own HTML" page may hold, checked on every compile. Set
// for ordinary old-web pages: a links page of 400 links, a 150-row table, a
// journal of 150 entries, a dozen layout tables nested inside each other.
// A flat 199 KB links page compiles in under 100 ms, so tags and nesting are
// capped only against runaway pages (runawayPageError and depthGuard, below,
// refuse those before or while parsing); components are the real cost, since
// each one renders (and some hydrate) on every visit.
import { MAX_TEMPLATE_CHARS } from '../limits';
import { tokenizeSource } from './source-scan';

export const TEMPLATE_LIMITS = {
  /** Same number the save checks, so the editor and the save agree */
  maxChars: MAX_TEMPLATE_CHARS,
  /** HTML tags and components; text between them doesn't count */
  maxElements: 10_000,
  /**
   * Tags inside tags; the <tbody> the browser adds to every table doesn't
   * count. Old pages that never close their <font> tags nest a few hundred
   * deep in any browser (60 refused them).
   */
  maxDepth: 256,
  maxComponents: 400,
} as const;

export type LimitType = 'size' | 'elements' | 'depth' | 'components';

const n = (value: number) => value.toLocaleString('en-US');
const kb = (chars: number) => Math.round(chars / 1000);

/**
 * The message for a page over one limit: what was counted, the most allowed,
 * and what to try. `moreThan`: counting stopped at currentValue.
 */
export function formatLimitError(limitType: LimitType, currentValue: number, maxValue: number, moreThan = false): string {
  switch (limitType) {
    case 'size':
      return `Your page is ${kb(currentValue)} KB of HTML; the most is ${kb(maxValue)} KB. Big <style> blocks can move to the CSS tab, or trim a section.`;
    case 'elements':
      return `Your page has ${n(currentValue)} tags; the most is ${n(maxValue)}. Try trimming a long list or table.`;
    case 'depth':
      return `Your page has tags nested ${moreThan ? 'more than ' : ''}${n(currentValue)} deep; the most is ${maxValue}. Look for tags that were opened but never closed, or tables inside tables.`;
    case 'components':
      return `Your page uses ${n(currentValue)} components; the most is ${n(maxValue)}. Try removing a few.`;
  }
}

/**
 * Far past the limits above, short of where parsing gets slow or overflows.
 * Depth is absolute: the tree conversion after parsing overflows the stack
 * near 3,000 levels, whatever the cap is set to.
 */
const RUNAWAY = { elements: TEMPLATE_LIMITS.maxElements * 2, depth: 1_024 };

/**
 * The limit message for a page with far too many tags, counted from the
 * source before it's parsed. The HTML parser slows with every level a page
 * nests (30,000 unclosed <div>s took 2 s, blocking every other request), so
 * the exact checks after parsing came too late (template audit 04 H1); depth
 * is checked during the parse itself (depthGuard).
 */
export function runawayPageError(source: string): string | undefined {
  let elements = 0;
  for (const token of tokenizeSource(source)) if (token.type === 'open') elements++;
  if (elements > RUNAWAY.elements) return formatLimitError('elements', elements, TEMPLATE_LIMITS.maxElements);
  return undefined;
}

/** What the page's parse throws once the page nests far too deep */
export class RunawayDepth extends Error {
  constructor() {
    super(formatLimitError('depth', RUNAWAY.depth, TEMPLATE_LIMITS.maxDepth, true));
  }
}

/**
 * Tree-adapter hooks that stop a parse as soon as it's too deep: the
 * browser's own depth, as it builds the tree
 */
export function depthGuard() {
  let depth = 0;
  return {
    onItemPush: () => {
      if (++depth > RUNAWAY.depth) throw new RunawayDepth();
    },
    onItemPop: () => {
      depth--;
    },
  };
}
