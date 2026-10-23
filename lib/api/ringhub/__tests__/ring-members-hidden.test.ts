/**
 * @jest-environment node
 *
 * A ring's member list leaves out residents who are suspended, banned or
 * leaving, and anyone the viewer blocks: the hub lists every ACTIVE member
 * and knows nothing of local moderation. The viewer always sees themselves.
 */
jest.mock('@/lib/api/did/server-did-client', () => ({
  mapDIDsToUserIds: async (dids: string[]) => new Map(dids.filter((d) => d.startsWith('did:local:')).map((d) => [d, d.slice(10)])),
}))
jest.mock('@/lib/domain/users/blocks', () => ({
  getHiddenIds: async () => ({ blockedUserIds: ['banned', 'me'] }),
}))

import { transformRingMembersBatchWithUserResolution } from '@/lib/api/ringhub/ringhub-transformers'

const member = (actorDid: string) => ({ actorDid, actorName: actorDid, role: 'member', status: 'ACTIVE', joinedAt: '2026-10-01T00:00:00Z' }) as any
const db = { user: { findMany: async ({ where }: any) => where.id.in.map((id: string) => ({ id, handles: [], profile: null })) } }

it('drops hidden residents but keeps the viewer and members from elsewhere', async () => {
  const members = await transformRingMembersBatchWithUserResolution(
    [member('did:local:ann'), member('did:local:banned'), member('did:local:me'), member('did:web:elsewhere.example:users:x')],
    'knits',
    db,
    'me'
  )
  expect(members.map((m) => m.userId)).toEqual(['ann', 'me', 'did:web:elsewhere.example:users:x'])
})
