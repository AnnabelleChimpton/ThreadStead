/**
 * A moderator resets someone's profile page (lib/domain/users/page-reset.ts):
 * the page goes back to the standard layout, the old version lands in their
 * revision history, and the action is logged. Real Postgres.
 */
import { db } from '@/lib/config/database/connection'
import { resetProfilePage } from '@/lib/domain/users/page-reset'

async function resident(id: string, profile: Record<string, unknown> = {}) {
  await db.user.create({
    data: {
      id,
      did: `did:user:${id}`,
      primaryHandle: `${id}@HomePageAgain`,
      profile: { create: { displayName: id, ...profile } },
    },
  })
}

beforeAll(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
  await resident('mod')
  await resident('pat', {
    templateMode: 'advanced',
    templateEnabled: true,
    customTemplate: '<h1>hi</h1>',
    compiledTemplate: { mode: 'advanced', staticHTML: '<h1>hi</h1>' },
    templateCompiledAt: new Date(),
    customCSS: 'body { background: plum; }',
    cssMode: 'disable',
    includeSiteCSS: false,
    hideNavigation: true,
  })
  await resident('sam')
})
afterAll(() => db.$disconnect())

test('the page goes back to the standard layout, and the old one is kept in History', async () => {
  const result = await resetProfilePage({ actorId: 'mod', userId: 'pat', reason: 'covers the site nav' })
  expect(result.hadCustomPage).toBe(true)

  const profile = await db.profile.findUnique({ where: { userId: 'pat' } })
  expect(profile).toMatchObject({
    templateMode: 'default',
    templateEnabled: false,
    customTemplate: null,
    compiledTemplate: null,
    templateCompiledAt: null,
    customCSS: null,
    cssMode: 'inherit',
    includeSiteCSS: true,
    hideNavigation: false,
  })

  const revisions = await db.profileTemplateRevision.findMany({ where: { userId: 'pat' } })
  expect(revisions).toHaveLength(1)
  expect(revisions[0]).toMatchObject({
    trigger: 'moderator-reset',
    customTemplate: '<h1>hi</h1>',
    customCSS: 'body { background: plum; }',
    cssMode: 'disable',
    templateMode: 'advanced',
    hideNavigation: true,
  })

  const log = await db.moderationAction.findMany({ where: { userId: 'pat' } })
  expect(log).toEqual([
    expect.objectContaining({ action: 'reset_page', actorId: 'mod', reason: 'covers the site nav', userHandle: 'pat@HomePageAgain' }),
  ])
})

test('a profile with nothing custom is left as it is, but the action is still logged', async () => {
  const result = await resetProfilePage({ actorId: 'mod', userId: 'sam', reason: 'reported, checked' })
  expect(result.hadCustomPage).toBe(false)
  expect(await db.profileTemplateRevision.count({ where: { userId: 'sam' } })).toBe(0)
  expect(await db.moderationAction.count({ where: { userId: 'sam', action: 'reset_page' } })).toBe(1)
})

test('an unknown account is a 404', async () => {
  await expect(resetProfilePage({ actorId: 'mod', userId: 'nobody', reason: 'x' })).rejects.toMatchObject({ status: 404 })
})
