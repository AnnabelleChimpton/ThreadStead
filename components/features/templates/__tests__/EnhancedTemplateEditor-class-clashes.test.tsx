/**
 * Class names the site styles too, as the preview reports them: listed
 * under the code on their line. Only the editor's own preview is heard.
 */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import EnhancedTemplateEditor from '../EnhancedTemplateEditor';
import { ToastProvider } from '@/contexts/ToastContext';

jest.mock('next/dynamic', () => () => {
  const FakeDynamic = (props: any) =>
    typeof props.onChange === 'function' ? (
      <textarea aria-label={props.placeholder?.startsWith('Write your page') ? 'template-code' : 'css-code'} value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    ) : null;
  return FakeDynamic;
});

const user = { id: 'clash-user', primaryHandle: 'pat@local', handles: [], profile: {} };

beforeEach(() => {
  global.fetch = jest.fn(async (url: any) =>
    String(url).includes('/api/templates/compile')
      ? ({ ok: true, status: 200, json: async () => ({ success: true, artifact: { v: 1, tree: [], islands: [] }, warnings: [], strippedComponents: [] }) } as any)
      : ({ ok: true, status: 200, json: async () => ({}) } as any)
  ) as any;
});

function report(source: Window | null, classes: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'PAGE_CLASS_CLASHES', classes }, origin: window.location.origin, source }));
  });
}

it('lists what the preview found on its line, and ignores anyone else', async () => {
  render(
    <ToastProvider>
      <EnhancedTemplateEditor user={user} initialTemplate={'<main>\n<div class="container">hi</div>\n</main>'} initialTemplateMode="advanced" initialEditorMode="template" onSave={jest.fn()} />
    </ToastProvider>
  );
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/templates/compile', expect.anything()));
  const frame = await waitFor(() => {
    const f = document.querySelector('iframe[title="Live preview of your page"]') as HTMLIFrameElement | null;
    if (!f?.contentWindow) throw new Error('no preview');
    return f;
  });

  const stranger = document.createElement('iframe');
  document.body.appendChild(stranger);
  report(stranger.contentWindow, ['container']);
  expect(screen.queryByText(/The class "container"/)).toBeNull();

  report(frame.contentWindow, ['container']);
  expect(await screen.findByText(`The class "container" gets the site's styles as well as yours, because the site uses that name too. Another name keeps it yours.`)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Line 2' })).toBeInTheDocument();

  report(frame.contentWindow, []);
  await waitFor(() => expect(screen.queryByText(/The class "container"/)).toBeNull());
});
