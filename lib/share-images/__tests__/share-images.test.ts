/**
 * @jest-environment node
 *
 * Which picture a link previews with. A post: its own first picture, sized
 * from its upload so a wide photo gets the large card; else its author's
 * house; else their own picture; else nothing (the site's card). A ring: its
 * badge, with the badge's file name so a new badge refreshes cached previews.
 */
const mockMedia = jest.fn();
const mockHomeConfig = jest.fn();
const mockSchedule = jest.fn();

jest.mock('@/lib/config/site-url', () => ({ getSiteBaseUrl: () => 'https://example.com' }));
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    media: { findFirst: (...a: unknown[]) => mockMedia(...a) },
    userHomeConfig: { findUnique: (...a: unknown[]) => mockHomeConfig(...a) },
  },
}));
jest.mock('@/lib/pixel-homes/snapshot/service', () => ({ scheduleHomeSnapshot: (...a: unknown[]) => mockSchedule(...a) }));

import { ringShareImage, SHARE_CARD } from '@/lib/share-images';
import { homeShareImage, postShareImage, residentShareImage, type Resident } from '@/lib/share-images/server';

const robin: Resident = { userId: 'u1', username: 'robin', name: 'Robin', hasPixelHome: true, avatarUrl: 'https://cdn.example/robin.png' };
const house = { url: 'https://cdn.example/yard.png', ...SHARE_CARD, alt: "Robin's house and yard" };

beforeEach(() => {
  jest.clearAllMocks();
  mockMedia.mockResolvedValue(null);
  mockHomeConfig.mockResolvedValue({ snapshotUrl: 'https://cdn.example/yard.png' });
});

describe('ringShareImage', () => {
  it('is the ring card, versioned by the badge file', () => {
    expect(ringShareImage({ slug: 'cozy-knits', name: 'Cozy Knits', badgeImageUrl: 'https://cdn.example/badges/k-1.png' })).toEqual({
      url: '/api/share/ring/cozy-knits.png?v=k-1.png',
      ...SHARE_CARD,
      alt: "The Cozy Knits ring's badge",
    });
    expect(ringShareImage({ slug: 'cats', name: 'Cats' }).url).toBe('/api/share/ring/cats.png');
  });
});

describe('homeShareImage', () => {
  it('points at the route that draws the yard when it has no snapshot yet', async () => {
    mockHomeConfig.mockResolvedValue({ snapshotUrl: null });
    expect((await homeShareImage(robin)).url).toBe('https://example.com/api/home/robin/snapshot');
    expect(mockSchedule).toHaveBeenCalledWith('u1');
  });
});

describe('postShareImage', () => {
  it('uses the post’s own picture, sized as its upload’s medium', async () => {
    mockMedia.mockResolvedValue({ width: 2400, height: 1600 });
    const image = await postShareImage({ bodyMarkdown: '![beds](https://cdn.example/beds_medium.jpg)' }, robin);
    expect(image).toEqual({ url: 'https://cdn.example/beds_medium.jpg', width: 600, height: 400 });
    expect(mockMedia.mock.calls[0][0].where).toEqual({ userId: 'u1', mediumUrl: 'https://cdn.example/beds_medium.jpg' });
  });

  it('leaves the size off a picture that isn’t their upload', async () => {
    expect(await postShareImage({ bodyMarkdown: '![x](https://elsewhere.example/x.jpg)' }, robin)).toEqual({ url: 'https://elsewhere.example/x.jpg' });
  });

  it('falls back to the author’s house, then their picture, then nothing', async () => {
    const words = { bodyMarkdown: 'Just words' };
    expect(await postShareImage(words, robin)).toEqual(house);
    expect(await postShareImage(words, { ...robin, hasPixelHome: false })).toEqual({ url: 'https://cdn.example/robin.png', alt: "Robin's picture" });
    expect(await postShareImage(words, { ...robin, hasPixelHome: false, avatarUrl: null })).toBeNull();
  });
});

describe('residentShareImage', () => {
  it('is their house when they have one', async () => {
    expect(await residentShareImage(robin)).toEqual(house);
  });
});
