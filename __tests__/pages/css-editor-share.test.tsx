/**
 * "Share this update in the feed" in the CSS editor: unticked every time it
 * opens, and sent with the save (shareToFeed) only when ticked.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('next/dynamic', () => () => require('@uiw/react-codemirror').default);
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
jest.mock('@/components/ui/layout/Layout', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/components/features/templates/TemplateHistoryPanel', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/features/templates/TemplatePanelSelector', () => ({ __esModule: true, default: () => null }));
jest.mock('@/lib/templates/core/template-data', () => ({ fetchPageData: jest.fn(() => new Promise(() => {})) }));
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn() }));

import CSSEditorPage from '@/pages/resident/[username]/css-editor';
import { ToastProvider } from '@/contexts/ToastContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

Object.assign(Range.prototype, {
  getClientRects: () => Object.assign([], { item: () => null }),
  getBoundingClientRect: () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }),
});

const mockCsrfFetch = csrfFetch as jest.Mock;
const LABEL = 'Share this update in the feed';

function renderEditor() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <CSSEditorPage
          username="tester"
          isOwner
          initialCSS={'body { color: plum; }\n'}
          templateMode="enhanced"
          currentUser={{ id: 'u1', primaryHandle: 'tester@local' }}
        />
      </ConfirmProvider>
    </ToastProvider>
  );
}

function saveBody() {
  const call = mockCsrfFetch.mock.calls.find(([url]) => url === '/api/profile/tester/css');
  return JSON.parse(call![1].body);
}

beforeEach(() => {
  localStorage.clear();
  mockCsrfFetch.mockReset();
  mockCsrfFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, shared: true, pageChanged: true }) });
});

test('unticked when the editor opens', () => {
  renderEditor();
  expect(screen.getByLabelText(LABEL)).not.toBeChecked();
});

test('left unticked: the save asks for no share', async () => {
  renderEditor();
  fireEvent.click(screen.getByRole('button', { name: 'Save CSS' }));
  await waitFor(() => expect(mockCsrfFetch).toHaveBeenCalled());
  expect(saveBody()).not.toHaveProperty('shareToFeed');
  expect(await screen.findByText('CSS saved')).toBeInTheDocument();
});

test('ticked: sent with the save, and unticked again once shared', async () => {
  renderEditor();
  fireEvent.click(screen.getByLabelText(LABEL));
  fireEvent.click(screen.getByRole('button', { name: 'Save CSS' }));
  await waitFor(() => expect(mockCsrfFetch).toHaveBeenCalled());
  expect(saveBody().shareToFeed).toBe(true);
  expect(await screen.findByText('CSS saved and shared in the feed')).toBeInTheDocument();
  expect(screen.getByLabelText(LABEL)).not.toBeChecked();
});

test('ticked, but nothing changed: says so and stays ticked', async () => {
  mockCsrfFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, shared: false, pageChanged: false }) });
  renderEditor();
  fireEvent.click(screen.getByLabelText(LABEL));
  fireEvent.click(screen.getByRole('button', { name: 'Save CSS' }));
  expect(await screen.findByText("CSS saved. Nothing changed, so there's nothing to share.")).toBeInTheDocument();
  expect(screen.getByLabelText(LABEL)).toBeChecked();
});
