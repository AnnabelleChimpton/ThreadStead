/**
 * What a page of your own HTML's components read (ResidentData), built one
 * way for the live page (getServerSideProps) and the editor's preview
 * (/api/profile/[username]/page-data). The preview had its own builder,
 * client-side, missing friends, websites, photos, music and the house, with
 * made-up posts when anything failed.
 */
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider';
import type { Website } from '@/components/shared/WebsiteManager';
import type { SelectedFriend } from '@/components/core/social/FriendManager';
import { db } from '@/lib/config/database/connection';
import { resolveCSSMode } from '@/lib/utils/css/css-mode';
import { mapProfileCSSModeToComponentMode } from '@/lib/utils/css/css-mode-mapper';
import { pageHomeFor, pageHomeIfUsed } from '@/lib/templates/page-home';
import type { PageForRender } from '@/lib/templates/rendering/page-tree-server';
import { pageReads, type ProfileMidi, type ResidentPage } from './load-resident-page';

type Viewer = { id: string } | null;

/** The profile's blogroll, as the page's websites */
export function websitesOf(profile: ResidentPage['profile']): Website[] {
  const websites: Website[] = [];
  for (const item of Array.isArray(profile?.blogroll) ? profile.blogroll : []) {
    const obj = item as Record<string, unknown> | null;
    if (obj && typeof obj === 'object' && typeof obj.label === 'string' && typeof obj.url === 'string') {
      websites.push({
        id: String(obj.id || `website-${websites.length}`),
        label: obj.label,
        url: obj.url,
        blurb: String(obj.blurb || ''),
        mine: obj.mine === true,
      });
    }
  }
  return websites;
}

export function featuredFriendsOf(profile: ResidentPage['profile']): SelectedFriend[] {
  const friends: SelectedFriend[] = [];
  for (const item of Array.isArray(profile?.featuredFriends) ? profile.featuredFriends : []) {
    const obj = item as Record<string, unknown> | null;
    if (obj && typeof obj === 'object' && typeof obj.id === 'string' && typeof obj.handle === 'string') {
      friends.push({
        id: obj.id,
        handle: obj.handle,
        displayName: String(obj.displayName || obj.handle),
        avatarUrl: String(obj.avatarUrl || '/assets/default-avatar.gif'),
      });
    }
  }
  return friends;
}

/**
 * The profile's song for this viewer: paused for someone signed in who said
 * "don't play music automatically for me". (A signed-out visitor's choice
 * lives in their browser; the player reads it there.)
 */
export async function musicFor(resident: ResidentPage, viewer: Viewer): Promise<ProfileMidi | null> {
  const song = resident.profileMidi;
  if (!song?.autoplay || !viewer) return song;
  const own = await db.profile
    .findUnique({ where: { userId: viewer.id }, select: { playProfileMusicAutomatically: true } })
    .catch(() => null);
  return own && !own.playProfileMusicAutomatically ? { ...song, autoplay: false } : song;
}

function ownerOf(resident: ResidentPage): ResidentData['owner'] {
  return {
    id: resident.userId,
    handle: resident.username,
    displayName: resident.profile?.displayName || resident.username,
    avatarUrl: resident.profile?.avatarUrl || '/assets/default-avatar.gif',
  };
}

/**
 * Who the page belongs to, with nothing else loaded: a page whose data
 * didn't load still renders as itself, its lists empty, and one with no
 * compiled copy shows its own "couldn't be shown" note (template audit 01 #11c/d).
 */
export function ownerOnlyData(resident: ResidentPage): ResidentData {
  return {
    owner: ownerOf(resident),
    viewer: { id: null },
    posts: [],
    guestbook: [],
    images: [],
    capabilities: { bio: resident.profile?.bio || '' },
    featuredFriends: [],
    websites: [],
    cssRenderMode: mapProfileCSSModeToComponentMode(resolveCSSMode(resident.profile?.cssMode)),
  };
}

/**
 * Everything the page's components read, for this viewer. `reads` is the
 * page, whose components decide which lists load (pageReads), or 'all' for
 * a draft in the editor, which may start using any of them.
 */
export async function residentDataFor(
  resident: ResidentPage,
  viewer: Viewer,
  { reads, profileMidi }: { reads: Pick<PageForRender, 'islands'> | 'all'; profileMidi: ProfileMidi | null }
): Promise<ResidentData> {
  const { getPostsForUser, getGuestbookForUser, getPhotosForUser } = await import('@/lib/utils/data/fetchers');
  const ownerId = resident.userId;
  const wants = (list: 'posts' | 'images' | 'guestbook') => reads === 'all' || pageReads(reads, list);

  // The viewer's relationship to the owner
  let isFollowing = false;
  let isFollower = false;
  if (viewer && viewer.id !== ownerId) {
    const [viewerFollowsOwner, ownerFollowsViewer] = await Promise.all([
      db.follow.findUnique({ where: { followerId_followeeId: { followerId: viewer.id, followeeId: ownerId } } }),
      db.follow.findUnique({ where: { followerId_followeeId: { followerId: ownerId, followeeId: viewer.id } } }),
    ]);
    isFollowing = viewerFollowsOwner?.status === 'accepted';
    isFollower = ownerFollowsViewer?.status === 'accepted';
  }

  const [postsData, guestbookData, imagesData, pixelHome] = await Promise.allSettled([
    wants('posts') ? getPostsForUser(resident.username, viewer?.id) : null,
    wants('guestbook') ? getGuestbookForUser(resident.username) : null,
    wants('images') ? getPhotosForUser(resident.username, 1, 20) : null,
    // <MyHouse /> <HouseBadge /> <RingNav />: the owner's home, read only when the page uses one
    reads === 'all' ? (resident.hasPixelHome ? pageHomeFor(db, ownerId) : null) : pageHomeIfUsed(reads, ownerId, resident.hasPixelHome),
  ]);

  let posts: ResidentData['posts'] = [];
  if (postsData.status === 'fulfilled' && postsData.value) {
    const { postBodyHtml } = await import('@/lib/templates/core/post-body');
    posts = (postsData.value.posts ?? []).map((post: any) => ({
      id: post.id || '',
      // Its title is its link to its own page, and its comments are counted
      title: post.title ?? null,
      commentCount: post.commentCount ?? 0,
      bodyHtml: postBodyHtml(post),
      createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
    }));
  }
  const images =
    imagesData.status === 'fulfilled' && imagesData.value
      ? (imagesData.value.media ?? []).map((img: any) => ({
          id: img.id || '',
          url: img.fullUrl || img.url || '',
          alt: img.title || img.alt || '',
          caption: img.caption || '',
          createdAt: img.createdAt ? new Date(img.createdAt).toISOString() : new Date().toISOString(),
        }))
      : [];
  const guestbook =
    guestbookData.status === 'fulfilled' && guestbookData.value
      ? (guestbookData.value.entries ?? []).map((entry: any) => ({
          id: entry.id || '',
          message: entry.message || '',
          authorUsername: entry.authorUsername || null,
          createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString(),
        }))
      : [];

  const data: ResidentData = {
    owner: ownerOf(resident),
    viewer: {
      id: viewer?.id ?? null,
      isFriend: isFollowing && isFollower,
      isFollowing,
      isFollower,
      blockedOwner: postsData.status === 'fulfilled' && postsData.value?.blocked === true,
    },
    posts,
    guestbook,
    images,
    capabilities: { bio: resident.profile?.bio || '' },
    featuredFriends: featuredFriendsOf(resident.profile),
    websites: websitesOf(resident.profile),
    cssRenderMode: mapProfileCSSModeToComponentMode(resolveCSSMode(resident.profile?.cssMode)),
    // For <ProfileMusic />: the song plays where the page puts it
    ...(profileMidi ? { profileMidi } : {}),
  };
  if (pixelHome.status === 'fulfilled' && pixelHome.value !== undefined) data.pixelHome = pixelHome.value;
  return data;
}
