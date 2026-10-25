/**
 * The CSS editor (/resident/[username]/css-editor):
 *  - Reset wiped CSS and template with no question asked; it confirms now
 *    (one Reset, in the More menu), and the dialog says History can bring
 *    the old version back (it can).
 *  - the class reference's "Insert" looked for a <textarea> that went away
 *    when the editor became CodeMirror, so it did nothing. This runs the
 *    real CodeMirror so the insert path is the production one.
 *  - an HTML page's CSS is the HTML editor's CSS tab: one editor, one Save.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { EditorView } from '@codemirror/view';

// The page loads CodeMirror through next/dynamic; hand back the real one.
jest.mock('next/dynamic', () => () => require('@uiw/react-codemirror').default);
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
jest.mock('@/components/ui/layout/Layout', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@/components/features/templates/TemplateHistoryPanel', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/features/templates/TemplatePanelSelector', () => ({ __esModule: true, default: () => null }));
jest.mock('@/lib/templates/core/template-data', () => ({ fetchPageData: jest.fn(() => new Promise(() => {})) }));
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn() }));
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => ({ id: 'u1', primaryHandle: 'tester@local' })) }));

import CSSEditorPage, { getServerSideProps } from '@/pages/resident/[username]/css-editor';
import { ToastProvider } from '@/contexts/ToastContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

// jsdom has no layout; CodeMirror's measuring pass needs these to exist.
Object.assign(Range.prototype, {
  getClientRects: () => Object.assign([], { item: () => null }),
  getBoundingClientRect: () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }),
});

const mockCsrfFetch = csrfFetch as jest.Mock;
const INITIAL_CSS = '.ts-profile-header {\n  color: red;\n}\n';

function renderEditor(props: Partial<React.ComponentProps<typeof CSSEditorPage>> = {}) {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <CSSEditorPage
          username="tester"
          isOwner
          initialCSS={INITIAL_CSS}
          currentUser={{ id: 'u1', primaryHandle: 'tester@local' }}
          {...props}
        />
      </ConfirmProvider>
    </ToastProvider>
  );
}

async function editorText() {
  const dom = await waitFor(() => {
    const el = document.querySelector('.cm-editor') as HTMLElement | null;
    if (!el) throw new Error('editor not mounted');
    return el;
  });
  return EditorView.findFromDOM(dom)!.state.doc.toString();
}

beforeEach(() => {
  localStorage.clear();
  mockCsrfFetch.mockReset();
  mockCsrfFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: 'cap' }) });
});

function clickReset() {
  fireEvent.click(screen.getByRole('button', { name: /More/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Reset to default' }));
}

describe('Reset to default (in More)', () => {
  it('asks first, and does nothing on Cancel', async () => {
    renderEditor();
    clickReset();

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Reset to Default Template?');
    expect(within(dialog).getByText(/bring the old version back from History/)).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent(/cannot be undone/i);

    // The footer button (the dialog's close X shares the label).
    const cancel = within(dialog).getAllByRole('button', { name: 'Cancel' }).find(b => b.textContent === 'Cancel')!;
    fireEvent.click(cancel);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(mockCsrfFetch).not.toHaveBeenCalled();
  });

  it('resets once confirmed', async () => {
    renderEditor();
    clickReset();
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes, Reset to Default' }));

    await waitFor(() =>
      expect(mockCsrfFetch).toHaveBeenCalledWith('/api/profile/tester/css', expect.objectContaining({ method: 'POST' }))
    );
  });
});

describe('inserting CSS', () => {
  it('reference Insert adds a starter rule to the editor', async () => {
    renderEditor();
    await editorText();

    fireEvent.click(screen.getByRole('tab', { name: 'Class names' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Insert' })[0]);

    expect(await editorText()).toMatch(new RegExp(`^${INITIAL_CSS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.site-layout \\{`));
    expect(screen.getByRole('button', { name: 'Inserted' })).toBeInTheDocument();
  });
});

describe('which editor', () => {
  const ssr = (templateMode: string) => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ userId: 'u1', profile: { templateMode, customCSS: 'p {}', cssMode: 'inherit' } }),
    })) as unknown as typeof fetch;
    return getServerSideProps({ params: { username: 'tester' }, req: { headers: {} }, query: {} } as never);
  };

  it("sends an HTML page to the HTML editor's CSS tab", async () => {
    expect(await ssr('advanced')).toEqual({
      redirect: { destination: '/resident/tester/template-editor?tab=css', permanent: false },
    });
  });

  it('keeps the standard layout here', async () => {
    const result = await ssr('enhanced');
    expect(result).toMatchObject({ props: { username: 'tester', isOwner: true, initialCSS: 'p {}' } });
  });
});
