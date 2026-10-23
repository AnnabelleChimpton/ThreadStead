import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import RingHubFeed from '../RingHubFeed';

jest.mock('../PostItem', () => ({
  __esModule: true,
  default: ({ post }: { post: { id: string } }) => <div data-testid="post">{post.id}</div>,
}));
jest.mock('../PromptItem', () => ({ __esModule: true, default: () => <div data-testid="prompt" /> }));
jest.mock('@/hooks/useCurrentUser', () => ({ useCurrentUser: () => ({ user: null }) }));

const item = (id: string, ringSlug: string, postId: string) => ({
  id,
  ringId: ringSlug,
  ringSlug,
  ringName: ringSlug,
  actorDid: 'did:web:friend',
  actorName: null,
  uri: `https://home.example/resident/friend/post/${postId}`,
  digest: id,
  submittedAt: '2026-10-01T00:00:00Z',
  submittedBy: 'did:web:friend',
  status: 'ACCEPTED',
  metadata: null,
  pinned: false,
  isNotification: false,
  notificationType: null,
});

// One post sent to three rings: twice on the first page, once on the second
const pages: Record<number, unknown[]> = {
  0: [item('h1', 'knitting', 'p1'), item('h2', 'yarn', 'p1'), item('h3', 'knitting', 'p2')],
  3: [item('h4', 'socks', 'p1'), item('h5', 'socks', 'p3')],
};

beforeEach(() => {
  global.fetch = jest.fn(async (url: string) => {
    if (url.startsWith('/api/feed/my-rings')) {
      const offset = Number(new URL(url, 'http://x').searchParams.get('offset'));
      const posts = pages[offset] ?? [];
      return {
        ok: true,
        json: async () => ({
          posts,
          pagination: { total: 5, limit: 20, offset, hasMore: offset === 0 },
          nextOffset: offset + posts.length,
          generatedAt: 'now',
        }),
      };
    }
    if (url.startsWith('/api/posts/single/')) {
      const id = url.split('/').pop();
      return { ok: true, json: async () => ({ post: { id, title: id, threadRings: [] } }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  }) as any;
});

test('a post in several rings shows once, across pages too', async () => {
  render(<RingHubFeed type="my-rings" />);
  await act(async () => {});
  expect(screen.getAllByTestId('post').map((el) => el.textContent)).toEqual(['p1', 'p2']);

  fireEvent.click(screen.getByText('Load More Posts'));
  await act(async () => {});
  expect(screen.getAllByTestId('post').map((el) => el.textContent)).toEqual(['p1', 'p2', 'p3']);
});

test('asks the ring posts feed for no fork notices', async () => {
  render(<RingHubFeed type="my-rings" />);
  await act(async () => {});
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('includeNotifications=false'));
});
