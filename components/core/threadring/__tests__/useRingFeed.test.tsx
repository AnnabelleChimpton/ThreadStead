/**
 * The ring feed shows this ring's posts, or them with its relatives': a
 * switch cancels the read in flight (a slow answer for the old choice never
 * lands on the new one), several scopes are merged newest first, and a post
 * changed from its menu is patched where it sits instead of the whole list
 * snapping back to page one of "This ring".
 */
import { renderHook, act } from '@testing-library/react';

const showError = jest.fn();
jest.mock('@/contexts/ToastContext', () => ({ useToast: () => ({ showError }) }));

import { useRingFeed } from '../useRingFeed';

type Pending = { url: string; signal?: AbortSignal; resolve: (body: unknown) => void };
let pending: Pending[];

function respond(urlPart: string, body: unknown) {
  const index = pending.findIndex((p) => p.url.includes(urlPart));
  if (index === -1) throw new Error(`No pending fetch for ${urlPart}`);
  const [request] = pending.splice(index, 1);
  return act(async () => request.resolve(body));
}

beforeEach(() => {
  pending = [];
  (globalThis as any).fetch = jest.fn((url: string, init?: { signal?: AbortSignal }) => new Promise((resolve) => {
    pending.push({ url, signal: init?.signal, resolve: (body) => resolve({ ok: true, status: 200, json: async () => body }) });
  }));
});

const page = (ids: string[], more = false, offset = 0) => ({
  posts: ids.map((id) => ({ id, isPinned: false, createdAt: `2026-10-${id.slice(-2)}T00:00:00Z` })),
  hasMore: more,
  nextOffset: offset + ids.length,
});

test("switching cancels the old read, and the old answer never lands", async () => {
  const { result } = renderHook(() => useRingFeed('knits'));
  act(() => result.current.setScope('with'));
  await respond('scope=family', page(['f1']));

  const stale = pending.find((p) => p.url.includes('scope=current'))!;
  expect(stale.signal?.aborted).toBe(true);
  await respond('scope=current', page(['c1']));

  expect(result.current.scope).toBe('with');
  expect(result.current.posts.map((p) => p.id)).toEqual(['f1']);
});

test('a pin or a removal is patched in place, keeping the pages already loaded', async () => {
  const { result } = renderHook(() => useRingFeed('knits'));
  await respond('offset=0', page(['p1', 'p2'], true));
  await act(async () => { await Promise.all([result.current.loadMore(), respond('offset=2', page(['p3']))]); });
  expect(result.current.posts.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);

  await act(async () => { await result.current.postChanged('p3', { isPinned: true }); });
  await act(async () => { await result.current.postChanged('p1', { removed: true }); });

  expect(result.current.posts.map((p) => [p.id, p.isPinned])).toEqual([['p2', false], ['p3', true]]);
  expect(pending).toEqual([]);
});

test('a post deleted from its menu leaves the list', async () => {
  const { result } = renderHook(() => useRingFeed('knits'));
  await respond('offset=0', page(['p1', 'p2']));
  (globalThis as any).fetch = jest.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }));

  await act(async () => { await result.current.postChanged('p1'); });
  expect(result.current.posts.map((p) => p.id)).toEqual(['p2']);
});

test('with its branches, two scopes are merged newest first, a post in both is shown once, and each is read on from where it stopped', async () => {
  const { result } = renderHook(() => useRingFeed('knits', ['current', 'children']));
  act(() => result.current.setScope('with'));
  await respond('scope=current&offset=0', page(['stale01'])); // "This ring", cancelled
  await respond('scope=current&offset=0', page(['r20', 'r10'], true));
  await respond('scope=children&offset=0', page(['b15', 'r10', 'b05'], false));

  // r10 was in both; the ring's own stream ran out first, so the page stops there
  expect(result.current.posts.map((p) => p.id)).toEqual(['r20', 'b15', 'r10']);
  expect(result.current.hasMore).toBe(true);

  await act(async () => { await Promise.all([result.current.loadMore(), respond('scope=current&offset=2', page(['r08'], false, 2))]); });
  expect(result.current.posts.map((p) => p.id)).toEqual(['r20', 'b15', 'r10', 'r08', 'b05']);
  expect(result.current.hasMore).toBe(false);
});
