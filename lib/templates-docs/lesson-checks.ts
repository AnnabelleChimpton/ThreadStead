/**
 * "Check my work" in the editor's Learn panel: a lesson step's checks
 * (lessons.ts), read from the compile the editor's preview already runs.
 * The first check that isn't met gives its hint; when the ones that can be
 * read from the page are all met, a step's self-check asks the person.
 */
import type { LessonCheck } from './lessons';

interface IslandLike {
  component: string;
  props?: Record<string, unknown>;
  children?: IslandLike[];
}

interface NodeLike {
  type?: string;
  tagName?: string;
  value?: string;
  children?: NodeLike[];
}

export interface CheckablePage {
  islands?: IslandLike[];
  ast?: NodeLike;
  warnings?: string[];
  /** Taken-out tags; 'document' ones (html, head, body) don't count */
  stripped?: Array<{ category?: string }>;
}

export type CheckResult =
  | { status: 'ok' }
  | { status: 'hint'; hint: string }
  | { status: 'ask'; question: string };

function* walkIslands(islands: IslandLike[] = [], parent?: IslandLike): Generator<{ island: IslandLike; parent?: IslandLike }> {
  for (const island of islands) {
    yield { island, parent };
    yield* walkIslands(island.children ?? [], island);
  }
}

function* walkNodes(node: NodeLike | undefined): Generator<NodeLike> {
  if (!node) return;
  yield node;
  for (const child of node.children ?? []) yield* walkNodes(child);
}

const textOf = (node: NodeLike): string =>
  node.type === 'text' ? node.value ?? '' : (node.children ?? []).map(textOf).join('');

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function met(check: LessonCheck, page: CheckablePage): boolean {
  const islands = [...walkIslands(page.islands)];
  if ('uses' in check) {
    return islands.some(({ island }) =>
      same(island.component, check.uses) &&
      Object.entries(check.props ?? {}).every(([key, value]) => String(island.props?.[key] ?? '') === value)
    );
  }
  if ('inside' in check) {
    return islands.some(({ island, parent }) => same(island.component, check.inside) && !!parent && same(parent.component, check.parent));
  }
  if ('varDeclared' in check) {
    return islands.some(({ island }) => same(island.component, 'Var') && island.props?.name === check.varDeclared);
  }
  if ('tag' in check) {
    return [...walkNodes(page.ast)].some((node) => node.tagName === check.tag);
  }
  if ('textChanged' in check) {
    const first = [...walkNodes(page.ast)].find((node) => node.tagName === check.textChanged.tag);
    return !!first && textOf(first).trim() !== '' && textOf(first).trim() !== check.textChanged.from;
  }
  if ('noProblems' in check) {
    return (page.warnings ?? []).length === 0 && (page.stripped ?? []).every((s) => s.category === 'document');
  }
  return true;
}

export function checkStep(checks: LessonCheck[] | undefined, page: CheckablePage | null): CheckResult {
  if (!page) return { status: 'hint', hint: "I can't read your page yet. Give the preview a moment, or fix what's listed under the code." };
  for (const check of checks ?? []) {
    if ('selfCheck' in check) continue;
    if (!met(check, page)) return { status: 'hint', hint: check.hint };
  }
  const ask = (checks ?? []).find((c): c is { selfCheck: string } => 'selfCheck' in c);
  return ask ? { status: 'ask', question: ask.selfCheck } : { status: 'ok' };
}
