/**
 * @jest-environment node
 *
 * Receiving webmentions: which requests are refused before we fetch
 * anything, what counts as the source really linking to the post, and that
 * a resident hears about each outside page once.
 */
import type { Fetcher } from '@/lib/indie-index/http'
import { checkMention, notifyMention, processMention, sourceLinksToPost, MAX_MENTIONS_PER_POST } from '../receive'
import { postIdOf } from '../urls'

const BASE = 'https://homepageagain.com'
const POST_URL = `${BASE}/resident/alice/post/p1`

type PostRow = {
  id: string
  title: string
  visibility: string
  authorId: string
  author: {
    primaryHandle: string | null
    moderationStatus: string
    suspendedUntil: Date | null
    deletesAt: Date | null
    profile: { visibility: string } | null
  }
}

function postRow(overrides: Partial<Omit<PostRow, 'author'>> & { author?: Partial<PostRow['author']> } = {}): PostRow {
  const { author, ...rest } = overrides
  return {
    id: 'p1',
    title: 'Moss terrarium',
    visibility: 'public',
    authorId: 'u_alice',
    ...rest,
    author: {
      primaryHandle: 'alice@homepageagain',
      moderationStatus: 'active',
      suspendedUntil: null,
      deletesAt: null,
      profile: { visibility: 'public' },
      ...author,
    },
  }
}

function fakeDb({ post = postRow() as PostRow | null, count = 0, existing = null as { id: string } | null } = {}) {
  const created: Array<Record<string, unknown>> = []
  const db = {
    post: { findUnique: jest.fn(async ({ where }: { where: { id: string } }) => (post && post.id === where.id ? post : null)) },
    notification: {
      count: jest.fn(async () => count),
      findFirst: jest.fn(async () => existing),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data)
        return data
      }),
    },
  }
  return { db: db as never, raw: db, created }
}

function pages(map: Record<string, { status?: number; body?: string; type?: string | null; url?: string }>): Fetcher {
  return async ({ url }) => {
    const page = map[url]
    if (!page) throw new Error(`unexpected fetch ${url}`)
    const headers = new Headers()
    if (page.type !== null) headers.set('content-type', page.type ?? 'text/html; charset=utf-8')
    return { status: page.status ?? 200, url: page.url ?? url, headers, body: page.body ?? '' }
  }
}

describe('postIdOf', () => {
  it('reads the post id from any spelling of a post URL here', () => {
    expect(postIdOf(POST_URL, BASE)).toBe('p1')
    expect(postIdOf('http://www.homepageagain.com/resident/old-name/post/p1/?comments=open#c', BASE)).toBe('p1')
  })

  it('is null for other pages and other sites', () => {
    expect(postIdOf(`${BASE}/resident/alice`, BASE)).toBeNull()
    expect(postIdOf(`${BASE}/resident/alice/post/p1/edit`, BASE)).toBeNull()
    expect(postIdOf('https://alice.homepageagain.com/resident/alice/post/p1', BASE)).toBeNull()
    expect(postIdOf('https://evil.example/resident/alice/post/p1', BASE)).toBeNull()
    expect(postIdOf('not a url', BASE)).toBeNull()
  })
})

describe('checkMention', () => {
  const check = (source: unknown, target: unknown, opts?: Parameters<typeof fakeDb>[0]) =>
    checkMention(fakeDb(opts).db, source, target, BASE)

  it('takes a link from an outside page to a public post', async () => {
    await expect(check('https://www.jane.example/notes/1', POST_URL)).resolves.toEqual({
      ok: true,
      source: 'https://www.jane.example/notes/1',
      sourceHost: 'jane.example',
      postId: 'p1',
    })
  })

  it('finds the post by id even when the username in the URL is old', async () => {
    await expect(check('https://jane.example/', `${BASE}/resident/old-name/post/p1`)).resolves.toMatchObject({ ok: true, postId: 'p1' })
  })

  it.each([
    ['missing source', undefined, POST_URL],
    ['a non-http source', 'javascript:alert(1)', POST_URL],
    ['the same URL twice', POST_URL, POST_URL],
    ['a source on this site', `${BASE}/resident/bob/post/p9`, POST_URL],
    ["a source on a resident's address", 'https://bob.homepageagain.com/', POST_URL],
    ['a source on brid.gy', 'https://brid.gy/comment/bluesky/did:plc:x/abc/def', POST_URL],
    ['brid.gy spelled with a trailing dot', 'https://brid.gy./comment/x', POST_URL],
    ['this site spelled with a trailing dot', 'https://homepageagain.com./resident/bob', POST_URL],
    ['a source on a brid.gy subdomain', 'https://fed.brid.gy/r/x', POST_URL],
    ['a target that is a profile', 'https://jane.example/', `${BASE}/resident/alice`],
    ['a target on another site', 'https://jane.example/', 'https://other.example/resident/alice/post/p1'],
  ])('refuses %s', async (_name, source, target) => {
    await expect(check(source, target)).resolves.toMatchObject({ ok: false })
  })

  it.each([
    ['a post that is not public', postRow({ visibility: 'friends' })],
    ['a post on a private profile', postRow({ author: { profile: { visibility: 'private' } } })],
    ['a post by a banned resident', postRow({ author: { moderationStatus: 'banned' } })],
    ['a post by a resident who is leaving', postRow({ author: { deletesAt: new Date() } })],
    ['a post that does not exist', null],
  ])('refuses %s', async (_name, post) => {
    await expect(check('https://jane.example/', POST_URL, { post })).resolves.toMatchObject({ ok: false })
  })

  it('treats one page sent with different #fragments as one source', async () => {
    await expect(check('https://jane.example/notes#1', POST_URL)).resolves.toMatchObject({ ok: true, source: 'https://jane.example/notes' })
  })

  it('refuses once the post has had its share', async () => {
    await expect(check('https://jane.example/', POST_URL, { count: MAX_MENTIONS_PER_POST })).resolves.toMatchObject({ ok: false })
  })
})

describe('sourceLinksToPost', () => {
  const SOURCE = 'https://jane.example/notes/1'
  const linksTo = (body: string, extra: { status?: number; type?: string | null; url?: string } = {}) =>
    sourceLinksToPost(pages({ [SOURCE]: { body, ...extra } }), SOURCE, 'p1', BASE)

  it('is true for an ordinary link to the post, in any spelling', async () => {
    await expect(linksTo(`<p>Look at <a href="${POST_URL}">this</a></p>`)).resolves.toBe(true)
    await expect(linksTo('<a href="http://www.homepageagain.com/resident/alice/post/p1?comments=open">x</a>')).resolves.toBe(true)
  })

  it('resolves relative links against where the page ended up', async () => {
    await expect(linksTo('<a href="../resident/alice/post/p1">x</a>', { url: `${BASE}/blog/` })).resolves.toBe(true)
  })

  it('counts a reply as a mention', async () => {
    await expect(linksTo(`<a class="u-in-reply-to" href="${POST_URL}">re</a>`)).resolves.toBe(true)
  })

  it('is false for likes, reposts and bookmarks', async () => {
    for (const kind of ['u-like-of', 'u-repost-of', 'u-bookmark-of']) {
      await expect(linksTo(`<a class="${kind} h-cite" href="${POST_URL}">liked</a>`)).resolves.toBe(false)
    }
  })

  it('is false when the page has no link to the post', async () => {
    await expect(linksTo(`<p>${POST_URL} written out, not linked</p>`)).resolves.toBe(false)
    await expect(linksTo(`<!-- <a href="${POST_URL}">hidden</a> -->`)).resolves.toBe(false)
    await expect(linksTo(`<a href="${BASE}/resident/alice/post/p2">another post</a>`)).resolves.toBe(false)
  })

  it('is false for pages that are gone or not HTML', async () => {
    await expect(linksTo(`<a href="${POST_URL}">x</a>`, { status: 410 })).resolves.toBe(false)
    await expect(linksTo(`<a href="${POST_URL}">x</a>`, { type: 'application/json' })).resolves.toBe(false)
  })

  it('is false when the fetch fails', async () => {
    const failing: Fetcher = async () => {
      throw new Error('blocked: private address')
    }
    await expect(sourceLinksToPost(failing, SOURCE, 'p1', BASE)).resolves.toBe(false)
  })
})

describe('notifyMention and processMention', () => {
  const post = { id: 'p1', title: 'Moss terrarium', authorId: 'u_alice', authorHandle: 'alice@homepageagain' }
  const mention = { source: 'https://jane.example/notes/1', sourceHost: 'jane.example' }

  it('tells the author, as the actor themself', async () => {
    const { db, created } = fakeDb()
    await expect(notifyMention(db, post, mention)).resolves.toBe(true)
    expect(created).toEqual([
      {
        recipientId: 'u_alice',
        actorId: 'u_alice',
        type: 'webmention',
        data: { postId: 'p1', postTitle: 'Moss terrarium', postAuthorHandle: 'alice@homepageagain', sourceUrl: mention.source, sourceHost: 'jane.example' },
      },
    ])
  })

  it('tells them once per page, however often it is sent', async () => {
    const { db, created } = fakeDb({ existing: { id: 'n1' } })
    await expect(notifyMention(db, post, mention)).resolves.toBe(false)
    expect(created).toEqual([])
  })

  it('checks the cap again, since several can pass the endpoint while waiting in line', async () => {
    const { db, created } = fakeDb({ count: MAX_MENTIONS_PER_POST })
    await expect(notifyMention(db, post, mention)).resolves.toBe(false)
    expect(created).toEqual([])
  })

  it('notifies only after the page is fetched and links to the post', async () => {
    const yes = fakeDb()
    const linked = pages({ [mention.source]: { body: `<a href="${POST_URL}">x</a>` } })
    await expect(processMention(yes.db, linked, { postId: 'p1', ...mention }, BASE)).resolves.toBe(true)
    expect(yes.created).toHaveLength(1)

    const no = fakeDb()
    const unlinked = pages({ [mention.source]: { body: '<p>nothing here</p>' } })
    await expect(processMention(no.db, unlinked, { postId: 'p1', ...mention }, BASE)).resolves.toBe(false)
    expect(no.created).toEqual([])
  })

  it('checks the post again after fetching (it may have gone private meanwhile)', async () => {
    const { db, created } = fakeDb({ post: postRow({ visibility: 'private' }) })
    const linked = pages({ [mention.source]: { body: `<a href="${POST_URL}">x</a>` } })
    await expect(processMention(db, linked, { postId: 'p1', ...mention }, BASE)).resolves.toBe(false)
    expect(created).toEqual([])
  })
})
