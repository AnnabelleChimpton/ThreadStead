/**
 * After a write to a ring, every cached read it changes is dropped, for every
 * viewer, and nothing about other rings is.
 */
import { cached, clearCache } from '@/lib/api/ringhub/ringhub-cache'
import { forgetRingReads } from '@/lib/api/ringhub/forget-ring-reads'

const KEYS = [
  'ring:knits', 'membership-info:knits', 'street-rings:members:knits',
  'ring-members-all:u1:knits', 'ring-members-all:u2:knits', 'list-rings:anon:{}', 'list-rings:viewer:u2:{}',
  'my-memberships:u1', 'ring-stops:my-rings:u1', 'street-rings:actor:did:web:x',
  // untouched
  'ring:gardens', 'ring-members-all:u1:gardens', 'my-memberships:u2',
]

it('drops what the write changed, and only that', async () => {
  clearCache()
  for (const key of KEYS) await cached(key, 60_000, 60_000, async () => 'old')
  forgetRingReads('knits', ['u1'])
  const fresh = await Promise.all(KEYS.map((key) => cached(key, 60_000, 60_000, async () => 'new')))
  expect(Object.fromEntries(KEYS.map((key, i) => [key, fresh[i]]))).toEqual({
    'ring:knits': 'new', 'membership-info:knits': 'new', 'street-rings:members:knits': 'new',
    'ring-members-all:u1:knits': 'new', 'ring-members-all:u2:knits': 'new', 'list-rings:anon:{}': 'new', 'list-rings:viewer:u2:{}': 'new',
    'my-memberships:u1': 'new', 'ring-stops:my-rings:u1': 'new', 'street-rings:actor:did:web:x': 'new',
    'ring:gardens': 'old', 'ring-members-all:u1:gardens': 'old', 'my-memberships:u2': 'old',
  })
})
