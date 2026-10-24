// How much one "your own HTML" page may hold, checked on every compile. Set
// for ordinary old-web pages: a links page of 400 links, a 150-row table, a
// journal of 150 entries, a dozen layout tables nested inside each other.
// A flat 199 KB links page compiles in under 100 ms, so tags and nesting are
// capped only against runaway pages (runawayPageError, below, refuses those
// before parsing); components are the real cost, since each one renders
// (and some hydrate) on every visit.
import { defaultTreeAdapter, parseFragment } from 'parse5';
import { MAX_TEMPLATE_CHARS } from '../limits';
import { tokenizeSource, VOID_ELEMENTS } from './source-scan';

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

/** Far past the limits above, short of where parsing gets slow or overflows */
const RUNAWAY = { elements: TEMPLATE_LIMITS.maxElements * 2, depth: TEMPLATE_LIMITS.maxDepth * 4 };

class TooDeep extends Error {}

/**
 * The limit message for a runaway page, found before the real parse. The
 * HTML parser slows with every level a page nests (30,000 unclosed <div>s
 * took 2 s, blocking every other request) and the tree conversion after it
 * overflows the stack near 3,000 levels, so the exact checks after parsing
 * came too late (template audit 04 H1). Tags are counted from the source;
 * depth is the browser's own, from a parse that stops as soon as it's
 * too deep, and runs only when there are enough tags to get there.
 */
export function runawayPageError(source: string): string | undefined {
  let elements = 0;
  let opening = 0;
  for (const token of tokenizeSource(source)) {
    if (token.type !== 'open') continue;
    elements++;
    if (!VOID_ELEMENTS.has(token.name.toLowerCase())) opening++;
  }
  if (elements > RUNAWAY.elements) return formatLimitError('elements', elements, TEMPLATE_LIMITS.maxElements);
  if (opening <= RUNAWAY.depth) return undefined;

  let depth = 0;
  try {
    parseFragment(source, {
      treeAdapter: {
        ...defaultTreeAdapter,
        onItemPush: () => {
          if (++depth > RUNAWAY.depth) throw new TooDeep();
        },
        onItemPop: () => {
          depth--;
        },
      },
    });
  } catch (error) {
    if (error instanceof TooDeep) return formatLimitError('depth', RUNAWAY.depth, TEMPLATE_LIMITS.maxDepth, true);
    throw error;
  }
  return undefined;
}

