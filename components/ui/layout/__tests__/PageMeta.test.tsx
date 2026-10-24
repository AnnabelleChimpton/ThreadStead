/**
 * A page's link-preview tags. Unkeyed tags were sent next to _app's defaults
 * instead of replacing them, so some apps showed two cards or two images;
 * and a square avatar went out as a large card, stretched into a banner.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PageMeta from '../PageMeta';
import { SITE_TITLE } from '@/lib/config/site/constants';

jest.mock('next/head', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('@/lib/config/site-url', () => ({ getSiteBaseUrl: () => 'https://example.com' }));

type Props = React.ComponentProps<typeof PageMeta>;
const tags = (props: Props) => {
  const children = (PageMeta(props) as React.ReactElement<{ children: React.ReactNode[] }>).props.children;
  return children.flat().filter(React.isValidElement);
};
const html = (props: Props) => renderToStaticMarkup(<PageMeta {...props} />);
const card = (props: Props) => html(props).match(/name="twitter:card" content="([^"]+)"/)?.[1];

it('keys every tag, so a page replaces the site defaults rather than adding to them', () => {
  const all = tags({ title: 'Knits', description: 'Yarn', path: '/tr/knits', image: { url: '/a.png', width: 1200, height: 630 }, noIndex: true });
  expect(all.length).toBeGreaterThan(10);
  for (const tag of all) expect(tag.key).toBeTruthy();
});

it('makes every URL absolute', () => {
  const out = html({ title: 'Knits', path: '/tr/knits', image: { url: '/api/share/ring/knits.png' } });
  expect(out).toContain('property="og:image" content="https://example.com/api/share/ring/knits.png"');
  expect(out).toContain('property="og:url" content="https://example.com/tr/knits"');
  expect(out).toContain('rel="canonical" href="https://example.com/tr/knits"');
});

it('gives a wide image the large card, and anything else the small one', () => {
  expect(card({ title: 'Home', image: { url: '/house.png', width: 1200, height: 630 } })).toBe('summary_large_image');
  expect(card({ title: 'Robin', image: { url: '/avatar.png' } })).toBe('summary');
  expect(card({ title: 'Robin', image: { url: '/avatar.png', width: 400, height: 400 } })).toBe('summary');
  // No image of its own: _app's default card and image stand
  expect(card({ title: 'Help' })).toBeUndefined();
});

it('names the site once in the tab, and puts a page\'s own title first', () => {
  expect(html({ title: 'Help' })).toContain(`<title>Help | ${SITE_TITLE}</title>`);
  expect(html({ title: SITE_TITLE })).toContain(`<title>${SITE_TITLE}</title>`);
  // never the whole tab: the person and the site stay named
  expect(html({ title: 'Robin (@robin)', tabTitle: 'my corner' })).toContain(`<title>my corner · Robin (@robin) | ${SITE_TITLE}</title>`);
});

it('keeps the description to one short line', () => {
  const out = html({ title: 'Post', description: `Line one\n\nline two ${'x'.repeat(300)}` });
  const description = out.match(/name="description" content="([^"]+)"/)?.[1] ?? '';
  expect(description.startsWith('Line one line two')).toBe(true);
  expect(description.length).toBe(200);
  expect(description.endsWith('…')).toBe(true);
});
