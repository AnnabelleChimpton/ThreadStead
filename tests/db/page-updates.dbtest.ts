/* eslint-disable @typescript-eslint/no-explicit-any -- loose Prisma mocks and handler stubs */
/**
 * "Recently updated" and the opt-in "updated their page" feed items, against
 * a real Postgres:
 *  - migration 20261102120000_page_updates backfills Profile.pageUpdatedAt
 *    from the owner's own saves only, and is safe to run again
 *  - sharePageUpdate keeps one PageUpdate per person per UTC day
 *  - the feed's page-update query leaves out blocks (either way), private
 *    and not-followed followers-only pages, and suspended or banned accounts
 *  - the directory's "Recently updated" sort puts unknown times last
 */
import { execSync } from 'child_process'
import path from 'path'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Visibility } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))

import { sharePageUpdate } from '@/lib/domain/profile/page-updates'
import { loadPageUpdates } from '@/lib/feed/page-updates'
import directoryHandler from '@/pages/api/directory'
import { getSessionUser } from '@/lib/auth/server'

const MIGRATION = 'prisma/migrations/20261102120000_page_updates/migration.sql'

function runMigration() {
  execSync(`npx prisma db execute --schema prisma/schema.prisma --file ${MIGRATION}`, {
    cwd: path.resolve(__dirname, '..', '..'),
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

async function resident(
  id: string,
  profile: Record<string, unknown> | null = {},
  account: { moderationStatus?: 'active' | 'suspended' | 'banned' } = {}
) {
  await db.user.create({
    data: {
      id,
      did: `did:test:${id}`,
      primaryHandle: `${id}@${SITE_NAME}`,
      ...account,
      handles: { create: { handle: id, host: SITE_NAME } },
      ...(profile && { profile: { create: { displayName: id, ...profile } } }),
    },
  })
}

async function revision(userId: string, trigger: string, createdAt: Date) {
  await db.profileTemplateRevision.create({ data: { userId, trigger, customCSS: 'x{}', createdAt } })
}

const t = (day: number, hour = 12, minute = 0) => new Date(Date.UTC(2026, 9, day, hour, minute))

beforeAll(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
})
afterAll(() => db.$disconnect())

describe('migration backfill', () => {
  beforeAll(async () => {
    // HTML page: its last compile is the last save
    await resident('html', { templateMode: 'advanced', customTemplate: '<p>hi</p>', templateCompiledAt: t(5) })
    // HTML page with a later CSS save in History: the later one wins
    await resident('both', { templateMode: 'advanced', customTemplate: '<p>hi</p>', templateCompiledAt: t(5) })
    await revision('both', 'css-save', t(9))
    // CSS-only page: its newest owner save in History is the lower bound
    await resident('cssonly', { customCSS: 'a{}' })
    await revision('cssonly', 'css-save', t(3))
    await revision('cssonly', 'template-save', t(7))
    // The site's own changes don't count
    await resident('modded', { customCSS: null })
    await revision('modded', 'css-save', t(2))
    await revision('modded', 'moderator-reset', t(8))
    await revision('modded', 'layout-merge', t(10))
    // The Visual Builder conversion script recompiled this page: not theirs
    await resident('converted', { templateMode: 'advanced', customTemplate: '<p>vb</p>', templateCompiledAt: t(19, 9, 3) })
    await revision('converted', 'css-save', t(1))
    await revision('converted', 'vb-convert', t(19, 9, 0))
    // Nothing known: one CSS save onto an empty page, or a theme at signup
    await resident('unknown', { customCSS: 'a{}' })
    // Already set (a save after deploy): left as it is
    await resident('fresh', { customCSS: 'a{}', templateCompiledAt: t(4), pageUpdatedAt: t(18) })

    runMigration()
  })

  const updatedAt = async (userId: string) =>
    (await db.profile.findUnique({ where: { userId }, select: { pageUpdatedAt: true } }))?.pageUpdatedAt ?? null

  test('the owner’s last save, from the compile time or History', async () => {
    expect(await updatedAt('html')).toEqual(t(5))
    expect(await updatedAt('both')).toEqual(t(9))
    expect(await updatedAt('cssonly')).toEqual(t(7))
  })

  test('moderator resets, the layout merge and the Visual Builder conversion are not the person', async () => {
    expect(await updatedAt('modded')).toEqual(t(2))
    expect(await updatedAt('converted')).toEqual(t(1))
  })

  test('unknown stays null; a time already set is kept', async () => {
    expect(await updatedAt('unknown')).toBeNull()
    expect(await updatedAt('fresh')).toEqual(t(18))
  })

  test('running it again changes nothing', async () => {
    await db.profile.update({ where: { userId: 'html' }, data: { pageUpdatedAt: t(20) } })
    runMigration()
    expect(await updatedAt('html')).toEqual(t(20))
    expect(await updatedAt('unknown')).toBeNull()
  })
})

describe('one feed item per person per day', () => {
  beforeAll(async () => {
    await resident('sharer', { customCSS: 'a{}' })
  })

  test('a second share the same UTC day moves the item; the next day is a new one', async () => {
    expect(await sharePageUpdate('sharer', t(19, 0, 5))).toBe(true)
    expect(await sharePageUpdate('sharer', t(19, 23, 55))).toBe(true)
    let rows = await db.pageUpdate.findMany({ where: { userId: 'sharer' } })
    expect(rows).toHaveLength(1)
    expect(rows[0].sharedAt).toEqual(t(19, 23, 55))

    await sharePageUpdate('sharer', t(20, 0, 1))
    rows = await db.pageUpdate.findMany({ where: { userId: 'sharer' }, orderBy: { sharedAt: 'asc' } })
    expect(rows.map((r) => r.sharedAt)).toEqual([t(19, 23, 55), t(20, 0, 1)])
  })

  test('the day stored is the UTC day, whatever the session timezone', async () => {
    const days = await db.$queryRawUnsafe<{ day: string }[]>(
      `SELECT "day"::text AS day FROM "PageUpdate" WHERE "userId" = 'sharer' ORDER BY "day"`
    )
    expect(days.map((d) => d.day)).toEqual(['2026-10-19', '2026-10-20'])
  })

  test('shares racing on the same day still leave one item', async () => {
    await Promise.all([1, 2, 3, 4].map((m) => sharePageUpdate('sharer', t(21, 10, m))))
    expect(await db.pageUpdate.count({ where: { userId: 'sharer', day: new Date(Date.UTC(2026, 9, 21)) } })).toBe(1)
  })
})

describe('who sees a page update', () => {
  const people: Array<[string, Visibility, 'active' | 'suspended' | 'banned']> = [
    ['viewer', 'public', 'active'],
    ['f_pub', 'public', 'active'],
    ['f_fol', 'followers', 'active'],
    ['s_fol', 'followers', 'active'],
    ['f_frn', 'friends', 'active'],
    ['f_mut', 'friends', 'active'],
    ['f_priv', 'private', 'active'],
    ['f_iblock', 'public', 'active'],
    ['f_blocksme', 'public', 'active'],
    ['f_banned', 'public', 'banned'],
    ['f_susp', 'public', 'suspended'],
  ]

  beforeAll(async () => {
    for (const [id, visibility, moderationStatus] of people) {
      await resident(id, { visibility }, { moderationStatus })
      if (id !== 'viewer') {
        await db.follow.create({ data: { followerId: 'viewer', followeeId: id, status: 'accepted' } })
        await db.pageUpdate.create({ data: { userId: id, day: new Date(Date.UTC(2026, 9, 19)), sharedAt: t(19) } })
      }
    }
    await db.follow.delete({ where: { followerId_followeeId: { followerId: 'viewer', followeeId: 's_fol' } } })
    await db.follow.create({ data: { followerId: 'f_mut', followeeId: 'viewer', status: 'accepted' } })
    await db.userBlock.create({ data: { blockerId: 'viewer', blockedUserId: 'f_iblock' } })
    await db.userBlock.create({ data: { blockerId: 'f_blocksme', blockedUserId: 'viewer' } })
  })

  const names = (rows: { username: string }[]) => rows.map((r) => r.username).filter((n) => n.includes('_')).sort()

  test('Recent: public pages only, minus blocks either way and suspended or banned accounts', async () => {
    expect(names(await loadPageUpdates('viewer', { kind: 'everyone' }, {}))).toEqual(['f_pub'])
  })

  test('Recent, signed out: public pages minus suspended or banned accounts', async () => {
    expect(names(await loadPageUpdates(null, { kind: 'everyone' }, {}))).toEqual(['f_blocksme', 'f_iblock', 'f_pub'])
  })

  test('Following: by profile visibility, minus blocks and moderation', async () => {
    const followeeIds = people.map(([id]) => id).filter((id) => id !== 'viewer' && id !== 's_fol')
    const rows = await loadPageUpdates('viewer', { kind: 'following', followeeIds }, {})
    expect(names(rows)).toEqual(['f_fol', 'f_mut', 'f_pub'])
    expect(rows.find((r) => r.username === 'f_fol')?.publicPage).toBe(false)
  })

  test('the time window', async () => {
    expect(names(await loadPageUpdates(null, { kind: 'everyone' }, { before: t(19) }))).toEqual([])
    expect(names(await loadPageUpdates(null, { kind: 'everyone' }, { notBefore: t(19) }))).toHaveLength(3)
  })
})

describe('"Recently updated" on the residents list', () => {
  beforeAll(async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    await resident('dir_new', { pageUpdatedAt: t(25) })
    await resident('dir_old', { pageUpdatedAt: t(2) })
    await resident('dir_none', {})
    await resident('dir_noprofile', null)
  })

  test('newest first, unknown times (and no profile at all) last', async () => {
    const req = { method: 'GET', query: { sortBy: 'updated', limit: '50', search: 'dir_' }, headers: {}, cookies: {} } as unknown as NextApiRequest
    const res: any = {
      statusCode: 200,
      status(c: number) { this.statusCode = c; return this },
      json(b: any) { this.body = b; return this },
      setHeader() {},
    }
    await directoryHandler(req, res as NextApiResponse)
    expect(res.statusCode).toBe(200)
    const order = res.body.users.map((u: any) => u.username)
    expect(order.slice(0, 2)).toEqual(['dir_new', 'dir_old'])
    expect(order.slice(2).sort()).toEqual(['dir_none', 'dir_noprofile'])
  })
})
