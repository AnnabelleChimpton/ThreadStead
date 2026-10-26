/**
 * Words on the preview, the editor's side: the live compile asks for
 * positions, words sent by its own preview go into the code, a refused or
 * outdated edit says so, and Alt-click goes to the HTML tab.
 */
import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import EnhancedTemplateEditor from '../EnhancedTemplateEditor';
import { ToastProvider } from '@/contexts/ToastContext';

jest.mock('next/dynamic', () => () => {
  const FakeDynamic = (props: any) =>
    typeof props.onChange === 'function' ? (
      <textarea aria-label={props.placeholder?.startsWith('Write your page') ? 'template-code' : 'css-code'} value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    ) : null;
  return FakeDynamic;
});

const user = { id: 'words-user', primaryHandle: 'pat@local', handles: [], profile: {} };
const SOURCE = '<h1>Tom &amp; Jerry</h1>\n<p>Hello</p>';

beforeEach(() => {
  global.fetch = jest.fn(async (url: any) =>
    String(url).includes('/api/templates/compile')
      ? ({ ok: true, status: 200, json: async () => ({ success: true, artifact: { v: 1, tree: [], islands: [] }, warnings: [], strippedComponents: [] }) } as any)
      : ({ ok: true, status: 200, json: async () => ({}) } as any)
  ) as any;
});

async function setup() {
  render(
    <ToastProvider>
      <EnhancedTemplateEditor user={user} initialTemplate={SOURCE} initialTemplateMode="advanced" initialEditorMode="template" onSave={jest.fn()} />
    </ToastProvider>
  );
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/templates/compile', expect.anything()));
  const compile = (global.fetch as jest.Mock).mock.calls.find(([u]) => u === '/api/templates/compile');
  expect(JSON.parse(compile[1].body)).toEqual({ template: SOURCE, positions: true });
  // The compile's answer has landed (the preview's ranges are in SOURCE)
  await act(async () => {});
  const frame = document.querySelector('iframe[title="Live preview of your page"]') as HTMLIFrameElement;
  const send = (data: unknown, source: Window | null = frame.contentWindow) =>
    act(() => { window.dispatchEvent(new MessageEvent('message', { data, origin: window.location.origin, source })); });
  return { send, frame };
}

const code = () => screen.getByLabelText('template-code') as HTMLTextAreaElement;

it('words from its own preview go into the code; anyone else is ignored', async () => {
  const { send } = await setup();
  const stranger = document.createElement('iframe');
  document.body.appendChild(stranger);
  send({ type: 'WORDS_EDIT', changes: [{ range: [4, 19], before: 'Tom & Jerry', after: 'Tom & Jerry & co' }] }, stranger.contentWindow);
  expect(code().value).toBe(SOURCE);

  send({ type: 'WORDS_EDIT', changes: [
    { range: [4, 19], before: 'Tom & Jerry', after: 'Tom & Jerry & co' },
    { range: [28, 33], before: 'Hello', after: 'Hello <there>' },
  ] });
  expect(code().value).toBe('<h1>Tom &amp; Jerry &amp; co</h1>\n<p>Hello &lt;there&gt;</p>');
});

it('an edit the code no longer matches writes nothing, says so, and asks the preview to redraw', async () => {
  const { send, frame } = await setup();
  const posted = jest.spyOn(frame.contentWindow!, 'postMessage');
  send({ type: 'WORDS_EDIT', changes: [{ range: [28, 33], before: 'Goodbye', after: 'x' }] });
  expect(code().value).toBe(SOURCE);
  expect(screen.getByText(/doesn't read the way the code has it/)).toBeInTheDocument();
  expect(posted).toHaveBeenCalledWith({ type: 'WORDS_RESET' }, window.location.origin);
});

it('a refused edit is explained; Alt-click goes to the HTML tab', async () => {
  const { send } = await setup();
  send({ type: 'WORDS_REFUSED' });
  expect(screen.getByText(/Words only on the preview: that took out or added a tag/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'CSS' }));
  send({ type: 'GO_TO_SOURCE', at: 25 });
  await waitFor(() => expect(screen.getByRole('tab', { name: 'HTML' })).toHaveAttribute('aria-selected', 'true'));
});

it('the Words toggle sits on the preview', async () => {
  const { send } = await setup();
  send({ type: 'PREVIEW_READY' });
  const toggle = screen.getByRole('button', { name: 'Words' });
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Click any words to change them')).toBeInTheDocument();
});
