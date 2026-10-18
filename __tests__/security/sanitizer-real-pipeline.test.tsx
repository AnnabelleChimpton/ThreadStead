/**
 * Real-pipeline sanitizer tests.
 *
 * Nothing here is mocked: marked, DOMPurify, unified, rehype-parse and
 * rehype-sanitize are the production libraries (jest.config.js transforms
 * their ESM builds; jest.setup.js no longer stubs them). Each vector is run
 * through the real entry point and the OUTPUT is parsed back into a DOM and
 * checked for anything that could execute — not string-matched, so encoding
 * tricks can't slip past the assertion.
 *
 * The "regressions" block pins the stored-XSS bugs this suite found
 * (fixed in 2960427).
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, waitFor } from '@testing-library/react';
import { defaultSchema } from 'rehype-sanitize';
import { marked } from 'marked';
import { cleanHtml, cleanAndNormalizeHtml, markdownToSafeHtml } from '@/lib/utils/sanitization/html';
import { serializeJsonLd } from '@/lib/utils/sanitization/json-ld';
import { compileTemplate } from '@/lib/templates/compilation/template-parser';
import {
  HtmlWithEmojis,
  loadEmojiMap,
  processHtmlWithEmojis,
  renderCommentMarkup,
} from '@/lib/comment-markup';

// FeedPost pulls in auth, chat and icon modules that are irrelevant here.
jest.mock('@/hooks/useMe', () => ({ useMe: () => ({ me: null, isLoading: false }) }));
jest.mock('@/contexts/ChatContext', () => ({ useChat: () => ({}) }));
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
import FeedPost from '@/components/core/content/FeedPost';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DANGEROUS_TAGS = ['script', 'iframe', 'object', 'embed', 'style', 'svg', 'math', 'base', 'meta', 'link', 'frame', 'frameset'];
const URL_ATTRS = ['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'srcset', 'poster', 'background'];

/** A data: URI is only acceptable as a base64 raster/vector image source. */
function isDangerousUrl(attr: string, value: string, tag: string): boolean {
  const v = value.replace(/[\u0000- ]/g, '').toLowerCase();
  if (v.startsWith('javascript:') || v.startsWith('vbscript:')) return true;
  if (v.startsWith('data:')) {
    // <img src="data:image/..."> can't run script; anything else can.
    return !(tag === 'img' && attr === 'src' && v.startsWith('data:image/'));
  }
  return false;
}

/**
 * Every problem found in an HTML string, as readable strings. `allowStyle`
 * is for React-rendered output, where inline styles come from our own code.
 */
function findExecutable(html: string, { allowStyle = false } = {}): string[] {
  const host = document.createElement('div');
  host.innerHTML = html;
  const problems: string[] = [];
  for (const el of Array.from(host.querySelectorAll('*'))) {
    const tag = el.tagName.toLowerCase();
    if (DANGEROUS_TAGS.includes(tag)) problems.push(`<${tag}> element`);
    for (const { name, value } of Array.from(el.attributes)) {
      const attr = name.toLowerCase();
      if (attr.startsWith('on')) problems.push(`${tag}[${attr}]`);
      if (attr === 'style' && !allowStyle) problems.push(`${tag}[style]`);
      if (URL_ATTRS.includes(attr) && isDangerousUrl(attr, value, tag)) {
        problems.push(`${tag}[${attr}=${value}]`);
      }
    }
  }
  return problems;
}

function expectInert(html: string, options?: { allowStyle?: boolean }) {
  expect(findExecutable(html, options)).toEqual([]);
}

/** Classic and obfuscated vectors every HTML entry point must neutralize. */
const HTML_VECTORS: Array<[string, string]> = [
  ['script tag', '<script>alert(1)</script>'],
  ['script with src', '<script src="https://evil.test/x.js"></script>'],
  ['img onerror', '<img src=x onerror=alert(1)>'],
  ['img onerror, uppercase', '<IMG SRC=x ONERROR=alert(1)>'],
  ['body onload', '<body onload=alert(1)>'],
  ['input onfocus autofocus', '<input onfocus=alert(1) autofocus>'],
  ['input type=image onerror', '<input type="image" src="x" onerror="alert(1)">'],
  ['details ontoggle', '<details open ontoggle=alert(1)>'],
  ['javascript: href', '<a href="javascript:alert(1)">x</a>'],
  ['javascript: href, mixed case + spaces', '<a href="  JaVaScRiPt:alert(1)">x</a>'],
  ['javascript: href, tab entity', '<a href="jav&#x09;ascript:alert(1)">x</a>'],
  ['javascript: href, decimal entities', '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">x</a>'],
  ['javascript: img src', '<img src="javascript:alert(1)">'],
  ['vbscript: href', '<a href="vbscript:msgbox(1)">x</a>'],
  ['data:text/html href', '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">x</a>'],
  ['data:text/html img src', '<img src="data:text/html,<script>alert(1)</script>">'],
  ['data:image/svg+xml href', '<a href="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">x</a>'],
  ['iframe srcdoc', '<iframe srcdoc="<script>alert(1)</script>"></iframe>'],
  ['object data', '<object data="javascript:alert(1)"></object>'],
  ['embed src', '<embed src="javascript:alert(1)">'],
  ['svg onload', '<svg onload=alert(1)><circle r="1"/></svg>'],
  ['svg script', '<svg><script>alert(1)</script></svg>'],
  ['svg animate href', '<svg><a><animate attributeName="href" values="javascript:alert(1)"/><text y="20">x</text></a></svg>'],
  ['svg use xlink', '<svg><use xlink:href="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=#x"/></svg>'],
  ['math mXSS', '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>'],
  ['noscript mXSS', '<noscript><p title="</noscript><img src=x onerror=alert(1)>">'],
  ['style tag', '<style>body{background:url("javascript:alert(1)")}</style>'],
  ['style attribute', '<div style="background:url(javascript:alert(1))">x</div>'],
  ['style attribute overlay', '<div style="position:fixed;inset:0;z-index:9999">click me</div>'],
  ['form action', '<form action="javascript:alert(1)"><button>go</button></form>'],
  ['button formaction', '<button formaction="javascript:alert(1)">go</button>'],
  ['meta refresh', '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'],
  ['base href hijack', '<base href="https://evil.test/">'],
  ['link stylesheet', '<link rel="stylesheet" href="https://evil.test/x.css">'],
];

// ---------------------------------------------------------------------------
// Canary: are these really the production libraries?
// ---------------------------------------------------------------------------

describe('canary: real libraries are loaded, not stubs', () => {
  it('rehype-sanitize defaultSchema is the real GitHub schema', () => {
    // The old global stub had 6 tags. The real schema has dozens.
    expect(defaultSchema.tagNames!.length).toBeGreaterThan(40);
    expect(defaultSchema.tagNames).toEqual(expect.arrayContaining(['table', 'details', 'kbd']));
  });

  it('marked really parses markdown', () => {
    expect(marked.parse('# Hi', { async: false })).toContain('<h1');
  });

  it('the template parser really sanitizes (keeps plain HTML, drops script)', () => {
    const result = compileTemplate('<div><p>hello</p><script>alert(1)</script></div>');
    const json = JSON.stringify(result.ast);
    expect(json).toContain('"tagName":"p"');
    expect(json).not.toContain('"tagName":"script"');
  });
});

// ---------------------------------------------------------------------------
// cleanHtml — post bodyHtml, guestbook, profile HTML
// ---------------------------------------------------------------------------

describe('cleanHtml (DOMPurify, real)', () => {
  it.each(HTML_VECTORS)('neutralizes %s', (_name, input) => {
    expectInert(cleanHtml(input));
    expectInert(cleanAndNormalizeHtml(input));
  });

  it('keeps ordinary formatting, links and images', () => {
    const out = cleanHtml(
      '<p><strong>hi</strong> <a href="https://example.com">x</a> <img src="https://example.com/a.png" alt="a"></p>'
    );
    expect(out).toContain('<strong>hi</strong>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('src="https://example.com/a.png"');
  });

  it('keeps base64 raster data images but not other data: images', () => {
    expect(cleanHtml('<img src="data:image/png;base64,iVBORw0KGgo=">')).toContain('data:image/png;base64');
    // Not base64 → dropped by the data-URI hook.
    expect(cleanHtml('<img src="data:image/png,abc">')).not.toContain('data:');
  });

  it('adds noopener to external links', () => {
    const out = cleanAndNormalizeHtml('<a href="https://example.com">x</a>');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });
});

// ---------------------------------------------------------------------------
// markdownToSafeHtml — markdown posts, ring descriptions, announcements
// ---------------------------------------------------------------------------

describe('markdownToSafeHtml (marked + DOMPurify, real)', () => {
  it.each(HTML_VECTORS)('neutralizes raw HTML in markdown: %s', (_name, input) => {
    expectInert(markdownToSafeHtml(input));
  });

  it.each([
    ['javascript: link', '[x](javascript:alert(1))'],
    ['javascript: link in angle brackets', '[x](<javascript:alert(1)>)'],
    ['javascript: link, encoded colon', '[x](javascript&#58;alert(1))'],
    ['javascript: image', '![x](javascript:alert(1))'],
    ['data:text/html link', '[x](data:text/html;base64,PHNjcmlwdD4=)'],
    ['reference-style javascript: link', '[x][1]\n\n[1]: javascript:alert(1)'],
    ['autolink quote breakout', 'https://x.test/"onmouseover="alert(1)'],
    ['footnote id breakout', '[^a"><img src=x onerror=alert(1)>]\n\n[^a"><img src=x onerror=alert(1)>]: note'],
    ['footnote body', 'see[^1]\n\n[^1]: <img src=x onerror=alert(1)>'],
    ['task list html', '- [ ] <img src=x onerror=alert(1)>'],
    ['code fence is text', '```\n<script>alert(1)</script>\n```'],
  ])('neutralizes %s', (_name, md) => {
    expectInert(markdownToSafeHtml(md));
  });

  it('renders code fences as escaped text, not markup', () => {
    const out = markdownToSafeHtml('```\n<b>x</b>\n```');
    expect(out).toContain('&lt;b&gt;x&lt;/b&gt;');
  });

  it('still renders ordinary markdown', () => {
    const out = markdownToSafeHtml('# Title\n\n**bold** and [link](https://example.com)\n\n1. one\n2. two');
    expect(out).toContain('<h1');
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('<ol>');
  });
});

// ---------------------------------------------------------------------------
// Comment markup — comments, guestbook (React-rendered, no innerHTML)
// ---------------------------------------------------------------------------

describe('comment markup (renderCommentMarkup)', () => {
  it.each([
    ['raw script', '<script>alert(1)</script>'],
    ['raw img onerror', '<img src=x onerror=alert(1)>'],
    ['javascript: link', '[x](javascript:alert(1))'],
    ['javascript: link, case', '[x](JavaScript:alert(1))'],
    ['data:text/html link', '[x](data:text/html,<script>alert(1)</script>)'],
    ['javascript: image', '![x](javascript:alert(1))'],
    ['data:text/html image', '![x](data:text/html,<script>alert(1)</script>)'],
    ['quote breakout in link', '[x](https://a.test" onclick="alert(1))'],
    ['quoted line', '> <img src=x onerror=alert(1)>'],
    ['list item', '- <svg onload=alert(1)>'],
    ['code block', '```\n<script>alert(1)</script>\n```'],
  ])('neutralizes %s', (_name, text) => {
    expectInert(renderToStaticMarkup(<>{renderCommentMarkup(text)}</>), { allowStyle: true });
  });

  it('renders http(s) links as links', () => {
    const out = renderToStaticMarkup(<>{renderCommentMarkup('[site](https://example.com)')}</>);
    expect(out).toContain('href="https://example.com"');
  });

  it('allows a data:image src only as an <img>, where svg cannot script', () => {
    const out = renderToStaticMarkup(<>{renderCommentMarkup('![x](data:image/png;base64,iVBORw0KGgo=)')}</>);
    expect(out).toContain('<img');
    expectInert(out, { allowStyle: true });
  });
});

// ---------------------------------------------------------------------------
// Template parser — user profile templates (unified + rehype-sanitize, real)
// ---------------------------------------------------------------------------

type HastNode = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: HastNode[] };

function templateProblems(html: string): string[] {
  const { ast } = compileTemplate(html);
  const problems: string[] = [];
  const walk = (node: HastNode) => {
    const tag = (node.tagName || '').toLowerCase();
    if (node.type === 'element' && ['script', 'iframe', 'object', 'embed', 'base', 'meta', 'link'].includes(tag)) {
      problems.push(`<${tag}> element`);
    }
    for (const [key, value] of Object.entries(node.properties || {})) {
      const name = key.toLowerCase();
      if (name.startsWith('on')) problems.push(`${tag}[${name}]`);
      if (['href', 'src', 'xlinkhref', 'formaction', 'srcdoc'].includes(name)) {
        const v = String(value).replace(/[\u0000- ]/g, '').toLowerCase();
        if (v.startsWith('javascript:') || v.startsWith('vbscript:')) problems.push(`${tag}[${name}=${value}]`);
        if (name === 'href' && v.startsWith('data:')) problems.push(`${tag}[href=${value}]`);
      }
    }
    node.children?.forEach(walk);
  };
  if (ast) walk(ast as unknown as HastNode);
  return problems;
}

describe('template parser (compileTemplate)', () => {
  it.each(HTML_VECTORS.filter(([name]) => !name.startsWith('style') && name !== 'form action'))(
    'neutralizes %s',
    (_name, input) => {
      expect(templateProblems(`<div>${input}</div>`)).toEqual([]);
    }
  );

  it('reports stripped dangerous tags to the author', () => {
    const result = compileTemplate('<div><script>alert(1)</script><iframe src="https://e.test"></iframe></div>');
    const names = (result.strippedComponents || []).map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['script', 'iframe']));
  });

  it('prefixes ids so a template cannot clobber page globals', () => {
    const json = JSON.stringify(compileTemplate('<div id="__NEXT_DATA__">x</div>').ast);
    expect(json).not.toContain('"id":"__NEXT_DATA__"');
  });

  // Inline styles are allowed on purpose — profile templates are for
  // decorating your own page. Documented here so a change is deliberate.
  it('keeps inline styles (by design: profile customization)', () => {
    const json = JSON.stringify(compileTemplate('<div style="color:red">x</div>').ast);
    expect(json).toContain('color:red');
  });

  // Hardening gap: defaultSchema allows `action` on every tag and only
  // protocol-checks href/src/cite/longDesc, so a javascript: action survives
  // into the AST. Not exploitable today because React 19 replaces javascript:
  // URLs at render (asserted below); add `action` to schema.protocols to close.
  it('keeps form action in the AST, but React blocks javascript: at render', () => {
    const json = JSON.stringify(compileTemplate('<form action="javascript:alert(1)"><button>go</button></form>').ast);
    expect(json).toContain('javascript:alert(1)');
    const rendered = renderToStaticMarkup(<form action={'javascript:alert(1)'}><button>go</button></form>);
    expect(rendered).not.toContain('alert(1)');
  });
});

// ---------------------------------------------------------------------------
// JSON-LD escaping
// ---------------------------------------------------------------------------

describe('serializeJsonLd', () => {
  function scriptBodyBreaksOut(json: string): boolean {
    const doc = new DOMParser().parseFromString(
      `<script type="application/ld+json">${json}</script><p id="after">ok</p>`,
      'text/html'
    );
    return doc.querySelectorAll('script').length !== 1 || doc.querySelectorAll('img, svg').length > 0;
  }

  it.each([
    ['closing tag in a value', { name: '</script><img src=x onerror=alert(1)>' }],
    ['closing tag in a key', { '</script><img src=x onerror=alert(1)>': 1 }],
    ['closing tag deep in an array', { list: [{ a: ['ok', '</ScRiPt ><svg onload=alert(1)>'] }] }],
    ['comment opener', { name: '<!--<script>' }],
  ])('keeps %s inside the script element', (_name, data) => {
    const json = serializeJsonLd(data);
    expect(json).not.toMatch(/[<>]/);
    expect(scriptBodyBreaksOut(json)).toBe(false);
    expect(JSON.parse(json)).toEqual(data);
  });
});

// ---------------------------------------------------------------------------
// Regressions: stored XSS found by this suite on 2026-10-18, fixed in 2960427.
// The emoji pass itself is covered by emoji-html-xss.test.ts; these check
// the components that render stored posts.
// ---------------------------------------------------------------------------

describe('regressions: stored posts render inert', () => {
  const emojiFetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ emojis: [{ name: 'smile', imageUrl: 'https://emoji.test/smile.png' }] }),
  });

  beforeAll(async () => {
    (global as unknown as { fetch: unknown }).fetch = emojiFetch;
    await loadEmojiMap();
  });

  // processHtmlWithEmojis used to rewrite :name: inside attribute values, so
  // the injected `"` and `/>` turned attribute text into live markup.
  it('HtmlWithEmojis renders stored post HTML inert', async () => {
    const stored = cleanAndNormalizeHtml('<a title=":smile:<img src=x onerror=alert(1)>">t</a>');
    const { container } = render(<HtmlWithEmojis html={stored} />);
    await waitFor(() => expect(container.querySelector('a')).not.toBeNull());
    expectInert(container.innerHTML);
  });

  // create.ts / update.ts store bodyText raw; FeedPost used to turn it into
  // HTML with only a \n → <br> replace before dangerouslySetInnerHTML.
  it('FeedPost renders a plain-text post as text', async () => {
    const post = {
      id: 'p1', authorId: 'u1', authorUsername: 'a', authorDisplayName: 'A', authorAvatarUrl: null,
      title: 't', intent: null, createdAt: new Date().toISOString(), updatedAt: null,
      bodyHtml: null, bodyMarkdown: null, media: null, tags: [], commentCount: 0,
      bodyText: 'hello <img src=x onerror=alert(1)>',
    };
    const { container } = render(<FeedPost post={post} />);
    await waitFor(() => expect(container.querySelector('.thread-content')?.textContent).toContain('hello'));
    expectInert(container.querySelector('.thread-content')!.innerHTML);
  });

  it('emoji replacement still works in text', () => {
    expect(processHtmlWithEmojis('<p>hi :smile:</p>')).toContain('src="https://emoji.test/smile.png"');
  });
});
