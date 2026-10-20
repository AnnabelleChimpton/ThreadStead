/**
 * Settings > Your page with your own HTML page: its theme options
 * (`<meta name="color:Accent" content="…">`) show as pickers, only then,
 * preview live, and save by rewriting the source through the HTML editor's
 * save route. Undo saves the old source back.
 */
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const showSuccess = jest.fn();
const showError = jest.fn();
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showSuccess, showError }),
}));
jest.mock('@/contexts/ConfirmContext', () => ({ useConfirm: () => jest.fn(async () => true) }));
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn() }));
// PixelIcon's runtime SVG import doesn't resolve under Jest
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
jest.mock('@/components/features/profile/WidgetSlotPicker', () => ({ __esModule: true, default: () => null }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import YourPage from '../YourPage';

const SOURCE = `<meta name="color:Accent" content="#c96633">
<meta name="font:Headings" content="'Iowan Old Style', Georgia, serif">
<div class="page"><h1>Hi</h1></div>`;

function mockServer({ templateMode, template }: { templateMode: string; template: string | null }) {
  global.fetch = jest.fn(async (url: string) => {
    if (url === '/api/profile/pat') {
      return { ok: true, status: 200, json: async () => ({ profile: { templateMode, customCSS: '', hiddenTabs: [] } }) };
    }
    if (url === '/api/profile/pat/template') {
      return { ok: true, status: 200, json: async () => ({ template }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  jest.clearAllMocks();
  (csrfFetch as jest.Mock).mockImplementation(async () => ({ ok: true, json: async () => ({ success: true }) }));
});

test('an HTML page with options gets a picker for each one', async () => {
  mockServer({ templateMode: 'advanced', template: SOURCE });
  render(<YourPage username="pat" />);

  const accent = await screen.findByLabelText(/^Accent/);
  expect(accent).toHaveAttribute('type', 'color');
  expect(accent).toHaveValue('#c96633');
  const headings = screen.getByLabelText(/^Headings/) as HTMLSelectElement;
  expect(headings.value).toBe("'Iowan Old Style', Georgia, serif");
  expect(screen.getByRole('option', { name: "Your page's font (Iowan Old Style)" })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Fraunces' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  expect(screen.queryByText('Add colour and font settings')).not.toBeInTheDocument();
});

test('an HTML page without options gets no pickers, just the way to add some', async () => {
  mockServer({ templateMode: 'advanced', template: '<div><h1>Hi</h1></div>' });
  render(<YourPage username="pat" />);

  expect(await screen.findByText('Add colour and font settings')).toHaveAttribute('href', '/build/what-works-here#theme-options');
  expect(screen.queryByRole('heading', { name: 'Colours and fonts' })).not.toBeInTheDocument();
});

test('the standard layout never shows a page source’s options', async () => {
  mockServer({ templateMode: 'enhanced', template: SOURCE });
  render(<YourPage username="pat" />);

  await screen.findByRole('heading', { name: 'Theme' });
  expect(screen.queryByLabelText(/^Headings/)).not.toBeInTheDocument();
  expect(screen.queryByText('Add colour and font settings')).not.toBeInTheDocument();
  expect((global.fetch as jest.Mock).mock.calls.map(([url]) => url)).not.toContain('/api/profile/pat/template');
});

test('changes preview first, save rewrites only that value, undo puts the old source back', async () => {
  mockServer({ templateMode: 'advanced', template: SOURCE });
  // jsdom never loads the preview frame's page: give it an empty one
  const previewDoc = document.implementation.createHTMLDocument('');
  jest.spyOn(HTMLIFrameElement.prototype, 'contentDocument', 'get').mockReturnValue(previewDoc);
  render(<YourPage username="pat" />);

  const accent = await screen.findByLabelText(/^Accent/);
  fireEvent.change(accent, { target: { value: '#00ff00' } });
  fireEvent.change(screen.getByLabelText(/^Headings/), { target: { value: "'Fraunces', Georgia, serif" } });

  // The preview gets the new values as the live page would write them
  const style = previewDoc.getElementById('your-page-preview-options')!;
  expect(style.textContent).toContain('--color-accent: #00ff00;');
  expect(style.textContent).toContain("--font-headings: 'Fraunces', Georgia, serif;");
  expect(style.textContent).toContain('@font-face');

  const saved = SOURCE.replace('#c96633', '#00ff00').replace("'Iowan Old Style', Georgia, serif", "'Fraunces', Georgia, serif");
  // What the server has after the save
  mockServer({ templateMode: 'advanced', template: saved });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  });

  const posts = (csrfFetch as jest.Mock).mock.calls.filter(([url]) => url === '/api/profile/pat/template');
  expect(posts).toHaveLength(1);
  expect(posts[0][1].method).toBe('POST');
  expect(JSON.parse(posts[0][1].body)).toEqual({ template: saved });
  expect(showSuccess).toHaveBeenCalledWith('Saved.');

  // Undo saves the source from before
  mockServer({ templateMode: 'advanced', template: SOURCE });
  await act(async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Undo' }));
  });
  const all = (csrfFetch as jest.Mock).mock.calls.filter(([url]) => url === '/api/profile/pat/template');
  expect(JSON.parse(all[1][1].body)).toEqual({ template: SOURCE });
  await waitFor(() => expect(showSuccess).toHaveBeenCalledWith('Put back.'));
  expect(await screen.findByLabelText(/^Accent/)).toHaveValue('#c96633');
  jest.restoreAllMocks();
});

test('a failed save says so and keeps the change', async () => {
  mockServer({ templateMode: 'advanced', template: SOURCE });
  (csrfFetch as jest.Mock).mockImplementation(async () => ({ ok: false, json: async () => ({ error: 'Too many saves. Wait a minute.' }) }));
  render(<YourPage username="pat" />);

  fireEvent.change(await screen.findByLabelText(/^Accent/), { target: { value: '#123456' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  });
  expect(showError).toHaveBeenCalledWith('Too many saves. Wait a minute.');
  expect(screen.getByLabelText(/^Accent/)).toHaveValue('#123456');
  expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument();
});
