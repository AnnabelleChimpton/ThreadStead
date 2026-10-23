/**
 * Hub ring mirror rows that still name their first poster as curatorId.
 *
 * scripts/repair-ring-mirror-curators.ts points each one at the hub's owner
 * (RingHubOwnership, else the local person holding the hub's ownerDid, else
 * nobody). Ring Hub itself is a stub here.
 */
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

jest.mock('@/scripts/load-env', () => ({}))

import {
  planMirrorCuratorRepair,
  applyMirrorCuratorRepair,
  HubOwnerLookup,
} from '@/scripts/repair-ring-mirror-curators'

let seq = 0

async function person(handle: string, did?: string) {
  const id = `u_${handle}`
  await db.user.create({
    data: {
      id,
      did: `did:test:${handle}:${seq++}`,
      primaryHandle: `${handle}@${SITE_NAME}`,
      handles: { create: { handle, host: SITE_NAME } },
    },
  })
  if (did) {
    await db.userDID.create({
      data: { userId: id, did, userHash: `hash_${handle}`, publicKeyMultibase: 'pk', secretKeyEncrypted: 'sk' },
    })
  }
  return id
}

/** A mirror row as mirrorRingResults used to make it: curated by the first poster. */
async function mirror(slug: string, curatorId: string | null, extra: { isSystemRing?: boolean; description?: string } = {}) {
  await db.threadRing.create({
    data: {
      uri: `https://example.test/tr/${slug}`,
      name: slug,
      slug,
      description: extra.description ?? `RingHub ThreadRing: ${slug}`,
      isSystemRing: extra.isSystemRing ?? false,
      curatorId,
    },
  })
}

async function owns(slug: string, ownerUserId: string, serverDID: string) {
  await db.ringHubOwnership.create({
    data: { ringSlug: slug, ringUri: `https://hub.test/trp/rings/${slug}`, ownerUserId, serverDID },
  })
}

const curatorOf = async (slug: string) =>
  (await db.threadRing.findUniqueOrThrow({ where: { slug }, select: { curatorId: true } })).curatorId

/** The hub, as far as these tests need it. */
const hub = (owners: Record<string, string | Error>): HubOwnerLookup => async (slug) => {
  const owner = owners[slug]
  if (owner instanceof Error) throw owner
  return owner ?? null
}

let FIRST: string, OWNER: string, DIDOWNER: string

beforeEach(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
  await db.$executeRawUnsafe('TRUNCATE "ThreadRing" RESTART IDENTITY CASCADE')
  await db.$executeRawUnsafe('TRUNCATE "RingHubOwnership" RESTART IDENTITY CASCADE')
  FIRST = await person('first', 'did:key:first')
  OWNER = await person('owner', 'did:key:owner')
  DIDOWNER = await person('didowner', 'did:key:didowner')
})

afterAll(() => db.$disconnect())

describe('repair-ring-mirror-curators', () => {
  beforeEach(async () => {
    await mirror('tracked', FIRST) // RingHubOwnership names OWNER
    await owns('tracked', OWNER, 'did:key:owner')
    await mirror('by-did', FIRST) // hub owner is a local person, no RingHubOwnership row
    await mirror('remote', FIRST) // hub owner isn't anyone here
    await mirror('right', OWNER) // already right
    await owns('right', OWNER, 'did:key:owner')
    await mirror('hub-down', FIRST) // hub errors
    await mirror('hub-gone', FIRST) // hub doesn't know it
    await mirror('system', FIRST, { isSystemRing: true }) // not a mirror
    await mirror('local-ring', FIRST, { description: 'A ring made here' }) // not a mirror
  })

  const hubOwners = {
    'by-did': 'did:key:didowner',
    remote: 'did:web:elsewhere.example',
    'hub-down': new Error('timeout'),
  }

  it('dry run plans the owner for each mirror row and writes nothing', async () => {
    const plan = await planMirrorCuratorRepair(hub(hubOwners))

    expect(plan.total).toBe(6)
    expect(plan.unchanged).toBe(1)
    expect(plan.changes.map(({ slug, from, to, why }) => ({ slug, from, to, why }))).toEqual([
      { slug: 'by-did', from: FIRST, to: DIDOWNER, why: 'hub_owner_did' },
      { slug: 'remote', from: FIRST, to: null, why: 'hub_owner_not_local' },
      { slug: 'tracked', from: FIRST, to: OWNER, why: 'ringhub_ownership' },
    ])
    expect(plan.skipped.map((s) => s.slug).sort()).toEqual(['hub-down', 'hub-gone'])

    expect(await curatorOf('tracked')).toBe(FIRST)
    expect(await curatorOf('remote')).toBe(FIRST)
  })

  it('--apply writes the plan, leaves skipped and non-mirror rows alone, and a re-run finds nothing', async () => {
    const plan = await planMirrorCuratorRepair(hub(hubOwners))
    expect(await applyMirrorCuratorRepair(plan.changes)).toBe(3)

    expect(await curatorOf('tracked')).toBe(OWNER)
    expect(await curatorOf('by-did')).toBe(DIDOWNER)
    expect(await curatorOf('remote')).toBeNull()
    expect(await curatorOf('right')).toBe(OWNER)
    expect(await curatorOf('hub-down')).toBe(FIRST)
    expect(await curatorOf('hub-gone')).toBe(FIRST)
    expect(await curatorOf('system')).toBe(FIRST)
    expect(await curatorOf('local-ring')).toBe(FIRST)

    const again = await planMirrorCuratorRepair(hub(hubOwners))
    expect(again.changes).toEqual([])
    expect(again.unchanged).toBe(4)
  })

  it("doesn't overwrite a row that changed after the plan", async () => {
    const plan = await planMirrorCuratorRepair(hub(hubOwners))
    // A hand-over lands between the plan and the write.
    await db.threadRing.update({ where: { slug: 'remote' }, data: { curatorId: OWNER } })

    expect(await applyMirrorCuratorRepair(plan.changes)).toBe(2)
    expect(await curatorOf('remote')).toBe(OWNER)
  })

  it('without the hub, only fixes rows with a RingHubOwnership row', async () => {
    const plan = await planMirrorCuratorRepair(null)
    expect(plan.changes.map((c) => c.slug)).toEqual(['tracked'])
    expect(plan.skipped).toHaveLength(4)
  })
})
