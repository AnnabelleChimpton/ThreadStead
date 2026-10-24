/**
 * A resident's profile as one viewer may see it: the profile API's answer,
 * and what the profile page's getServerSideProps renders from, in one read.
 * The page used to fetch the API over HTTP and parse it back, looking the
 * session up again each time and, for the owner, pulling their whole row
 * (source, CSS, the compiled AST) through it.
 */
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/config/database/connection';
import { SITE_NAME } from '@/lib/config/site/constants';
import { hasPixelHome, residentAccess, type HiddenVisibility } from '@/lib/domain/users/profile-access';
import { publicWidgetSlot, type PublicWidgetSlot } from '@/lib/domain/profile/widget-slot/compile';
import { verifiedBlueskyHandle } from '@/lib/domain/bluesky/handle-links';
import { residentSiteUrl } from '@/lib/subdomains/host';
import { compileForEditor } from '@/lib/templates/compilation/compile-for-editor';
import { pageForRender, type PageForRender } from '@/lib/templates/rendering/page-tree-server';

/** What anyone allowed to see the profile gets. The CSS is public anyway: every visitor's browser receives it. */
const PUBLIC_PROFILE_SELECT = {
  id: true, userId: true, displayName: true, bio: true, visibility: true, updatedAt: true,
  avatarUrl: true, avatarFullUrl: true, avatarMediumUrl: true, avatarThumbnailUrl: true, bannerUrl: true,
  blogroll: true, featuredFriends: true, badgePreferences: true,
  customCSS: true, templateMode: true, cssMode: true, hideNavigation: true, templateCompiledAt: true,
  profileMidiId: true, midiAutoplay: true, midiLoop: true, showTemplateSource: true,
  hiddenTabs: true, status: true,
} satisfies Prisma.ProfileSelect;

export type PublicProfile = Prisma.ProfileGetPayload<{ select: typeof PUBLIC_PROFILE_SELECT }> & {
  /** The page's source: the owner's, and anyone's once they share it (showTemplateSource) */
  customTemplate?: string | null;
};

export interface ProfileMidi {
  url: string;
  title: string;
  /** The owner's credit line ("by …", "arranged from …") */
  credit: string | null;
  autoplay: boolean;
  loop: boolean;
}

export interface ResidentPage {
  did: string;
  userId: string;
  username: string;
  primaryHandle: string | null;
  profile: PublicProfile | null;
  /**
   * A page of their own HTML, as this viewer sees it (pageForRender): only
   * their side of IfOwner / IfVisitor, nothing rendering doesn't read
   */
  page: PageForRender | null;
  profileMidi: ProfileMidi | null;
  /** The compiled widget slot, never its source */
  widgetSlot: PublicWidgetSlot | null;
  hasPixelHome: boolean;
  /** Their address as their Bluesky handle, once plc.directory confirms it */
  blueskyHandle: string | null;
  /** Their own address (https://alice.homepageagain.com/), public profiles only: the page's canonical URL */
  siteUrl: string | null;
  plugins: Array<{ id: string; mode: string; label: undefined }>;
}

export type ResidentLookup =
  | { status: 'not-found' }
  // A block reads as private, so nobody learns they were blocked
  | { status: 'private'; visibility: HiddenVisibility; username: string; displayName: string; avatarUrl: string | null }
  | { status: 'ok'; resident: ResidentPage };

export async function loadResidentPage(username: string, viewer: { id: string; role?: string | null } | null): Promise<ResidentLookup> {
  const handle = await db.handle.findFirst({
    where: { handle: username, host: SITE_NAME },
    select: {
      user: {
        select: {
          id: true, did: true, primaryHandle: true, subdomainLabel: true,
          installs: { where: { enabled: true }, select: { pluginId: true, mode: true } },
          // Read here, never sent as they are: the source, the stored
          // compiled page and the widget slot's picks
          profile: { select: { ...PUBLIC_PROFILE_SELECT, customTemplate: true, compiledTemplate: true, widgetSlot: true } },
        },
      },
    },
  });
  if (!handle) return { status: 'not-found' };
  const { user } = handle;
  const stored = user.profile;

  // Visibility and blocks (either way), the same rules as the pixel home
  const access = await residentAccess(viewer, user.id, stored?.visibility ?? null);
  // A suspended or banned account is gone, the same as no account
  if (!access.visible && access.suspended) return { status: 'not-found' };
  if (!access.visible) {
    return {
      status: 'private',
      visibility: access.visibility,
      username,
      displayName: stored?.displayName || username,
      avatarUrl: stored?.avatarUrl || null,
    };
  }

  const isOwner = viewer?.id === user.id;
  let profile: PublicProfile | null = null;
  let page: PageForRender | null = null;
  if (stored) {
    const { customTemplate, compiledTemplate, widgetSlot: _slot, ...visible } = stored;
    profile = { ...visible, ...((isOwner || stored.showTemplateSource) && { customTemplate }) };
    if (stored.templateMode === 'advanced') page = await pageFor(compiledTemplate, customTemplate, isOwner);
  }

  const [profileMidi, pixelHome, blueskyHandle] = await Promise.all([
    midiFor(stored),
    // Past the access check above, so the viewer may see the house too
    hasPixelHome(user.id),
    verifiedBlueskyHandle(user.id),
  ]);

  return {
    status: 'ok',
    resident: {
      did: user.did,
      userId: user.id,
      username,
      primaryHandle: user.primaryHandle ?? null,
      profile,
      page,
      profileMidi,
      widgetSlot: publicWidgetSlot(stored?.widgetSlot ?? null),
      hasPixelHome: pixelHome,
      blueskyHandle,
      siteUrl: stored?.visibility === 'public' ? residentSiteUrl(user.subdomainLabel) : null,
      plugins: user.installs.map((install) => ({ id: install.pluginId, mode: install.mode, label: undefined })),
    },
  };
}

/**
 * The page a viewer sees, from its one compiled copy. A page saved before
 * compiled copies were stored is compiled from its source (cached by
 * source), the same compile the editor and a save run.
 */
async function pageFor(compiled: unknown, source: string | null, isOwner: boolean): Promise<PageForRender | null> {
  if (compiled == null && source?.trim()) {
    const result = await compileForEditor(source);
    if (result.ok) compiled = result.compiled;
  }
  return compiled == null ? null : pageForRender(compiled, { isOwner });
}

async function midiFor(profile: { profileMidiId: string | null; midiAutoplay: boolean; midiLoop: boolean } | null): Promise<ProfileMidi | null> {
  if (!profile?.profileMidiId) return null;
  const midi = await db.media.findUnique({
    where: { id: profile.profileMidiId },
    select: { id: true, title: true, caption: true, mediaType: true },
  });
  if (midi?.mediaType !== 'midi') return null;
  return {
    url: `/api/media/serve/${midi.id}`, // Through the proxy, so no CORS
    title: midi.title || 'Background Music',
    credit: midi.caption || null,
    autoplay: profile.midiAutoplay || false,
    loop: profile.midiLoop || false,
  };
}

/** The components that show each of the resident's lists */
const SHOWN_BY: Record<'posts' | 'images' | 'guestbook', readonly string[]> = {
  posts: ['blogposts'],
  images: ['mediagrid', 'imagecarousel'],
  // <Guestbook> loads its own entries
  guestbook: [],
};

/**
 * Whether a page of their own HTML reads one of the resident's lists: a
 * component that shows it, or one that names it (`<Show data="posts">`,
 * `<ForEach var="images">`, an expression). Read only then: every page
 * loaded every list, used or not (60 KB of page data for someone who writes).
 */
export function pageReads(page: Pick<PageForRender, 'islands'>, list: keyof typeof SHOWN_BY): boolean {
  const named = new RegExp(`\\b${list}\\b`);
  return page.islands.some(
    (island) => SHOWN_BY[list].includes(island.component.toLowerCase()) || named.test(JSON.stringify(island.props ?? {}))
  );
}
