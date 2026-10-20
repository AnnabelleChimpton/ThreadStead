/**
 * A post's body for an HTML page's <BlogPosts />. The editor's preview read
 * a `contentHtml` field the posts API never sends, so every post there said
 * "(No content)"; the preview and the profile page now share postBodyHtml.
 */
import { postBodyHtml } from '../post-body';
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

describe('fetchResidentData (the editor preview)', () => {
  afterEach(() => jest.restoreAllMocks());

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
