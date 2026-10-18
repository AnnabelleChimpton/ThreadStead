import { RingHubClientError } from '@/lib/api/ringhub/ringhub-client'
import { RingHubAuthError, RingHubUnavailableError } from '@/lib/api/ringhub/ringhub-errors'
import {
  describeRingFailure,
  getAllActiveMemberships,
  NOT_A_MEMBER_REASON,
  PUBLIC_ONLY_REASON,
  REMOVED_BEFORE_REASON,
  postToRings,
  type RingPostingClient,
} from '../ring-submission'

function membership(slug: string) {
  return { ringSlug: slug, ringName: `Ring ${slug}`, status: 'ACTIVE' }
}

/** A fake hub: `rings` the user belongs to, paged like /trp/my/memberships. */
function fakeClient(rings: string[], submit?: RingPostingClient['submitPost']) {
  const getMyMemberships = jest.fn(async (opts?: { limit?: number; offset?: number }) => {
    const limit = opts?.limit ?? 20
    const offset = opts?.offset ?? 0
    const page = rings.slice(offset, offset + limit).map(membership)
    return { memberships: page, hasMore: offset + limit < rings.length }
  })
  const submitPost = jest.fn(submit ?? (async (slug: string) => ({ id: `ref-${slug}`, status: 'ACCEPTED' })))
  return { getMyMemberships, submitPost }
}

const build = () => ({ uri: 'https://example.test/resident/a/post/1', digest: 'sha256:1' })

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

describe('getAllActiveMemberships', () => {
  test('reads past the first page (the hub defaults to 20)', async () => {
    const rings = Array.from({ length: 130 }, (_, i) => `r${i}`)
    const client = fakeClient(rings)
    const all = await getAllActiveMemberships(client)
    expect(all).toHaveLength(130)
    expect(client.getMyMemberships).toHaveBeenCalledTimes(2)
  })
})

describe('postToRings', () => {
  test('a ring past the 20th membership still gets the post', async () => {
    const rings = Array.from({ length: 25 }, (_, i) => `r${i}`)
    const client = fakeClient(rings)
    const results = await postToRings(client, ['r24'], { visibility: 'public', buildSubmission: build })
    expect(results).toEqual([{ slug: 'r24', name: 'Ring r24', status: 'posted', hubPostId: 'ref-r24' }])
  })

  test('reports every requested ring: posted, pending, not a member, hub refusal', async () => {
    const client = fakeClient(['ok', 'curated', 'closed'], async (slug) => {
      if (slug === 'curated') return { id: 'ref-c', status: 'PENDING' }
      if (slug === 'closed') {
        throw new RingHubClientError('Submissions closed', 403, undefined, {
          error: 'Submissions closed',
          message: 'This ring is not accepting new submissions',
        })
      }
      return { id: 'ref-ok', status: 'ACCEPTED' }
    })
    const results = await postToRings(client, ['ok', 'curated', 'closed', 'stranger', 'ok'], {
      visibility: 'public',
      buildSubmission: build,
    })
    expect(results.map((r) => [r.slug, r.status])).toEqual([
      ['ok', 'posted'],
      ['curated', 'pending'],
      ['closed', 'failed'],
      ['stranger', 'failed'],
    ])
    expect(results[2].reason).toBe("This ring isn't taking new posts.")
    expect(results[3].reason).toBe(NOT_A_MEMBER_REASON)
    // The non-member ring is never sent to the hub.
    expect(client.submitPost).toHaveBeenCalledTimes(3)
  })

  test('a 409 duplicate counts as posted, with the existing PostRef id', async () => {
    const client = fakeClient(['ok'], async () => {
      throw new RingHubClientError('Duplicate submission', 409, undefined, {
        error: 'Duplicate submission',
        existingPost: { id: 'ref-existing', status: 'ACCEPTED' },
      })
    })
    const results = await postToRings(client, ['ok'], { visibility: 'public', buildSubmission: build })
    expect(results).toEqual([{ slug: 'ok', name: 'Ring ok', status: 'posted', hubPostId: 'ref-existing' }])
  })

  test('a 409 for a ref that was taken out of the ring fails, since the hub will not take it back', async () => {
    for (const status of ['REMOVED', 'REJECTED']) {
      const client = fakeClient(['ok'], async () => {
        throw new RingHubClientError('Duplicate submission', 409, undefined, {
          error: 'Duplicate submission',
          existingPost: { id: 'ref-old', status },
        })
      })
      const results = await postToRings(client, ['ok'], { visibility: 'public', buildSubmission: build })
      expect(results).toEqual([{ slug: 'ok', name: 'Ring ok', status: 'failed', reason: REMOVED_BEFORE_REASON }])
    }
  })

  test('if memberships cannot be read, every ring fails with the reason', async () => {
    const client = fakeClient([])
    client.getMyMemberships.mockRejectedValue(new RingHubUnavailableError('down'))
    const results = await postToRings(client, ['a', 'b'], { visibility: 'public', buildSubmission: build })
    expect(results.every((r) => r.status === 'failed')).toBe(true)
    expect(results[0].reason).toBe("Ring Hub didn't respond. Try again later.")
    expect(client.submitPost).not.toHaveBeenCalled()
  })

  test('skipMembershipCheck submits to rings the user has not joined', async () => {
    const client = fakeClient([])
    const results = await postToRings(client, ['prompt-ring'], {
      visibility: 'public',
      buildSubmission: build,
      skipMembershipCheck: true,
    })
    expect(results[0]).toMatchObject({ slug: 'prompt-ring', name: 'prompt-ring', status: 'posted' })
  })

  test.each(['private', 'friends', 'followers'])('a %s post goes to no ring and makes no hub call', async (visibility) => {
    const client = fakeClient(['a', 'b'])
    const build = jest.fn(() => ({ uri: 'https://example.test/resident/a/post/1', digest: 'sha256:1' }))
    const results = await postToRings(client, ['a', 'b', 'a'], { visibility, buildSubmission: build })
    expect(results).toEqual([
      { slug: 'a', name: 'a', status: 'failed', reason: PUBLIC_ONLY_REASON },
      { slug: 'b', name: 'b', status: 'failed', reason: PUBLIC_ONLY_REASON },
    ])
    expect(client.getMyMemberships).not.toHaveBeenCalled()
    expect(client.submitPost).not.toHaveBeenCalled()
    expect(build).not.toHaveBeenCalled()
  })

  test('nothing requested means no hub calls', async () => {
    const client = fakeClient(['a'])
    await expect(postToRings(client, [], { visibility: 'public', buildSubmission: build })).resolves.toEqual([])
    expect(client.getMyMemberships).not.toHaveBeenCalled()
  })
})

describe('describeRingFailure', () => {
  test.each([
    ['403 members only', new RingHubClientError('Forbidden', 403, undefined, { error: 'Members only' }), NOT_A_MEMBER_REASON],
    ['404', new RingHubClientError('Not found', 404, undefined, { error: 'Not found' }), 'This ring no longer exists.'],
    ['429', new RingHubClientError('Too many', 429), 'Ring Hub is busy. Try again in a minute.'],
    [
      '400 validation',
      new RingHubClientError('Bad Request', 400, 'FST_ERR_VALIDATION', {
        error: 'Bad Request',
        message: 'body/uri must match format "uri"',
      }),
      'Ring Hub turned it down: body/uri must match format "uri"',
    ],
    ['auth error', new RingHubAuthError('bad sig'), "Ring Hub couldn't confirm it's you. Try again in a bit."],
    ['network failure', new RingHubClientError('Ring Hub request failed: fetch failed'), "Ring Hub didn't respond. Try again later."],
    ['500', new RingHubClientError('Internal error', 500, undefined, { error: 'Internal error' }), "Ring Hub didn't respond. Try again later."],
  ] as const)('%s', (_label, error, reason) => {
    expect(describeRingFailure(error)).toBe(reason)
  })
})
