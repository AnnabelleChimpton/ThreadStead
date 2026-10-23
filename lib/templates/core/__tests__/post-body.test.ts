/**
 * A post's body for an HTML page's <BlogPosts />. The editor's preview read
 * a `contentHtml` field the posts API never sends, so every post there said
 * "(No content)"; the preview and the profile page now share postBodyHtml.
 * The preview also said "No Photo" and showed a broken house badge where the
 * page shows the default avatar and no badge.
 */
import { postBodyHtml, postFirstImage } from '../post-body';
import { fetchResidentData } from '../template-data';

describe('postBodyHtml', () => {
  it('renders markdown', () => {
    expect(postBodyHtml({ bodyMarkdown: 'Moved the **garden beds**.' })).toContain('<strong>garden beds</strong>');
  });

  it('cleans HTML', () => {
    const html = postBodyHtml({ bodyHtml: '<p>Hi<script>alert(1)</script></p>' });
    expect(html).toContain('<p>Hi');
    expect(html).not.toContain('<script');
  });

  it('escapes plain text and keeps its line breaks', () => {
    expect(postBodyHtml({ bodyText: 'a <b>\nb' })).toBe('<p>a &lt;b&gt;<br/>b</p>');
  });

  it('says so when there is nothing', () => {
    expect(postBodyHtml({ bodyText: '  ' })).toContain('(Nothing to preview)');
  });
});

describe('postFirstImage (a post\'s link preview)', () => {
  it('finds the first picture in markdown', () => {
    expect(postFirstImage({ bodyMarkdown: 'Hi\n\n![beds](https://cdn.example/a.jpg)\n![b](https://cdn.example/b.jpg)' }))
      .toBe('https://cdn.example/a.jpg');
  });

  it('finds it in HTML, unescaped', () => {
    expect(postFirstImage({ bodyHtml: '<p><img src="/uploads/a.png?w=1&amp;h=2"></p>' })).toBe('/uploads/a.png?w=1&h=2');
  });

  it('has none for text, data: URLs or protocol-relative ones', () => {
    expect(postFirstImage({ bodyText: 'just words' })).toBeUndefined();
    expect(postFirstImage({ bodyHtml: '<img src="data:image/png;base64,AAAA">' })).toBeUndefined();
    expect(postFirstImage({ bodyHtml: '<img src="//elsewhere.example/a.png">' })).toBeUndefined();
  });
});

describe('fetchResidentData (the editor preview)', () => {
  afterEach(() => jest.restoreAllMocks());

  const serve = (replies: Record<string, unknown>) => {
    global.fetch = jest.fn(async (url: RequestInfo | URL) => ({
      ok: true,
      status: 200,
      json: async () => replies[String(url)],
    })) as unknown as typeof fetch;
  };
  const owner = (extra: Record<string, unknown> = {}) => ({
    '/api/profile/robin': { userId: 'u1', username: 'robin', profile: { displayName: 'Robin' }, ...extra },
    '/api/posts/robin': { posts: [] },
    '/api/guestbook/robin': { entries: [] },
    '/api/auth/me': { loggedIn: false },
  });

  it('shows the default avatar when there is no photo, like the page', async () => {
    serve(owner());
    expect((await fetchResidentData('robin'))?.owner.avatarUrl).toBe('/assets/default-avatar.gif');
  });

  it('leaves the house out when there is no home, so the badge does not 404', async () => {
    serve(owner({ hasPixelHome: false }));
    expect((await fetchResidentData('robin'))?.pixelHome).toBeNull();
  });

  it('lets the badge load when there is a home', async () => {
    serve(owner({ hasPixelHome: true }));
    const data = await fetchResidentData('robin');
    expect(data).not.toHaveProperty('pixelHome');
  });

  it("gives each post its body from the posts API's own fields", async () => {
    const replies: Record<string, unknown> = {
      '/api/profile/robin': { userId: 'u1', username: 'robin', profile: { displayName: 'Robin' } },
      '/api/posts/robin': {
        posts: [
          { id: 'p1', bodyMarkdown: 'Moved the **garden beds**.', createdAt: '2026-10-20T00:00:00.000Z' },
          { id: 'p2', bodyHtml: '<p>A new gif</p>', createdAt: '2026-10-19T00:00:00.000Z' },
        ],
      },
      '/api/guestbook/robin': { entries: [] },
      '/api/auth/me': { loggedIn: false },
    };
    global.fetch = jest.fn(async (url: RequestInfo | URL) => ({
      ok: true,
      status: 200,
      json: async () => replies[String(url)],
    })) as unknown as typeof fetch;

    const data = await fetchResidentData('robin');
    expect(data?.posts.map((p) => p.bodyHtml)).toEqual([
      expect.stringContaining('<strong>garden beds</strong>'),
      expect.stringContaining('A new gif'),
    ]);
  });
});
