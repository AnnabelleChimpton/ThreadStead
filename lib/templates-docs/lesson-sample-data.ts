import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';

/**
 * Who a lesson's live example is about: a made-up resident called Pat, with
 * a couple of friends and posts, seen by a visitor. Nothing here is fetched,
 * which is why steps whose components load your own data (Guestbook,
 * MyRings, ProfileMusic, MyHouse…) don't run live.
 */
export const LESSON_SAMPLE_DATA: ResidentData = {
  owner: { id: 'lesson-pat', handle: 'pat', displayName: 'Pat', avatarUrl: '/assets/default-avatar.gif' },
  viewer: { id: null },
  posts: [
    { id: 'lesson-post-1', bodyHtml: '<p>Got the old Bakelite set working again. It only picks up one station, and it\'s the shipping forecast.</p>', createdAt: '2026-10-12T12:00:00.000Z' },
  ],
  guestbook: [],
  capabilities: { bio: 'I collect old radios and I\'m trying to learn the banjo.' },
  featuredFriends: [
    { id: 'lesson-juniper', handle: 'juniper', displayName: 'Juniper', avatarUrl: '/assets/default-avatar.gif' },
    { id: 'lesson-moss', handle: 'moss', displayName: 'Moss Bell', avatarUrl: '/assets/default-avatar.gif' },
  ],
};
