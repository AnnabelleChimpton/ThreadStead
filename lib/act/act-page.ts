/**
 * What an action page (/act/guestbook/<u>, /act/follow/<u>) needs from the
 * server: whose page it's about, who's signed in, and the way back to that
 * person's own address. The way back is worked out here from their address
 * label, never taken from the request, so the page can't be made to send
 * anyone elsewhere (lib/act/actions.ts).
 */
import type { GetServerSidePropsContext, NextApiRequest } from 'next';
import { db } from '@/lib/config/database/connection';
import { SITE_NAME } from '@/lib/config/site/constants';
import { residentAccess } from '@/lib/domain/users/profile-access';
import { residentSiteUrl } from '@/lib/subdomains/host';

export interface ActPageProps {
  /** The page's owner */
  target: { id: string; username: string; name: string; avatarUrl: string | null };
  /** Who's signed in, or null */
  viewer: { id: string; username: string } | null;
  /** Their own address, or their page here when they have none */
  backUrl: string;
  /** Opened as a pop-up from their address (?via=popup): it finishes on act-done.html there */
  popup: boolean;
  /** The viewer may see the page (not private to them, no block either way) */
  canSee: boolean;
}

export async function loadActPage(context: GetServerSidePropsContext): Promise<{ props: ActPageProps } | { notFound: true }> {
  const username = String(context.params?.username ?? '');
  const handle = username
    ? await db.handle.findFirst({
        where: { handle: username, host: SITE_NAME },
        include: { user: { select: { id: true, subdomainLabel: true, profile: { select: { displayName: true, avatarUrl: true } } } } },
      })
    : null;
  if (!handle) return { notFound: true };

  const { getSessionUser } = await import('@/lib/auth/server');
  const session = await getSessionUser(context.req as NextApiRequest);
  const viewer = session ? { id: session.id, username: session.primaryHandle?.split('@')[0] ?? 'you' } : null;
  const access = await residentAccess(session ? { id: session.id } : null, handle.user.id);

  // Pinned in next.config.ts too; said here so nothing caches who's signed in
  context.res.setHeader('Cache-Control', 'no-store');

  const site = residentSiteUrl(handle.user.subdomainLabel);
  return {
    props: {
      target: {
        id: handle.user.id,
        username: handle.handle,
        name: handle.user.profile?.displayName || handle.handle,
        avatarUrl: handle.user.profile?.avatarUrl ?? null,
      },
      viewer,
      backUrl: site ?? `/resident/${encodeURIComponent(handle.handle)}`,
      popup: context.query.via === 'popup' && !!site,
      canSee: access.visible,
    },
  };
}
