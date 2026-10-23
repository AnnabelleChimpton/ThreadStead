/**
 * A ring's family is the rings started from each other, never the Spool: a
 * ring started from the Spool has no parent here, and the Spool's other rings
 * aren't its siblings. The feed's "With …" choice shows only when a relative
 * has posts, names it when there's one, and reads only real relatives.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useRingFamily } from '../useRingFamily';

const ring = (slug: string, postCount = 0) => ({ id: `id-${slug}`, slug, name: slug.replace(/^\w/, (c) => c.toUpperCase()), postCount });

async function familyOf(lineage: object) {
  globalThis.fetch = jest.fn(async () => ({ ok: true, json: async () => lineage })) as unknown as typeof fetch;
  const { result } = renderHook(() => useRingFamily('knits'));
  await waitFor(() => expect(result.current.loaded).toBe(true));
  return result.current;
}

test('started from the Spool, with one branch that has posts: "With" it, this ring and its branches only', async () => {
  const family = await familyOf({ parents: [ring('spool')], children: [ring('socks', 2), ring('mittens')], siblingsCount: 40 });
  expect(family.parent).toBeNull();
  expect(family.branches.map((b) => b.slug)).toEqual(['socks', 'mittens']);
  expect(family.feed).toEqual({ label: 'With Socks', scopes: ['current', 'children'] });
});

test('relatives without posts offer no switch', async () => {
  const family = await familyOf({ parents: [ring('spool')], children: [ring('mittens')], siblingsCount: 3 });
  expect(family.feed).toBeNull();
});

test("a real parent brings the hub's whole family, siblings and all", async () => {
  const family = await familyOf({ parents: [ring('crafts', 5)], children: [ring('socks', 1)], siblingsCount: 1 });
  expect(family.parent?.slug).toBe('crafts');
  expect(family.feed).toEqual({ label: 'Whole family', scopes: ['family'] });
});

test('a lineage read that fails is a ring with no family', async () => {
  globalThis.fetch = jest.fn(async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
  const { result } = renderHook(() => useRingFamily('knits'));
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current).toMatchObject({ parent: null, branches: [], feed: null });
});
