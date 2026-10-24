/**
 * The ring page learns the viewer's role from one place, the hub's members
 * list (read signed as them), and keeps membership and manage rights apart:
 *  - a site admin who isn't in a ring can manage it, but isn't shown as its
 *    Host and can still join it;
 *  - joining and leaving update the page in place from the route's answer,
 *    and the members list is read again (the routes clear its cache), so
 *    there's no reload into a stale "Join";
 *  - signed out, joining is a sign-in link back to the ring;
 *  - the page is keyed by ring, so one ring's late answers never land on
 *    the next.
 */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
jest.mock('@/lib/config/database/connection', () => ({ db: {} }));
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }));
jest.mock('@/lib/config/site/dynamic', () => ({ getSiteConfig: jest.fn() }));
jest.mock('@/lib/rings/page-data', () => ({ loadRingForPage: jest.fn() }));
jest.mock('@/lib/rings/sites', () => ({ cameFromSite: jest.fn() }));
jest.mock('@/hooks/useCurrentUser', () => ({ useCurrentUser: jest.fn() }));
const showError = jest.fn();
const showSuccess = jest.fn();
jest.mock('@/contexts/ToastContext', () => ({ useToast: () => ({ showError, showSuccess }) }));
jest.mock('@/contexts/ConfirmContext', () => ({ useConfirm: () => async () => true }));
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn() }));

// Child components are not under test; render nothing (Layout passes children through).
jest.mock('@/components/ui/layout/Layout', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('@/components/core/content/PostItem', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/core/threadring/ThreadRingFeedScope', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/core/threadring/ThreadRingActivePrompt', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/core/threadring/ThreadRing88x31Badge', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ui/feedback/UserQuickView', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ui/feedback/ExternalUserPopup', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/features/rings/StripBuilder', () => ({ __esModule: true, default: () => null }));

import ThreadRingPage from '@/pages/tr/[slug]';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

const VIEWER = { id: 'u-pat', did: 'did:key:pat', role: 'member', primaryHandle: 'pat' };
const ADMIN = { ...VIEWER, id: 'u-admin', role: 'admin', primaryHandle: 'admin' };

function makeRing(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `ring-${slug}`,
    name: `Ring ${slug}`,
    slug,
    description: '',
    joinType: 'open',
    visibility: 'public',
    memberCount: 2,
    postCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    badge: null,
    host: null,
    ...overrides,
  } as any;
}

function membersBody(userId: string, role: string) {
  return {
    members: [{ id: `m-${userId}`, userId, role, joinedAt: '2026-01-01', user: { id: userId, handles: [], profile: null } }],
    isPublicInfo: false,
  };
}

// Every fetch returns a promise the test resolves by hand, keyed by URL.
type Pending = { url: string; resolve: (body: unknown, ok?: boolean) => void };
let pending: Pending[];

function respond(urlPart: string, body: unknown, ok = true) {
  const index = pending.findIndex(p => p.url.includes(urlPart));
  if (index === -1) {
    throw new Error(`No pending fetch for ${urlPart}; pending: ${pending.map(p => p.url).join(', ')}`);
  }
  const [request] = pending.splice(index, 1);
  return act(async () => {
    request.resolve(body, ok);
  });
}

const siteConfig = {} as any;
const manageLink = () => screen.queryByRole('link', { name: /^manage$/i });
const joinButton = () => screen.queryByRole('button', { name: /^join ring/i });
const leaveButton = () => screen.queryByRole('button', { name: /^leave$/i });

beforeEach(() => {
  pending = [];
  jest.clearAllMocks();
  (globalThis as any).fetch = jest.fn((url: string) => new Promise(resolveFetch => {
    pending.push({
      url,
      resolve: (body, ok = true) => resolveFetch({ ok, status: ok ? 200 : 500, json: async () => body }),
    });
  }));
  (useCurrentUser as jest.Mock).mockReturnValue({ user: VIEWER, loading: false, loggedIn: true });
});

describe('ThreadRing page viewer role', () => {
  it('a member sees Write and Leave, and no Manage', async () => {
    render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);
    await respond('/api/threadrings/alpha/members', membersBody(VIEWER.id, 'member'));

    expect(screen.getByText(/You're a member/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /write in this ring/i })).toHaveAttribute('href', '/post/new?threadRing=alpha');
    expect(leaveButton()).toBeInTheDocument();
    expect(manageLink()).not.toBeInTheDocument();
    expect(joinButton()).not.toBeInTheDocument();
  });

  it("the hub's owner is the Host, with Manage, and hands the ring over there rather than leaving", async () => {
    render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);
    await respond('/api/threadrings/alpha/members', membersBody(VIEWER.id, 'curator'));

    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(manageLink()).toHaveAttribute('href', '/tr/alpha/manage');
    expect(leaveButton()).not.toBeInTheDocument();
  });

  it('a moderator, from the members list, gets Manage (people and prompts) and can leave', async () => {
    render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);
    await respond('/api/threadrings/alpha/members', membersBody(VIEWER.id, 'moderator'));

    expect(screen.getByText('Moderator')).toBeInTheDocument();
    expect(screen.getByText(/You're a moderator/)).toBeInTheDocument();
    expect(manageLink()).toHaveAttribute('href', '/tr/alpha/manage');
    expect(leaveButton()).toBeInTheDocument();
  });

  it("an admin who isn't in the ring can manage it, isn't its Host, and can join", async () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ user: ADMIN, loading: false, loggedIn: true });
    render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);
    await respond('/api/threadrings/alpha/members', membersBody('u-someone-else', 'curator'));

    expect(manageLink()).toBeInTheDocument();
    expect(screen.queryByText(/You're a/)).not.toBeInTheDocument();
    expect(joinButton()).toBeInTheDocument();
    expect(leaveButton()).not.toBeInTheDocument();
  });

  it('joining updates the page in place and reads the members again', async () => {
    (csrfFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true, role: 'member', message: "You're in." }) });
    render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);
    await respond('/api/threadrings/alpha/members', membersBody('u-someone-else', 'curator'));

    await act(async () => {
      fireEvent.click(joinButton()!);
    });

    expect(csrfFetch).toHaveBeenCalledWith('/api/threadrings/alpha/join', expect.objectContaining({ method: 'POST' }));
    expect(screen.getByText(/You're a member/)).toBeInTheDocument();
    expect(screen.getByText('3 members')).toBeInTheDocument();
    expect(showSuccess).toHaveBeenCalledWith("You're in.");
    // Read again, now that the route has forgotten the cached list
    expect(pending.some(p => p.url.includes('/api/threadrings/alpha/members'))).toBe(true);
  });

  it("a refused join says why and doesn't pretend", async () => {
    (csrfFetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => { throw new Error('<html>'); } });
    render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);
    await respond('/api/threadrings/alpha/members', membersBody('u-someone-else', 'curator'));

    await act(async () => {
      fireEvent.click(joinButton()!);
    });

    expect(showError).toHaveBeenCalledWith("Couldn't join. Try again in a minute.");
    expect(joinButton()).toBeInTheDocument();
  });

  it('signed out, joining is a sign-in link back to the ring', async () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ user: null, loading: false, loggedIn: false });
    render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);

    expect(joinButton()).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in to join/i })).toHaveAttribute('href', '/login?next=%2Ftr%2Falpha');
  });

  it("a previous ring's late members list never sets the role on the next ring", async () => {
    const { rerender } = render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);
    rerender(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('beta')} />);
    await respond('/api/threadrings/beta/members', membersBody('u-someone-else', 'curator'));

    // Alpha's answer arrives late: the viewer hosts alpha, not beta.
    await respond('/api/threadrings/alpha/members', membersBody(VIEWER.id, 'curator'));

    expect(manageLink()).not.toBeInTheDocument();
    expect(joinButton()).toBeInTheDocument();
  });
});
