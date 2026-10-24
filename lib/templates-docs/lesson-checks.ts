/**
 * "Check my work" in the editor's Learn panel: a lesson step's checks
 * (lessons.ts), read from the artifact the editor's preview already renders
 * (lib/templates/rendering/page-artifact.ts).
 * The first check that isn't met gives its hint; when the ones that can be
 * read from the page are all met, a step's self-check asks the person.
 */
import type { LessonCheck } from './lessons';
import { islandIdOf, type PageTreeElement, type PageTreeNode } from '@/lib/templates/rendering/page-tree';

interface IslandLike {
  id: string;
  component: string;
  props?: Record<string, unknown>;
}

export interface CheckablePage {
  /** The artifact's tree and components */
  tree?: PageTreeNode[];
  islands?: IslandLike[];
  warnings?: string[];
  /** Taken-out tags; 'document' ones (html, head, body) don't count */
  stripped?: Array<{ category?: string }>;
}

export type CheckResult =
  | { status: 'ok' }
  | { status: 'hint'; hint: string }
  | { status: 'ask'; question: string };

function* walkElements(nodes: PageTreeNode[] = []): Generator<PageTreeElement> {
  for (const node of nodes) {
    if (typeof node === 'string') continue;
    yield node;
    yield* walkElements(node.c);
  }
}

/** Each component, with the one it sits in: where its placeholder sits in the tree */
function* walkIslands(page: CheckablePage): Generator<{ island: IslandLike; parent?: IslandLike }> {
  const byId = new Map((page.islands ?? []).map((island) => [island.id, island]));
  const seen = new Set<string>();
  function* walk(nodes: PageTreeNode[] = [], parent?: IslandLike): Generator<{ island: IslandLike; parent?: IslandLike }> {
    for (const node of nodes) {
      if (typeof node === 'string') continue;
      const id = islandIdOf(node);
      const island = id ? byId.get(id) : undefined;
      if (island) {
        seen.add(island.id);
        yield { island, parent };
      }
      yield* walk(node.c, island ?? parent);
    }
  }
  yield* walk(page.tree);
  for (const island of page.islands ?? []) if (!seen.has(island.id)) yield { island };
}

const textOf = (node: PageTreeNode): string => (typeof node === 'string' ? node : (node.c ?? []).map(textOf).join(''));

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function met(check: LessonCheck, page: CheckablePage): boolean {
  const islands = [...walkIslands(page)];
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
    return [...walkElements(page.tree)].some((node) => node.t === check.tag);
  }
  if ('textChanged' in check) {
    const first = [...walkElements(page.tree)].find((node) => node.t === check.textChanged.tag);
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
