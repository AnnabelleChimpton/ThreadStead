/**
 * The "Pop Out" preview window talks to the editor over postMessage:
 *   editor --PREVIEW_DATA--> popup --SAVE_REQUEST--> editor
 *
 * Pins three things that used to be broken:
 *  - the editor's listener captured handleSaveFromPreview from the render that
 *    opened the popup, so saving from the popup used stale editor state
 *  - the popup sent `showNavigation` while everything else speaks
 *    `hideNavigation`, so the navigation setting never round-tripped
 *  - the listener accepted any same-origin window, not just its own popup
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import EnhancedTemplateEditor from '../EnhancedTemplateEditor';
import TemplatePreviewPage from '@/pages/template-preview';
import { ToastProvider } from '@/contexts/ToastContext';

// CodeMirror (the only next/dynamic import the editor uses) becomes a
// textarea; ProfileModeRenderer's dynamic islands render nothing.
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

const ORIGIN = window.location.origin;

// The compile API echoes the template back so a test can tell which
// version of the page a compiled payload was built from.
function installFetch() {
  global.fetch = jest.fn(async (url: any, init?: any) => {
    const u = String(url);
    if (u.includes('/api/templates/compile')) {
      const body = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, compiled: { compiledFrom: body.template, islands: [] } }),
      } as any;
    }
    return { ok: true, status: 200, json: async () => ({}) } as any;
  }) as any;
}

// A real jsdom Window so it can be a MessageEvent source.
function makePopupWindow(): Window {
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  return frame.contentWindow!;
}

function postToEditor(data: any, source: Window | null, origin = ORIGIN) {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, origin, source }));
  });
}

const user = { id: 'test-user-123', primaryHandle: 'testuser@local', handles: [], profile: {} };

async function renderEditor(props: Partial<React.ComponentProps<typeof EnhancedTemplateEditor>> = {}) {
  const onSave = jest.fn().mockResolvedValue(undefined);
  render(
    <ToastProvider>
      <EnhancedTemplateEditor
        user={user}
        initialTemplate="<p>version one</p>"
        initialTemplateMode="advanced"
        initialEditorMode="template"
        onSave={onSave}
        {...props}
      />
    </ToastProvider>
  );
  // Mount compiles the initial template (debounced).
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith('/api/templates/compile', expect.anything())
  );
  return { onSave };
}

async function popOut() {
  const popup = makePopupWindow();
  const popupPost = jest.spyOn(popup, 'postMessage').mockImplementation(() => {});
  jest.spyOn(window, 'open').mockReturnValue(popup);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /pop out/i }));
  });
  await waitFor(() => expect(window.open).toHaveBeenCalled());
  return { popup, popupPost };
}

beforeEach(() => {
  installFetch();
  window.localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
  document.querySelectorAll('iframe').forEach((f) => f.remove());
});

describe('EnhancedTemplateEditor pop-out preview messaging', () => {
  it('saves the latest editor state, not the state from when the popup opened', async () => {
    const { onSave } = await renderEditor();
    const { popup } = await popOut();

    // Edit after the popup is open, and let the auto-compile catch up.
    fireEvent.change(screen.getByLabelText('template-code'), {
      target: { value: '<p>version two</p>' },
    });
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/templates/compile',
        expect.objectContaining({ body: expect.stringContaining('version two') })
      )
    );
    // Let the compile result land in state.
    await act(async () => {});

    postToEditor(
      {
        type: 'SAVE_REQUEST',
        data: { template: '<p>version two</p>', customCSS: '', cssMode: 'inherit', hideNavigation: false, useStandardLayout: false },
      },
      popup
    );

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const [savedTemplate, , savedCompiled] = onSave.mock.calls[0];
    expect(savedTemplate).toBe('<p>version two</p>');
    expect(savedCompiled).toEqual(expect.objectContaining({ compiledFrom: '<p>version two</p>' }));
  });

  it('round-trips the navigation setting through the popup', async () => {
    const { onSave } = await renderEditor({ initialShowNavigation: false });
    const { popup, popupPost } = await popOut();

    // The popup announces itself; the editor answers with its data.
    postToEditor({ type: 'PREVIEW_READY' }, popup);
    const dataMsg = popupPost.mock.calls.map((c) => c[0] as any).find((m) => m.type === 'PREVIEW_DATA');
    expect(dataMsg).toBeDefined();

    // Run the real preview page with that payload, then press its Save.
    const opener = { closed: false, postMessage: jest.fn() };
    Object.defineProperty(window, 'opener', { value: opener, configurable: true });
    try {
      render(<TemplatePreviewPage />);
      act(() => {
        window.dispatchEvent(new MessageEvent('message', { data: dataMsg, origin: ORIGIN }));
      });
      const saveButtons = await screen.findAllByRole('button', { name: /^save$/i });
      fireEvent.click(saveButtons[saveButtons.length - 1]);
    } finally {
      Object.defineProperty(window, 'opener', { value: null, configurable: true });
    }

    const saveMsg = opener.postMessage.mock.calls.map((c) => c[0]).find((m: any) => m.type === 'SAVE_REQUEST');
    expect(saveMsg.data.hideNavigation).toBe(true);

    postToEditor(saveMsg, popup);
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][4]).toBe(true);
  });

  it('keeps the current navigation setting when an older popup sends only showNavigation', async () => {
    const { onSave } = await renderEditor({ initialShowNavigation: false });
    const { popup } = await popOut();

    // Older popups never received the setting and always sent `false` here.
    postToEditor(
      {
        type: 'SAVE_REQUEST',
        data: { template: '<p>version one</p>', customCSS: '', cssMode: 'inherit', showNavigation: false, useStandardLayout: false },
      },
      popup
    );

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][4]).toBe(true);
  });

  it('ignores save requests from another origin', async () => {
    const { onSave } = await renderEditor();
    const { popup } = await popOut();

    postToEditor(
      { type: 'SAVE_REQUEST', data: { template: '<p>evil</p>', customCSS: '', useStandardLayout: false } },
      popup,
      'https://evil.example'
    );

    await act(async () => {});
    expect(onSave).not.toHaveBeenCalled();
  });

  it('ignores same-origin save requests that are not from its popup', async () => {
    const { onSave } = await renderEditor();
    await popOut();
    const otherWindow = makePopupWindow();

    postToEditor(
      { type: 'SAVE_REQUEST', data: { template: '<p>other tab</p>', customCSS: '', useStandardLayout: false } },
      otherWindow
    );

    await act(async () => {});
    expect(onSave).not.toHaveBeenCalled();
  });
});
