/* eslint-disable @typescript-eslint/no-explicit-any -- fixtures and mocked Next contexts are loosely typed on purpose */
/**
 * The showcase and "Start from this page" (lib/domain/profile/showcase.ts,
 * lib/domain/profile/shared-source.ts):
 *
 *  - the showcase lists only public, opted-in pages of a resident's own HTML,
 *    leaving out blocks either way and suspended or banned accounts. The
 *    filter is run against fixtures by a small evaluator of the Prisma
 *    operators it uses, so these are the real rules, not their shape.
 *  - starting from a page refuses anything /resident/<u>/source wouldn't
 *    show, and puts a credit note on top of what it hands the editor.
 *  - the editor page sends signed-out visitors to sign in, and loads a
 *    started page only for its owner.
 */
jest.mock('@/lib/config/database/connection', () => ({
  db: { handle: { findFirst: jest.fn() }, user: { findMany: jest.fn() } },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }))
jest.mock('@/lib/domain/users/profile-access', () => ({
  ...jest.requireActual('@/lib/domain/users/profile-access'),
  residentAccess: jest.fn(),
}))
jest.mock('@/components/features/templates/EnhancedTemplateEditor', () => () => null)
jest.mock('@/components/ui/layout/Layout', () => () => null)

import { db } from '@/lib/config/database/connection'
import { getSessionUser } from '@/lib/auth/server'
import { residentAccess } from '@/lib/domain/users/profile-access'
import { SITE_NAME } from '@/lib/config/site/constants'
import { getSiteBaseUrl } from '@/lib/config/site-url'
import { listShowcase, parseOffset } from '@/lib/domain/profile/showcase'
import { creditComment, startFromPage } from '@/lib/domain/profile/shared-source'
import { startFromHref } from '@/lib/domain/profile/start-from-link'
import { getServerSideProps as editorProps } from '@/pages/resident/[username]/template-editor'
import { getServerSideProps as sourceProps } from '@/pages/resident/[username]/source'

// --- A tiny Prisma `where` evaluator for the operators the filters use -------

type Row = Record<string, any>

function matchScalar(value: any, filter: any): boolean {
  if (filter instanceof Date) return value instanceof Date && value.getTime() === filter.getTime()
  if (filter === null || typeof filter !== 'object') return value === filter
  return Object.entries(filter).every(([op, arg]: [string, any]) => {
    switch (op) {
      case 'not':
        // SQL: a NULL never matches `<> x`, and `not: null` is IS NOT NULL
        return arg === null ? value !== null && value !== undefined : value != null && value !== arg
      case 'lte':
        return value != null && value <= arg
      case 'gt':
        return value != null && value > arg
      default:
        throw new Error(`evaluator: unsupported operator ${op}`)
    }
  })
}

function matches(row: Row | null | undefined, where: any): boolean {
  if (!row) return false
  return Object.entries(where).every(([key, cond]: [string, any]) => {
    if (key === 'AND') return (cond as any[]).every((c) => matches(row, c))
    if (key === 'OR') return (cond as any[]).some((c) => matches(row, c))
    if (key === 'NOT') return ![cond].flat().some((c) => matches(row, c))
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('is' in cond) return cond.is === null ? row[key] == null : matches(row[key], cond.is)
      if ('some' in cond) return (row[key] ?? []).some((r: Row) => matches(r, cond.some))
      if ('none' in cond) return !(row[key] ?? []).some((r: Row) => matches(r, cond.none))
    }
    return matchScalar(row[key], cond)
  })
}

// --- Fixtures -----------------------------------------------------------------

const VIEWER = 'u_viewer'
const day = (n: number) => new Date(Date.UTC(2026, 9, n))

function resident(name: string, profile: Row | null, extra: Row = {}): Row {
  return {
    id: `u_${name}`,
    moderationStatus: 'active',
    suspendedUntil: null,
    deletesAt: null,
    handles: [{ handle: name, host: SITE_NAME }],
    profile:
      profile === null
        ? null
        : {
            displayName: name.toUpperCase(),
            visibility: 'public',
            templateMode: 'advanced',
            showTemplateSource: true,
            customTemplate: '<h1>hi</h1>',
            templateCompiledAt: day(1),
            ...profile,
          },
    followers: [],
    following: [],
    blocksCreated: [],
    blocksReceived: [],
    ...extra,
  }
}

const RESIDENTS: Row[] = [
  resident('shared', { templateCompiledAt: day(10) }),
  resident('older', { templateCompiledAt: day(5) }),
  resident('nevercompiled', { templateCompiledAt: null }),
  resident('mine', { templateCompiledAt: day(3) }, { id: VIEWER }),
  // Left out:
  resident('notsharing', { showTemplateSource: false }),
  resident('standard', { templateMode: 'enhanced' }),
  resident('olddefault', { templateMode: 'default' }),
  resident('emptyhtml', { customTemplate: '' }),
  resident('nullhtml', { customTemplate: null }),
  resident('noprofile', null),
  resident('followersonly', { visibility: 'followers' }, { followers: [{ followerId: VIEWER, status: 'accepted' }] }),
  resident('private', { visibility: 'private' }),
  resident('blockedbyme', {}, { blocksReceived: [{ blockerId: VIEWER }] }),
  resident('blockedme', {}, { blocksCreated: [{ blockedUserId: VIEWER }] }),
  resident('banned', {}, { moderationStatus: 'banned' }),
  resident('suspended', {}, { moderationStatus: 'suspended', suspendedUntil: new Date(Date.now() + 86_400_000) }),
  resident('leaving', {}, { deletesAt: new Date(Date.now() + 86_400_000) }),
  resident('remote', {}, { handles: [{ handle: 'remote', host: 'elsewhere.example' }] }),
]

/** findMany over the fixtures: where, orderBy (as listShowcase sends it), skip, take, select */
function fakeFindMany(rows: Row[]) {
  return jest.fn(async (args: any) => {
    const order = args.orderBy
    expect(order).toEqual([{ profile: { templateCompiledAt: { sort: 'desc', nulls: 'last' } } }, { id: 'desc' }])
    const sorted = rows
      .filter((r) => matches(r, args.where))
      .sort((a, b) => {
        const ta = a.profile?.templateCompiledAt?.getTime() ?? -Infinity
        const tb = b.profile?.templateCompiledAt?.getTime() ?? -Infinity
        return tb - ta || (a.id < b.id ? 1 : -1)
      })
    return sorted.slice(args.skip, args.skip + args.take).map((r) => ({
      id: r.id,
      handles: r.handles.filter((h: Row) => h.host === args.select.handles.where.host).slice(0, 1),
      profile: r.profile ? { displayName: r.profile.displayName } : null,
    }))
  })
}

beforeEach(() => jest.clearAllMocks())

describe('the showcase', () => {
  test('lists only public, opted-in pages of their own HTML, newest compiled first', async () => {
    const findMany = fakeFindMany(RESIDENTS)
    const list = await listShowcase({ user: { findMany } } as any, VIEWER)
    expect(list.pages.map((p) => p.username)).toEqual(['shared', 'older', 'mine', 'nevercompiled'])
    expect(list.pages[0]).toEqual({ id: 'u_shared', username: 'shared', displayName: 'SHARED' })
    expect(list.hasMore).toBe(false)
  })

  test('signed out, blocks don’t come into it, and everything else still applies', async () => {
    const list = await listShowcase({ user: { findMany: fakeFindMany(RESIDENTS) } } as any, null)
    expect(list.pages.map((p) => p.username)).toEqual([
      'shared', 'older', 'mine', 'blockedme', 'blockedbyme', 'nevercompiled',
    ])
  })

  test('blocks either way, followers-only, private, suspended and banned pages are left out', async () => {
    const list = await listShowcase({ user: { findMany: fakeFindMany(RESIDENTS) } } as any, VIEWER)
    const listed = list.pages.map((p) => p.username)
    for (const hidden of ['blockedbyme', 'blockedme', 'followersonly', 'private', 'suspended', 'banned']) {
      expect(listed).not.toContain(hidden)
    }
  })

  test('pages through with an offset', async () => {
    const findMany = fakeFindMany(RESIDENTS)
    const first = await listShowcase({ user: { findMany } } as any, VIEWER, { limit: 3 })
    expect(first.pages.map((p) => p.username)).toEqual(['shared', 'older', 'mine'])
    expect(first.hasMore).toBe(true)
    const second = await listShowcase({ user: { findMany } } as any, VIEWER, { offset: 3, limit: 3 })
    expect(second.pages.map((p) => p.username)).toEqual(['nevercompiled'])
    expect(second.hasMore).toBe(false)
  })

  test('a bad offset reads as the start', () => {
    expect(parseOffset('24')).toBe(24)
    for (const bad of [undefined, '', '-3', '1.5', 'abc', ['x']]) expect(parseOffset(bad)).toBe(0)
  })
})

// --- Start from this page -----------------------------------------------------

const PAT_TEMPLATE = '<h1>Pat was here</h1>'
const PAT_CSS = 'h1 { color: hotpink; }'

function patHandle(profile: Row = {}) {
  return {
    handle: 'pat',
    user: {
      id: 'u_pat',
      profile: {
        displayName: 'Pat',
        avatarUrl: null,
        visibility: 'public',
        templateMode: 'advanced',
        cssMode: 'disable',
        showTemplateSource: true,
        customTemplate: PAT_TEMPLATE,
        customCSS: PAT_CSS,
        ...profile,
      },
    },
  }
}

const viewer = { id: VIEWER, role: 'member', primaryHandle: 'sam@local' } as any
const findHandle = db.handle.findFirst as jest.Mock
const access = residentAccess as jest.Mock

describe('startFromPage', () => {
  beforeEach(() => access.mockResolvedValue({ visible: true }))

  test('hands over the template with a credit note on top, and the CSS', async () => {
    findHandle.mockResolvedValue(patHandle())
    const start = await startFromPage(viewer, 'pat', 'https://example.test/')
    expect(start).toEqual({
      ok: true,
      username: 'pat',
      template: `<!-- Started from @pat's page: https://example.test/resident/pat -->\n${PAT_TEMPLATE}`,
      css: PAT_CSS,
      cssMode: 'disable',
    })
    expect(access).toHaveBeenCalledWith(viewer, 'u_pat', 'public')
  })

  test('refuses a page whose source isn’t shared', async () => {
    findHandle.mockResolvedValue(patHandle({ showTemplateSource: false }))
    expect(await startFromPage(viewer, 'pat')).toEqual({ ok: false, reason: 'not_shared' })
  })

  test('refuses a page the viewer can’t see, without saying more than the page does', async () => {
    findHandle.mockResolvedValue(patHandle({ visibility: 'friends' }))
    access.mockResolvedValue({ visible: false, visibility: 'friends', blocked: false })
    expect(await startFromPage(viewer, 'pat')).toEqual({ ok: false, reason: 'not_shared' })

    access.mockResolvedValue({ visible: false, visibility: 'private', blocked: true })
    expect(await startFromPage(viewer, 'pat')).toEqual({ ok: false, reason: 'not_shared' })

    access.mockResolvedValue({ visible: false, visibility: 'private', blocked: false, suspended: true })
    expect(await startFromPage(viewer, 'pat')).toEqual({ ok: false, reason: 'not_found' })
  })

  test('refuses a missing page, a standard-layout page and your own', async () => {
    findHandle.mockResolvedValue(null)
    expect(await startFromPage(viewer, 'nobody')).toEqual({ ok: false, reason: 'not_found' })

    findHandle.mockResolvedValue(patHandle({ templateMode: 'enhanced' }))
    expect(await startFromPage(viewer, 'pat')).toEqual({ ok: false, reason: 'no_html' })

    findHandle.mockResolvedValue(patHandle({ customTemplate: '  ' }))
    expect(await startFromPage(viewer, 'pat')).toEqual({ ok: false, reason: 'no_html' })

    findHandle.mockResolvedValue({ ...patHandle(), user: { ...patHandle().user, id: VIEWER } })
    expect(await startFromPage(viewer, 'pat')).toEqual({ ok: false, reason: 'own_page' })
  })

  test('a handle that can’t exist never reaches the database', async () => {
    expect(await startFromPage(viewer, '../../api/x')).toEqual({ ok: false, reason: 'not_found' })
    expect(findHandle).not.toHaveBeenCalled()
  })
})

describe('creditComment', () => {
  test('names the page and links to it', () => {
    expect(creditComment('pat', 'https://example.test')).toBe(
      "<!-- Started from @pat's page: https://example.test/resident/pat -->"
    )
  })

  test('a handle with "--" can’t end the comment early', () => {
    const note = creditComment('a--b', 'https://example.test')
    expect(note.slice(4, -3)).not.toContain('--')
    expect(note).toContain('https://example.test/resident/a%2D%2Db')
  })
})

describe('startFromHref', () => {
  test('signed in goes to your own editor, signed out signs in first', () => {
    expect(startFromHref('sam', true, 'pat')).toBe('/resident/sam/template-editor?from=pat')
    expect(startFromHref(null, false, 'pat')).toBe('/login')
    expect(startFromHref(null, true, 'pat')).toBe('/onboarding')
  })
})

// --- The editor page ------------------------------------------------------------

describe('/resident/[username]/template-editor', () => {
  const json = (status: number, body: any) => ({ ok: status < 400, status, json: async () => body }) as Response
  const ctx = (from?: string) =>
    ({ params: { username: 'sam' }, query: from ? { from } : {}, req: { headers: { cookie: 'c=1' } } }) as any

  beforeEach(() => {
    access.mockResolvedValue({ visible: true })
    findHandle.mockResolvedValue(patHandle())
    global.fetch = jest.fn(async (url: string) =>
      url.endsWith('/template')
        ? json(200, { template: '<p>Sam’s own page</p>' })
        : json(200, { userId: VIEWER, profile: { customCSS: 'p{}', templateMode: 'enhanced', cssMode: 'inherit' } })
    ) as any
  })

  test('signed out goes to sign in, and nothing is looked up', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    const result: any = await editorProps(ctx('pat'))
    expect(result).toEqual({ redirect: { destination: '/login', permanent: false } })
    expect(findHandle).not.toHaveBeenCalled()
  })

  test('?from= loads their page with the credit note, as a starting point', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(viewer)
    const { props }: any = await editorProps(ctx('pat'))
    expect(props.existingTemplate).toBe(`${creditComment('pat', getSiteBaseUrl())}\n${PAT_TEMPLATE}`)
    expect(props.customCSS).toBe(PAT_CSS)
    expect(props.cssMode).toBe('disable')
    expect(props.startedFrom).toEqual({ ok: true, username: 'pat' })
    // The page's own layout badge still reflects the live page
    expect(props.templateMode).toBe('enhanced')
  })

  test('a page that isn’t shared opens your own page, with a note why', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(viewer)
    findHandle.mockResolvedValue(patHandle({ showTemplateSource: false }))
    const { props }: any = await editorProps(ctx('pat'))
    expect(props.existingTemplate).toBe('<p>Sam’s own page</p>')
    expect(props.customCSS).toBe('p{}')
    expect(props.startedFrom).toEqual({ ok: false, username: 'pat', reason: 'not_shared' })
  })

  test('someone else’s editor never loads a started page', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue({ ...viewer, id: 'u_other', primaryHandle: 'other@local' })
    const { props }: any = await editorProps(ctx('pat'))
    expect(props.isOwner).toBe(false)
    expect(props.startedFrom).toBeNull()
    expect(findHandle).not.toHaveBeenCalled()
  })
})

describe('/resident/[username]/source "Start from this page"', () => {
  const ctx = () => ({ params: { username: 'pat' }, query: {}, req: { headers: {} } }) as any
  beforeEach(() => access.mockResolvedValue({ visible: true }))

  test('shows for a signed-in visitor on a shared HTML page', async () => {
    ;(getSessionUser as jest.Mock).mockResolvedValue(viewer)
    findHandle.mockResolvedValue(patHandle())
    const { props }: any = await sourceProps(ctx())
    expect(props.startHref).toBe('/resident/sam/template-editor?from=pat')
  })

  test('not for the owner, a signed-out visitor, or a standard-layout page', async () => {
    findHandle.mockResolvedValue(patHandle())
    ;(getSessionUser as jest.Mock).mockResolvedValue({ ...viewer, id: 'u_pat', primaryHandle: 'pat@local' })
    expect(((await sourceProps(ctx())) as any).props.startHref).toBeNull()

    ;(getSessionUser as jest.Mock).mockResolvedValue(null)
    expect(((await sourceProps(ctx())) as any).props.startHref).toBeNull()

    ;(getSessionUser as jest.Mock).mockResolvedValue(viewer)
    findHandle.mockResolvedValue(patHandle({ templateMode: 'enhanced' }))
    expect(((await sourceProps(ctx())) as any).props.startHref).toBeNull()
  })
})
