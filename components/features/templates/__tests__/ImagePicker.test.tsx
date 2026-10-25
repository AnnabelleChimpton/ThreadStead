/**
 * The image picker lists the owner's own pictures (scope=mine): gallery
 * images and the ones added to posts and comments, all pickable.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImagePicker from '../ImagePicker';
import { ToastProvider } from '@/contexts/ToastContext';

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
const mockCsrfFetch = jest.fn();
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: (...args: unknown[]) => mockCsrfFetch(...args) }));
jest.mock('@/lib/api/client/capability', () => ({
  ...jest.requireActual('@/lib/api/client/capability'),
  requestCapability: jest.fn(async () => 'cap'),
}));

const FROM_POST = {
  id: 'p1',
  thumbnailUrl: 'https://cdn.example.com/media/u/3_thumb.png',
  fullUrl: 'https://cdn.example.com/media/u/3_full.png',
  title: null,
  caption: null,
  createdAt: '2026-10-03T12:00:00.000Z',
};
const GALLERY = {
  id: 'g1',
  thumbnailUrl: 'https://cdn.example.com/media/u/1_thumb.jpg',
  fullUrl: 'https://cdn.example.com/media/u/1_full.jpg',
  title: 'Miso on the windowsill',
  caption: null,
  createdAt: '2026-10-01T12:00:00.000Z',
};

let requests: string[];

beforeEach(() => {
  requests = [];
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    requests.push(String(input));
    return {
      ok: true,
      status: 200,
      json: async () => ({ media: [FROM_POST, GALLERY], pagination: { hasNextPage: false } }),
    };
  }) as unknown as typeof fetch;
});

afterEach(() => jest.restoreAllMocks());

test('lists post images alongside gallery images from the owner-only list, and a post image can be picked', async () => {
  const onPick = jest.fn();
  render(
    <ToastProvider>
      <ImagePicker pane="html" username="annie" onClose={jest.fn()} onPick={onPick} />
    </ToastProvider>
  );

  const list = await screen.findByRole('list', { name: 'Your images' });
  expect(requests[0]).toBe('/api/photos/annie?page=1&limit=30&scope=mine');

  // Newest first, as the server sent them: the post image, then the gallery one
  const buttons = Array.from(list.querySelectorAll('button'));
  expect(buttons.map((b) => b.getAttribute('aria-label') ?? b.querySelector('img')?.getAttribute('alt'))).toEqual([
    'Untitled image from October 3, 2026',
    'Miso on the windowsill',
  ]);

  fireEvent.click(screen.getByRole('button', { name: 'Untitled image from October 3, 2026' }));
  await waitFor(() => expect(onPick).toHaveBeenCalledTimes(1));
  expect(onPick).toHaveBeenCalledWith('html', {
    text: `<img src="${FROM_POST.fullUrl}" alt="">`,
    cursor: `<img src="${FROM_POST.fullUrl}" alt="`.length,
  });
});

test("pictures uploaded for the page can be deleted here (as on the media page); others can't", async () => {
  const PAGE_PICTURE = { ...GALLERY, id: 'a1', title: 'Star tile', uploadContext: 'other' };
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ media: [PAGE_PICTURE, { ...GALLERY, uploadContext: 'media_collection' }], pagination: { hasNextPage: false } }),
  })) as unknown as typeof fetch;
  render(
    <ToastProvider>
      <ImagePicker pane="html" username="annie" onClose={jest.fn()} onPick={jest.fn()} />
    </ToastProvider>
  );
  await screen.findByRole('list', { name: 'Your images' });
  expect(screen.getByRole('button', { name: 'Delete Star tile' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete Miso on the windowsill' })).toBeNull();
});

test('an upload from here is for the page, not the gallery', async () => {
  mockCsrfFetch.mockResolvedValue({ ok: true, json: async () => ({ media: GALLERY }) });
  render(
    <ToastProvider>
      <ImagePicker pane="html" username="annie" onClose={jest.fn()} onPick={jest.fn()} />
    </ToastProvider>
  );
  await screen.findByRole('list', { name: 'Your images' });
  const input = screen.getByLabelText('Image to upload') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(['x'], 'tile.png', { type: 'image/png' })] } });
  await waitFor(() => expect(mockCsrfFetch).toHaveBeenCalled());
  expect((mockCsrfFetch.mock.calls[0][1].body as FormData).get('context')).toBe('page_asset');
});

describe('several at once', () => {
  const file = (name: string, type = 'image/gif') => new File(['GIF89a'], name, { type });
  const uploaded = (n: number) => ({ id: `u${n}`, thumbnailUrl: `/local/u${n}_thumb.gif`, fullUrl: `/local/u${n}.gif`, title: null, caption: null, createdAt: '2026-10-25T12:00:00.000Z' });

  it('uploads each, then hands over every file name with its new address', async () => {
    let n = 0;
    mockCsrfFetch.mockReset().mockImplementation(async () => ({ ok: true, status: 200, json: async () => ({ media: uploaded(++n) }) }));
    const onUploadedMany = jest.fn();
    render(
      <ToastProvider>
        <ImagePicker pane="html" username="annie" onClose={jest.fn()} onPick={jest.fn()} onUploadedMany={onUploadedMany} />
      </ToastProvider>
    );
    await screen.findByRole('list', { name: 'Your images' });
    const input = screen.getByLabelText('Pictures to upload') as HTMLInputElement;
    expect(input.multiple).toBe(true);
    fireEvent.change(input, { target: { files: [file('cat.gif'), file('sky.gif')] } });
    await waitFor(() => expect(onUploadedMany).toHaveBeenCalledWith([
      { name: 'cat.gif', url: `${window.location.origin}/local/u1.gif` },
      { name: 'sky.gif', url: `${window.location.origin}/local/u2.gif` },
    ]));
    expect(mockCsrfFetch).toHaveBeenCalledTimes(2);
  });

  it('stops when the page pictures are full, keeping what went up', async () => {
    let n = 0;
    mockCsrfFetch.mockReset().mockImplementation(async () =>
      ++n === 1
        ? { ok: true, status: 200, json: async () => ({ media: uploaded(1) }) }
        : { ok: false, status: 413, json: async () => ({ error: 'Your page pictures are full (50 MB). Delete some on your media page to make room.' }) }
    );
    const onUploadedMany = jest.fn();
    render(
      <ToastProvider>
        <ImagePicker pane="html" username="annie" onClose={jest.fn()} onPick={jest.fn()} onUploadedMany={onUploadedMany} />
      </ToastProvider>
    );
    await screen.findByRole('list', { name: 'Your images' });
    fireEvent.change(screen.getByLabelText('Pictures to upload'), { target: { files: [file('a.gif'), file('b.gif'), file('c.gif')] } });
    await waitFor(() => expect(onUploadedMany).toHaveBeenCalledWith([{ name: 'a.gif', url: `${window.location.origin}/local/u1.gif` }]));
    expect(mockCsrfFetch).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/b\.gif: Your page pictures are full/)).toBeInTheDocument();
  });
});
