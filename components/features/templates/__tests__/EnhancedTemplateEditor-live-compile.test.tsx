/**
 * The live preview compiles soon after you stop typing (PREVIEW_DELAY_MS),
 * never more often than the compile route allows (PREVIEW_GAP_MS), and a
 * newer edit drops the older request: an older answer arriving late used to
 * put a stale page back in the preview.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

interface Compile {
  template: string;
  at: number;
  signal: AbortSignal;
  answer: () => void;
}

/** Compile requests wait until answered, and reject when aborted, as fetch does */
function installFetch(compiles: Compile[]) {
  global.fetch = jest.fn((url: any, init?: any) => {
    if (!String(url).includes('/api/templates/compile')) return Promise.resolve({ ok: true, status: 200, json: async () => ({}) } as any);
    const template = JSON.parse(init.body).template;
    return new Promise((resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      compiles.push({
        template,
        at: Date.now(),
        signal: init.signal,
        answer: () => resolve({ ok: true, status: 200, json: async () => ({ success: true, artifact: { v: 1, tree: [], islands: [], compiledFrom: template } }) } as any),
      });
    });
  }) as any;
}

const user = { id: 'test-user-123', primaryHandle: 'testuser@local', handles: [], profile: {} };

test('a newer edit drops the older request, and requests keep to the rate limit', async () => {
  const compiles: Compile[] = [];
  installFetch(compiles);
  render(
    <ToastProvider>
      <EnhancedTemplateEditor user={user} initialTemplate="<p>one</p>" initialTemplateMode="advanced" initialEditorMode="template" onSave={jest.fn()} />
    </ToastProvider>
  );
  await waitFor(() => expect(compiles).toHaveLength(1));
  await act(async () => compiles[0].answer());

  const code = screen.getByLabelText('template-code');
  fireEvent.change(code, { target: { value: '<p>two</p>' } });
  await waitFor(() => expect(compiles).toHaveLength(2));
  // Typing again while "two" is still compiling
  fireEvent.change(code, { target: { value: '<p>three</p>' } });
  expect(compiles[1].signal.aborted).toBe(true);
  await waitFor(() => expect(compiles).toHaveLength(3));
  expect(compiles[2].template).toBe('<p>three</p>');
  expect(compiles[2].at - compiles[1].at).toBeGreaterThanOrEqual(490);
  await act(async () => compiles[2].answer());

  // The pop-out preview gets the page the newest edit compiled to
  const popup = document.body.appendChild(document.createElement('iframe')).contentWindow!;
  const posted = jest.spyOn(popup, 'postMessage').mockImplementation(() => {});
  jest.spyOn(window, 'open').mockReturnValue(popup);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /pop out/i })));
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'PREVIEW_READY' }, origin: window.location.origin, source: popup }));
  });
  await waitFor(() => expect(posted).toHaveBeenCalledWith(expect.objectContaining({ type: 'PREVIEW_DATA' }), expect.anything()));
  const data = posted.mock.calls.map(([message]) => message as any).filter((m) => m.type === 'PREVIEW_DATA').pop();
  expect(data.payload.page.compiledFrom).toBe('<p>three</p>');
});
