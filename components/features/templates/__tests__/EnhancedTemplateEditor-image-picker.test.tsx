/**
 * The editor's image picker: your own gallery images go in at the cursor, as
 * an <img> in the HTML pane and as url("...") in the CSS pane.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { EditorView } from '@codemirror/view';
import EnhancedTemplateEditor from '../EnhancedTemplateEditor';
import { ToastProvider } from '@/contexts/ToastContext';

// CodeMirror becomes a textarea backed by a real CodeMirror EditorState, so
// the editor's own insert-at-cursor dispatch runs for real. Each pane's view
// is kept on mockViews for the test to place the cursor.
const mockViews: Record<string, EditorView> = {};
jest.mock('next/dynamic', () => () => {
  const ReactLib = jest.requireActual('react');
  const { EditorState } = jest.requireActual('@codemirror/state');
  type Props = {
    value: string;
    placeholder?: string;
    onChange?: (value: string) => void;
    onCreateEditor?: (view: unknown) => void;
  };
  const FakeCodeMirror = (props: Props) => {
    const label = props.placeholder?.startsWith('Write your page') ? 'template-code' : 'css-code';
    const propsRef = ReactLib.useRef(props);
    propsRef.current = props;
    const viewRef = ReactLib.useRef(null);
    if (!viewRef.current) {
      const view = {
        state: EditorState.create({ doc: props.value ?? '' }),
        dispatch(spec: unknown) {
          view.state = view.state.update(spec).state;
          propsRef.current.onChange?.(view.state.doc.toString());
        },
        focus() {},
      };
      viewRef.current = view;
    }
    const view = viewRef.current;
    // Outside edits (typing into the textarea) replace the document
    if (view.state.doc.toString() !== (props.value ?? '')) {
      view.state = EditorState.create({ doc: props.value ?? '' });
    }
    ReactLib.useEffect(() => {
      mockViews[label] = view;
      propsRef.current.onCreateEditor?.(view);
    }, [label, view]);
    return typeof props.onChange === 'function' ? (
      <textarea aria-label={label} value={props.value} onChange={(e) => props.onChange?.(e.target.value)} />
    ) : null;
  };
  return FakeCodeMirror;
});

const user = { id: 'test-user-123', primaryHandle: 'testuser@local', handles: [], profile: {} };

const MISO = {
  id: 'm1',
  thumbnailUrl: 'https://cdn.example.com/media/u/1_thumb.png',
  fullUrl: 'https://cdn.example.com/media/u/1_full.png',
  title: 'Miso on the windowsill',
  caption: null,
  createdAt: '2026-10-01T12:00:00.000Z',
};
const SPARKLES = {
  id: 'm2',
  thumbnailUrl: 'https://cdn.example.com/media/u/2_thumb.gif',
  fullUrl: 'https://cdn.example.com/media/u/2.gif',
  title: null,
  caption: null,
  createdAt: '2026-10-02T12:00:00.000Z',
};

type PhotosReply = { ok: boolean; status: number; media?: unknown[] };
let photosReplies: PhotosReply[];
let photoRequests: string[];

beforeEach(() => {
  photosReplies = [];
  photoRequests = [];
  for (const k of Object.keys(mockViews)) delete mockViews[k];
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === '/api/cap/media') {
      return { ok: true, status: 200, json: async () => ({ token: 'cap-token' }) };
    }
    if (url === '/api/media/upload') {
      return { ok: true, status: 200, json: async () => ({ success: true, media: { ...SPARKLES, id: 'new' } }) };
    }
    if (url.startsWith('/api/photos/')) {
      photoRequests.push(url);
      const reply = photosReplies.shift() ?? { ok: true, status: 200, media: [] };
      return {
        ok: reply.ok,
        status: reply.status,
        json: async () => ({ media: reply.media ?? [], pagination: { hasNextPage: false } }),
      };
    }
    return { ok: true, status: 200, json: async () => ({ success: true, compiled: { islands: [] } }) };
  }) as unknown as typeof fetch;
  window.localStorage.clear();
});

afterEach(() => jest.restoreAllMocks());

function renderEditor(mode: 'template' | 'css', { template = '<p>before</p>', css = '' } = {}) {
  render(
    <ToastProvider>
      <EnhancedTemplateEditor
        user={user}
        initialTemplate={template}
        initialCSS={css}
        initialTemplateMode="advanced"
        initialEditorMode={mode}
        onSave={jest.fn()}
      />
    </ToastProvider>
  );
}

function putCursor(label: 'template-code' | 'css-code', at: number) {
  act(() => {
    mockViews[label].dispatch({ selection: { anchor: at } });
  });
}

describe('EnhancedTemplateEditor image picker', () => {
  it('HTML: a picked image goes in at the cursor as an <img> with its title as alt', async () => {
    photosReplies.push({ ok: true, status: 200, media: [MISO, SPARKLES] });
    renderEditor('template');
    await waitFor(() => expect(mockViews['template-code']).toBeDefined());
    putCursor('template-code', '<p>'.length);

    fireEvent.click(screen.getByRole('button', { name: 'Insert image' }));
    expect(await screen.findByRole('dialog', { name: 'Insert an image' })).toBeInTheDocument();
    expect(photoRequests[0]).toBe('/api/photos/testuser?page=1&limit=30&scope=mine');

    // Each image is a button named by its title (or, untitled, its date)
    const miso = await screen.findByRole('button', { name: 'Miso on the windowsill' });
    expect(screen.getByRole('button', { name: /^Untitled image from October \d, 2026$/ })).toBeInTheDocument();
    fireEvent.click(miso);

    await waitFor(() =>
      expect(screen.getByLabelText('template-code')).toHaveValue(
        '<p><img src="https://cdn.example.com/media/u/1_full.png" alt="Miso on the windowsill">before</p>'
      )
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('HTML: an untitled image gets an empty alt with the cursor inside it', async () => {
    photosReplies.push({ ok: true, status: 200, media: [SPARKLES] });
    renderEditor('template', { template: '' });
    await waitFor(() => expect(mockViews['template-code']).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Insert image' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Untitled image from/ }));

    const expected = '<img src="https://cdn.example.com/media/u/2.gif" alt="">';
    await waitFor(() => expect(screen.getByLabelText('template-code')).toHaveValue(expected));
    expect(mockViews['template-code'].state.selection.main.anchor).toBe(expected.indexOf('alt="') + 'alt="'.length);
  });

  it('CSS: a picked image goes in at the cursor as url("...")', async () => {
    photosReplies.push({ ok: true, status: 200, media: [MISO] });
    const css = 'body { background: ; }';
    renderEditor('css', { css });
    await waitFor(() => expect(mockViews['css-code']).toBeDefined());
    putCursor('css-code', css.indexOf(';'));

    fireEvent.click(screen.getByRole('button', { name: 'Insert image' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Miso on the windowsill' }));

    await waitFor(() =>
      expect(screen.getByLabelText('css-code')).toHaveValue(
        'body { background: url("https://cdn.example.com/media/u/1_full.png"); }'
      )
    );
  });

  it('shows an empty state, with a way to upload, when there are no images yet', async () => {
    photosReplies.push({ ok: true, status: 200, media: [] });
    renderEditor('template');

    fireEvent.click(screen.getByRole('button', { name: 'Insert image' }));
    expect(await screen.findByText('No images yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload an image' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Your media page' })).toHaveAttribute('href', '/resident/testuser/media');
  });

  it('an image uploaded from the picker goes straight in', async () => {
    document.cookie = 'csrf_token=tok';
    photosReplies.push({ ok: true, status: 200, media: [] });
    renderEditor('template', { template: '' });
    await waitFor(() => expect(mockViews['template-code']).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Insert image' }));
    await screen.findByText('No images yet');
    const file = new File([new Uint8Array([71, 73, 70])], 'sparkles.gif', { type: 'image/gif' });
    fireEvent.change(screen.getByLabelText('Image to upload'), { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByLabelText('template-code')).toHaveValue('<img src="https://cdn.example.com/media/u/2.gif" alt="">')
    );
    const upload = (global.fetch as jest.Mock).mock.calls.find(([u]) => u === '/api/media/upload');
    const body = upload[1].body as FormData;
    expect(body.get('cap')).toBe('cap-token');
    expect((body.get('image') as File).name).toBe('sparkles.gif');
  });

  it('shows an error state when the images do not load, and Try again reloads them', async () => {
    photosReplies.push({ ok: false, status: 500 }, { ok: true, status: 200, media: [MISO] });
    renderEditor('template');

    fireEvent.click(screen.getByRole('button', { name: 'Insert image' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your images");

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Miso on the windowsill' })).toBeInTheDocument();
    expect(photoRequests).toHaveLength(2);
  });
});
