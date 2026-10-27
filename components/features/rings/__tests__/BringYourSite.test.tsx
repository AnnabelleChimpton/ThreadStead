/**
 * /build/bring-your-site's steps, one per state of the person's site: what
 * shows, what's offered next, and where focus goes when a step finishes.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToastProvider } from '@/contexts/ToastContext';
import BringYourSite, { currentSite } from '../BringYourSite';
import type { SiteRow, SitesData } from '../site-shared';

jest.mock('next/link', () => {
  return function MockLink({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) {
    return <a href={href} className={className}>{children}</a>;
  };
});
jest.mock('@/components/ui/PixelIcon', () => ({
  PixelIcon: ({ name }: { name: string }) => <span data-icon={name} />,
}));
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn() }));
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

function site(overrides: Partial<SiteRow> = {}): SiteRow {
  return {
    id: 's1',
    url: 'https://sam.neocities.org/',
    stripPageUrl: null,
    title: null,
    state: 'pending',
    verifyMethod: null,
    lastCheckedAt: null,
    lastError: null,
    restingSince: null,
    clicksThisMonth: 0,
    stops: [],
    ...overrides,
  };
}

function sitesData(overrides: Partial<SitesData> = {}): SitesData {
  return {
    max: 3,
    metaName: 'homepageagain-verification',
    profileUrl: 'https://homepageagain.com/resident/sam',
    rings: [],
    sites: [],
    ...overrides,
  };
}

/** GET /api/sites answers with each of `answers` in turn (the last one repeats) */
function mockSites(...answers: Array<SitesData | null>) {
  let i = 0;
  global.fetch = jest.fn(async () => {
    const answer = answers[Math.min(i++, answers.length - 1)];
    return answer ? { ok: true, status: 200, json: async () => answer } : { ok: false, status: 500, json: async () => ({}) };
  }) as unknown as typeof fetch;
}

const renderPage = () =>
  render(
    <ToastProvider>
      <BringYourSite username="sam" />
    </ToastProvider>
  );

beforeEach(() => jest.clearAllMocks());

describe('currentSite', () => {
  it('picks a proved site, then a resting one, then the newest still to prove', () => {
    const pending = site({ id: 'p', state: 'pending' });
    const newer = site({ id: 'p2', state: 'pending' });
    const resting = site({ id: 'r', state: 'resting' });
    const verified = site({ id: 'v', state: 'verified' });
    expect(currentSite([pending, resting, verified])?.id).toBe('v');
    expect(currentSite([resting, newer])?.id).toBe('r');
    expect(currentSite([pending, newer])?.id).toBe('p2');
    expect(currentSite([])).toBeNull();
  });
});

describe('BringYourSite', () => {
  it('with no site, asks for the address and keeps the later steps waiting', async () => {
    mockSites(sitesData());
    renderPage();
    expect(await screen.findByLabelText("Your site's address")).toBeInTheDocument();
    expect(screen.getByText(/Once you've added your site/)).toBeInTheDocument();
    expect(screen.queryByText('Bring it in')).not.toBeInTheDocument();
  });

  it('after Add, shows the tag to paste and moves focus to that step', async () => {
    mockSites(sitesData(), sitesData({ sites: [site()] }));
    (csrfFetch as jest.Mock).mockResolvedValue({ ok: true, status: 201, json: async () => ({ site: { id: 's1' } }) });
    renderPage();
    fireEvent.change(await screen.findByLabelText("Your site's address"), { target: { value: 'sam.neocities.org' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('<meta name="homepageagain-verification" content="s1">')).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toHaveTextContent("2. Show me it's yours"));
    expect(screen.getByText(/wrong address\? Remove it in/)).toBeInTheDocument();
  });

  it('waiting to be proved: the tag, the profile link as an alternative, the last check and when', async () => {
    mockSites(sitesData({ sites: [site({ lastError: "I looked at sam.neocities.org and didn't find your tag, link or strip there.", lastCheckedAt: '2026-10-27T10:05:00Z' })] }));
    renderPage();
    expect(await screen.findByRole('button', { name: 'Copy the tag' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy the link' })).toBeInTheDocument();
    expect(screen.getByText(/^Last check, .+: I looked at sam\.neocities\.org/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument();
  });

  it("offers a ring's strip as the proof when they're already in a ring", async () => {
    mockSites(sitesData({ rings: [{ slug: 'cozy-knits', name: 'Cozy Knits' }], sites: [site()] }));
    renderPage();
    expect((await screen.findByText('Cozy Knits')).closest('a')).toHaveAttribute('href', '/tr/cozy-knits?strip=s1#strip');
  });

  it('a resting site goes back to proving, with the reason', async () => {
    mockSites(sitesData({ sites: [site({ state: 'resting', verifyMethod: 'meta' })] }));
    renderPage();
    expect(await screen.findByText(/I couldn't find your tag the last two times I looked/)).toBeInTheDocument();
    expect(screen.queryByText('Bring it in')).not.toBeInTheDocument();
  });

  it('a removed site says why it left its rings', async () => {
    mockSites(sitesData({ sites: [site({ state: 'removed', verifyMethod: 'relme' })] }));
    renderPage();
    expect(await screen.findByText(/I couldn't find your link for a month, so the site left its rings/)).toBeInTheDocument();
  });

  it('after a passing Check, moves focus to the choice', async () => {
    mockSites(sitesData({ sites: [site()] }), sitesData({ sites: [site({ state: 'verified', verifyMethod: 'meta' })] }));
    (csrfFetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Bring it in')).toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toHaveTextContent('What to do with it'));
  });

  it('proved: steps 1–2 fold into one line, and both choices are offered', async () => {
    mockSites(sitesData({ sites: [site({ id: 'a b', state: 'verified', verifyMethod: 'strip' })] }));
    renderPage();
    expect((await screen.findByText('Bring it in')).closest('a')).toHaveAttribute('href', '/resident/sam/template-editor?bring=a%20b');
    expect(screen.getByText(/proved\. Leave the strip where it is/)).toBeInTheDocument();
    expect(screen.queryByText("2. Show me it's yours")).not.toBeInTheDocument();
    expect(screen.getByText('Find a ring').closest('a')).toHaveAttribute('href', '/threadrings');
    expect(screen.getByText('Pick its rings').closest('a')).toHaveAttribute('href', '/settings?tab=sites#site-a b');
  });

  it("proved, in rings: counts them and doesn't send them to find one", async () => {
    mockSites(sitesData({ rings: [{ slug: 'a', name: 'A' }, { slug: 'b', name: 'B' }], sites: [site({ state: 'verified' })] }));
    renderPage();
    expect(await screen.findByText(/You're in 2 rings\./)).toBeInTheDocument();
    expect(screen.queryByText('Find a ring')).not.toBeInTheDocument();
  });

  it("proved, Ring Hub down: says so instead of claiming they're in no rings", async () => {
    mockSites(sitesData({ rings: null, sites: [site({ state: 'verified' })] }));
    renderPage();
    expect(await screen.findByText(/I can't reach your rings right now/)).toBeInTheDocument();
    expect(screen.queryByText('Find a ring')).not.toBeInTheDocument();
  });

  it("says so when the sites can't be loaded", async () => {
    mockSites(null);
    renderPage();
    expect(await screen.findByText("I couldn't load your sites. Try reloading the page.")).toBeInTheDocument();
  });
});
