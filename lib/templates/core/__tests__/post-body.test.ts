/**
 * A post's body for an HTML page's <BlogPosts />. The editor's preview read
 * a `contentHtml` field the posts API never sends, so every post there said
 * "(No content)"; the preview and the profile page now share postBodyHtml.
 * (What else the preview showed differently: lib/domain/profile/__tests__/resident-data.test.ts)
 */
import { postBodyHtml, postFirstImage } from '../post-body';

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
