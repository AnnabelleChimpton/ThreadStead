/**
 * Many pictures (PLAN-NEXT step 9):
 *  - several uploaded at once each take the place of the page's pictures
 *    with their file name, in the HTML and the CSS;
 *  - a page whose pictures still load from the resident's own site offers
 *    to copy them here, and the copies' addresses go in the code.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EnhancedTemplateEditor from '../EnhancedTemplateEditor';
import { ToastProvider } from '@/contexts/ToastContext';

jest.mock('next/dynamic', () => () => {
  const FakeDynamic = (props: any) =>
    typeof props.onChange === 'function' ? (
      <textarea
        aria-label={props.placeholder?.startsWith('Write your page') ? 'template-code' : 'css-code'}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    ) : null;
  return FakeDynamic;
});
const mockCsrfFetch = jest.fn();
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args) }));
jest.mock('@/lib/api/client/capability', () => ({
  ...jest.requireActual('@/lib/api/client/capability'),
  requestCapability: jest.fn(async () => 'cap'),
}));

const user = { id: 'pictures-user', primaryHandle: 'pat@local', handles: [], profile: {} };
const ORIGIN = window.location.origin;

beforeEach(() => {
  mockCsrfFetch.mockReset();
  global.fetch = jest.fn(async (url: any) => {
    const u = String(url);
    if (u.includes('/api/sites/import')) return { ok: true, status: 200, json: async () => ({ sites: [{ id: 's1', address: 'pat.neocities.org', ref: 'pat.neocities.org' }] }) } as any;
    if (u.includes('/api/photos/')) return { ok: true, status: 200, json: async () => ({ media: [], pagination: { hasNextPage: false } }) } as any;
    return { ok: true, status: 200, json: async () => ({}) } as any;
  }) as any;
});

function renderEditor(template: string, css: string) {
  render(
    <ToastProvider>
      <EnhancedTemplateEditor user={user} initialTemplate={template} initialCSS={css} initialTemplateMode="advanced" initialEditorMode="template" onSave={jest.fn()} />
    </ToastProvider>
  );
}

const code = (label: string) => screen.getByLabelText(label) as HTMLTextAreaElement;

it('several uploads each take the place of the pictures with their name', async () => {
  renderEditor('<img src="cat.gif" alt="Cat">\n<img src="images/SKY.png" alt="">\n<img src="https://other.example/cat.gif" alt="">', 'body { background: url(tile.png); }');
  let n = 0;
  mockCsrfFetch.mockImplementation(async (url: string) => {
    if (url !== '/api/media/upload') return { ok: true, status: 200, json: async () => ({}) };
    n += 1;
    return { ok: true, status: 200, json: async () => ({ media: { id: `m${n}`, thumbnailUrl: `/local/${n}_t.gif`, fullUrl: `/local/${n}.gif`, createdAt: '2026-10-25T12:00:00.000Z' } }) };
  });
  fireEvent.click(screen.getByRole('button', { name: 'Insert image' }));
  await screen.findByText('No images yet');
  const files = ['cat.gif', 'sky.png', 'tile.png', 'extra.gif'].map((name) => new File(['GIF89a'], name, { type: name.endsWith('png') ? 'image/png' : 'image/gif' }));
  fireEvent.change(screen.getByLabelText('Pictures to upload'), { target: { files } });

  await waitFor(() => expect(code('template-code').value).toBe(
    `<img src="${ORIGIN}/local/1.gif" alt="Cat">\n<img src="${ORIGIN}/local/2.gif" alt="">\n<img src="https://other.example/cat.gif" alt="">`
  ));
  fireEvent.click(screen.getByRole('tab', { name: 'CSS' }));
  expect(code('css-code').value).toBe(`body { background: url(${ORIGIN}/local/3.gif); }`);
  expect(screen.getByText('Uploaded 4 and put 3 in your page by name. 1 more is waiting in Insert image.')).toBeInTheDocument();
});

it('offers to copy the pictures still on your own site, and uses the copies', async () => {
  renderEditor('<img src="https://pat.neocities.org/cat.gif" alt="">\n<img src="https://other.example/dog.gif" alt="">', '.a { background: url(https://pat.neocities.org/tile.png); }');
  expect(await screen.findByText('2 pictures on this page still load from your site. Copy them here and they stay if the site goes away.')).toBeInTheDocument();
  mockCsrfFetch.mockImplementation(async (url: string, init: any) => {
    expect(url).toBe('/api/media/copy-pictures');
    expect(JSON.parse(init.body)).toEqual({ urls: ['https://pat.neocities.org/cat.gif', 'https://pat.neocities.org/tile.png'], cap: 'cap' });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        copied: { 'https://pat.neocities.org/cat.gif': '/local/cat.gif' },
        left: [{ url: 'https://pat.neocities.org/tile.png', reason: 'Your site answered 404.' }],
        full: false,
      }),
    };
  });
  fireEvent.click(screen.getByRole('button', { name: 'Copy them here' }));
  await waitFor(() => expect(code('template-code').value).toBe(`<img src="${ORIGIN}/local/cat.gif" alt="">\n<img src="https://other.example/dog.gif" alt="">`));
  expect(screen.getByText('Copied 1 picture here. Your page uses it from here once you save. 1 stayed where it was: Your site answered 404.')).toBeInTheDocument();
  // The one left behind is still offered
  expect(await screen.findByText('A picture on this page still loads from your site. Copy it here and it stays if the site goes away.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Leave it there' }));
  expect(screen.queryByText(/still loads? from your site/)).toBeNull();
});

it('says nothing when no picture is on your own site', async () => {
  renderEditor('<img src="https://other.example/dog.gif" alt="">', '');
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/sites/import', expect.anything()));
  expect(screen.queryByText(/from your site/)).toBeNull();
});
