/**
 * The ring page learns the viewer's role from two requests that race:
 *  - the access check (/api/auth/me + /api/threadrings/:slug/ownership), which
 *    says "curator" for admins, ring owners and the local curator, and
 *  - the members list (/api/threadrings/:slug/members), which has the role the
 *    hub records — an owner can be listed as a plain "member", and an admin
 *    may not be listed at all.
 * Whichever lands last used to win, so a curator could lose "Manage Settings"
 * until they reloaded. These tests control when each request resolves.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
jest.mock('@/lib/config/database/connection', () => ({ db: {} }));
jest.mock('@/lib/config/site/dynamic', () => ({ getSiteConfig: jest.fn() }));
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({ getRingHubClient: jest.fn() }));
jest.mock('@/lib/api/ringhub/ringhub-ssr', () => ({ raceHubCall: jest.fn(), HUB_TIMEOUT: 0 }));
jest.mock('@/lib/api/ringhub/ringhub-transformers', () => ({ transformRingDescriptorToThreadRing: jest.fn() }));
jest.mock('@/lib/utils/features/feature-flags', () => ({ featureFlags: { ringhub: () => true } }));
jest.mock('@/hooks/useCurrentUser', () => ({ useCurrentUser: jest.fn() }));
jest.mock('@/hooks/useWelcomeTracking', () => ({ useWelcomeTracking: jest.fn() }));
jest.mock('@/hooks/useWelcomeRingTracking', () => ({
  useWelcomeRingTracking: () => ({ trackCommentCreated: jest.fn() }),
}));
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showError: jest.fn(), showSuccess: jest.fn(), showWarning: jest.fn() }),
}));
jest.mock('@/contexts/ConfirmContext', () => ({ useConfirm: () => jest.fn() }));
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn() }));

// Child components are not under test; render nothing (Layout passes children through).
jest.mock('@/components/ui/layout/Layout', () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock('@/components/core/content/PostItem', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/core/threadring/ThreadRingStats', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/core/threadring/ThreadRingLineage', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/shared/RandomMemberDiscovery', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/core/threadring/ThreadRingFeedScope', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/core/threadring/ThreadRingActivePrompt', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/core/threadring/ThreadRing88x31Badge', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/core/threadring/ThreadRingAboutWidget', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ui/feedback/UserQuickView', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ui/feedback/ExternalUserPopup', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/features/onboarding/WelcomeRingGuide', () => ({ __esModule: true, default: () => null }));

import ThreadRingPage from '@/pages/tr/[slug]';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const VIEWER = { id: 'u-owner', did: 'did:key:owner', role: 'member', primaryHandle: 'owner' };
const ADMIN = { ...VIEWER, id: 'u-admin', role: 'admin', primaryHandle: 'admin' };

function makeRing(slug: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `ring-${slug}`,
    uri: `https://hub.test/rings/${slug}`,
    name: `Ring ${slug}`,
    slug,
    description: '',
    joinType: 'open',
    visibility: 'public',
    memberCount: 2,
    postCount: 0,
    curatorId: 'u-someone-else',
    createdAt: '2026-01-01T00:00:00.000Z',
    curator: null,
    members: [],
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
const settingsButton = () => screen.queryByRole('button', { name: /manage settings/i });

beforeEach(() => {
  pending = [];
  (globalThis as any).fetch = jest.fn((url: string) => new Promise(resolveFetch => {
    pending.push({
      url,
      resolve: (body, ok = true) => resolveFetch({ ok, status: ok ? 200 : 500, json: async () => body }),
    });
  }));
  (useCurrentUser as jest.Mock).mockReturnValue({ user: VIEWER, loading: false, loggedIn: true });
});

describe('ThreadRing page viewer role', () => {
  it('keeps the curator role when the members list lands after the ownership check', async () => {
    render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);

    await respond('/api/auth/me', { loggedIn: true, user: VIEWER });
    await respond('/api/threadrings/alpha/ownership', { isOwner: true, isCurator: false });
    expect(settingsButton()).toBeInTheDocument();

    // The hub lists the owner as a plain member.
    await respond('/api/threadrings/alpha/members', membersBody(VIEWER.id, 'member'));
    expect(settingsButton()).toBeInTheDocument();
  });

  it('keeps the curator role when the members list lands first', async () => {
    render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);

    await respond('/api/threadrings/alpha/members', membersBody(VIEWER.id, 'member'));
    expect(settingsButton()).not.toBeInTheDocument();

    await respond('/api/auth/me', { loggedIn: true, user: VIEWER });
    await respond('/api/threadrings/alpha/ownership', { isOwner: true, isCurator: false });
    expect(settingsButton()).toBeInTheDocument();
  });

  it('keeps an admin as curator when the members list does not include them', async () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ user: ADMIN, loading: false, loggedIn: true });
    render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);

    await respond('/api/auth/me', { loggedIn: true, user: ADMIN });
    expect(settingsButton()).toBeInTheDocument();

    await respond('/api/threadrings/alpha/members', membersBody('u-someone-else', 'curator'));
    expect(settingsButton()).toBeInTheDocument();
  });

  it('keeps the curator role when the current user loads late', async () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ user: null, loading: true, loggedIn: false });
    const { rerender } = render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);

    await respond('/api/threadrings/alpha/members', membersBody(VIEWER.id, 'member'));
    await respond('/api/auth/me', { loggedIn: true, user: VIEWER });
    await respond('/api/threadrings/alpha/ownership', { isOwner: true, isCurator: false });
    expect(settingsButton()).toBeInTheDocument();

    (useCurrentUser as jest.Mock).mockReturnValue({ user: VIEWER, loading: false, loggedIn: true });
    rerender(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);
    expect(settingsButton()).toBeInTheDocument();
  });

  it('shows the moderator role from the members list', async () => {
    render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);

    await respond('/api/auth/me', { loggedIn: true, user: VIEWER });
    await respond('/api/threadrings/alpha/ownership', { isOwner: false, isCurator: false });
    await respond('/api/threadrings/alpha/members', membersBody(VIEWER.id, 'moderator'));

    expect(screen.getByText('Moderator')).toBeInTheDocument();
    expect(settingsButton()).not.toBeInTheDocument();
  });

  it('ignores a previous ring\'s responses after the slug changes mid-flight', async () => {
    const { rerender } = render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);
    await respond('/api/auth/me', { loggedIn: true, user: VIEWER });

    // Navigate to beta while alpha's ownership check and members list are still out.
    rerender(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('beta')} />);
    await respond('/api/auth/me', { loggedIn: true, user: VIEWER });
    await respond('/api/threadrings/beta/ownership', { isOwner: false, isCurator: false });
    await respond('/api/threadrings/beta/members', membersBody('u-someone-else', 'curator'));

    // Alpha's answers arrive late: the viewer owns alpha, not beta.
    await respond('/api/threadrings/alpha/ownership', { isOwner: true, isCurator: false });
    await respond('/api/threadrings/alpha/members', membersBody(VIEWER.id, 'curator'));

    expect(settingsButton()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join ring/i })).toBeInTheDocument();
  });

  it('drops the previous ring\'s curator role as soon as the slug changes', async () => {
    const { rerender } = render(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('alpha')} />);
    await respond('/api/auth/me', { loggedIn: true, user: VIEWER });
    await respond('/api/threadrings/alpha/ownership', { isOwner: true, isCurator: false });
    expect(settingsButton()).toBeInTheDocument();

    rerender(<ThreadRingPage siteConfig={siteConfig} ring={makeRing('beta')} />);
    expect(settingsButton()).not.toBeInTheDocument();
  });
});
