/**
 * Pictures added to posts and comments only get compressed when they're
 * photos. GIF, PNG and WebP go up as they are, so /api/media/upload can keep
 * animation, transparency and exact pixels; JPEG and HEIC are still
 * compressed (which is also what turns HEIC into something browsers show).
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';

const compressed = new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' });
jest.mock('browser-image-compression', () => jest.fn(async () => compressed));
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn(), getCsrfToken: () => 'csrf' }));
jest.mock('next/router', () => ({ useRouter: () => ({ push: jest.fn(), query: {}, asPath: '/', events: { on: jest.fn(), off: jest.fn() } }) }));
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
jest.mock('@/components/ui/feedback/EmojiPicker', () => () => null);

import imageCompression from 'browser-image-compression';
import PostEditor from '../PostEditor';
import NewCommentForm from '../NewCommentForm';

/** Records each upload's form and answers like /api/media/upload. */
let sent: FormData[];
class FakeXHR {
  status = 0;
  statusText = '';
  responseText = '';
  upload = { addEventListener: jest.fn() };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  open() {}
  setRequestHeader() {}
  send(body: FormData) {
    sent.push(body);
    this.status = 200;
    this.responseText = JSON.stringify({ success: true, media: { id: 'm1', mediumUrl: 'https://cdn.example.com/m1_medium.png' } });
    setTimeout(() => this.onload?.(), 0);
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  sent = [];
  (global as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = FakeXHR;
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const body = url === '/api/cap/media' ? { token: 'cap' } : { threadRings: [], rings: [], emojis: [] };
    return { ok: true, status: 200, json: async () => body, text: async () => '' };
  }) as unknown as typeof fetch;
});

const forms: Array<[string, () => React.ReactElement]> = [
  ['post editor', () => <PostEditor onSubmit={jest.fn()} />],
  ['comment form', () => <NewCommentForm postId="post-1" />],
];

describe.each(forms)('%s', (_name, element) => {
  function pick(file: File) {
    const { container } = render(element());
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
  }

  test.each([
    ['a PNG', 'sprite.png', 'image/png'],
    ['a WebP', 'cutout.webp', 'image/webp'],
    ['a GIF', 'dance.gif', 'image/gif'],
  ])('%s goes up as it is, as a post image', async (_label, name, type) => {
    const file = new File(['x'], name, { type });
    pick(file);
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(imageCompression).not.toHaveBeenCalled();
    const image = sent[0].get('image') as File;
    expect(image.name).toBe(name);
    expect(image.type).toBe(type);
    expect(sent[0].get('context')).toBe('post_embed');
  });

  test.each([
    ['a JPEG photo', 'holiday.jpg', 'image/jpeg'],
    ['a HEIC photo', 'IMG_0001.heic', 'image/heic'],
    ['a HEIC with no MIME type', 'IMG_0002.HEIC', ''],
  ])('%s is compressed to JPEG first', async (_label, name, type) => {
    pick(new File(['x'], name, { type }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(imageCompression).toHaveBeenCalledTimes(1);
    expect((imageCompression as unknown as jest.Mock).mock.calls[0][1]).toMatchObject({ fileType: 'image/jpeg' });
    expect(sent[0].get('image')).toBe(compressed);
  });
});
