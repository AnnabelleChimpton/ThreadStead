/* eslint-disable @typescript-eslint/no-explicit-any -- loose fetch and CodeMirror stubs */
/**
 * "Share this update in the feed" in the HTML/CSS editor
 * (EnhancedTemplateEditor). Unticked every time the editor opens; ticked, a
 * save that works is followed by the share request. The page that hosts the
 * editor makes the save request, so the share is its own request after it.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import EnhancedTemplateEditor from '@/components/features/templates/EnhancedTemplateEditor';
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
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn() }));

import { csrfFetch } from '@/lib/api/client/csrf-fetch';

const mockCsrfFetch = csrfFetch as jest.Mock;
const LABEL = 'Share this update in the feed';

function installFetch() {
  global.fetch = jest.fn(async (url: any, init?: any) => {
    if (String(url).includes('/api/templates/compile')) {
      const body = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          compiled: { compiledFrom: body.template, islands: [] },
          errors: [],
          warnings: [],
          strippedComponents: [],
        }),
      } as any;
    }
    return { ok: true, status: 200, json: async () => ({}) } as any;
  }) as any;
}

const user = { id: 'test-user-123', primaryHandle: 'testuser@local', handles: [], profile: {} };

function renderEditor(onSave = jest.fn().mockResolvedValue(undefined)) {
  render(
    <ToastProvider>
      <EnhancedTemplateEditor
        user={user}
        initialTemplate="<p>my page</p>"
        initialCSS="body { color: plum; }"
        initialTemplateMode="advanced"
        initialEditorMode="template"
        onSave={onSave}
      />
    </ToastProvider>
  );
  return { onSave };
}

async function ready() {
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/templates/compile', expect.anything()));
  await act(async () => {});
}

const shareCalls = () => mockCsrfFetch.mock.calls.filter(([url]) => url === '/api/user/page-update');

beforeEach(() => {
  installFetch();
  window.localStorage.clear();
  mockCsrfFetch.mockReset();
  mockCsrfFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ shared: true }) });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('unticked when the editor opens, on both tabs', async () => {
  renderEditor();
  await ready();
  expect(screen.getByLabelText(LABEL)).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'CSS Styles' }));
  expect(screen.getByLabelText(LABEL)).not.toBeChecked();
});

test('left unticked: the save goes through and nothing is shared', async () => {
  const { onSave } = renderEditor();
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Save & Go Live' }));
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  await act(async () => {});
  expect(shareCalls()).toHaveLength(0);
});

test('ticked: shared once the save works, then unticked again', async () => {
  const { onSave } = renderEditor();
  await ready();
  fireEvent.click(screen.getByLabelText(LABEL));
  expect(screen.getByLabelText(LABEL)).toBeChecked();

  fireEvent.click(screen.getByRole('button', { name: 'Save & Go Live' }));
  await waitFor(() => expect(shareCalls()).toHaveLength(1));
  expect(shareCalls()[0][1]).toEqual({ method: 'POST' });
  expect(mockCsrfFetch.mock.invocationCallOrder[0]).toBeGreaterThan(onSave.mock.invocationCallOrder[0]);
  expect(await screen.findByText('Shared in the feed.')).toBeInTheDocument();
  expect(screen.getByLabelText(LABEL)).not.toBeChecked();
});

test('ticked on the CSS tab works the same', async () => {
  renderEditor();
  await ready();
  fireEvent.click(screen.getByRole('button', { name: 'CSS Styles' }));
  fireEvent.click(screen.getByLabelText(LABEL));
  fireEvent.click(screen.getByRole('button', { name: 'Save Template' }));
  await waitFor(() => expect(shareCalls()).toHaveLength(1));
});

test('ticked, but nothing changed: says so', async () => {
  mockCsrfFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ shared: false }) });
  renderEditor();
  await ready();
  fireEvent.click(screen.getByLabelText(LABEL));
  fireEvent.click(screen.getByRole('button', { name: 'Save & Go Live' }));
  expect(await screen.findByText("Nothing changed, so there's nothing to share.")).toBeInTheDocument();
  expect(screen.getByLabelText(LABEL)).toBeChecked();
});

test('ticked, but the save fails: nothing is shared', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const { onSave } = renderEditor(jest.fn().mockRejectedValue(new Error('nope')));
  await ready();
  fireEvent.click(screen.getByLabelText(LABEL));
  fireEvent.click(screen.getByRole('button', { name: 'Save & Go Live' }));
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  await act(async () => {});
  expect(shareCalls()).toHaveLength(0);
});
