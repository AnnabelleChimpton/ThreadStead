/**
 * Ring pages are server-rendered, then hydrated in the visitor's browser. The
 * two must produce the same HTML, or React throws a hydration error and
 * re-renders the whole page on the client. Two things made them differ:
 *  - dates formatted with the machine's locale and time zone (a server in
 *    UTC said "10/18/2026", a browser in Los Angeles "10/17/2026"), and
 *  - SITE_NAME read in the browser, where its env var (not NEXT_PUBLIC_)
 *    is unset, so every local member looked like a remote one.
 *
 * Each test renders the page as the server would (en-US, UTC, server env),
 * then hydrates that HTML as a browser would (de-DE, Los Angeles, no
 * server-only env), each with its own fresh copy of the modules.
 */
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
jest.mock('@/lib/config/database/connection', () => ({ db: {} }));
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }));
jest.mock('@/lib/config/site/dynamic', () => ({ getSiteConfig: jest.fn() }));
jest.mock('@/lib/api/ringhub/ringhub-client', () => ({ getRingHubClient: jest.fn() }));
jest.mock('@/lib/api/ringhub/ringhub-ssr', () => ({ raceHubCall: jest.fn(), HUB_TIMEOUT: 0 }));
jest.mock('@/lib/api/ringhub/ring-members', () => ({ readAllRingMembers: jest.fn() }));
jest.mock('@/lib/api/ringhub/ringhub-transformers', () => ({ transformRingDescriptorToThreadRing: jest.fn() }));
jest.mock('@/lib/pixel-homes/house-badge', () => ({ badgeHandlesFor: jest.fn() }));
jest.mock('@/lib/rings/page-data', () => ({ loadRingForPage: jest.fn() }));
jest.mock('@/lib/rings/manage', () => ({}));
jest.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: null, loading: false, loggedIn: false }),
}));
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
jest.mock('@/components/core/threadring/ThreadRingFeedScope', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/core/threadring/ThreadRingActivePrompt', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/core/threadring/ThreadRing88x31Badge', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ui/feedback/UserQuickView', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ui/feedback/ExternalUserPopup', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/features/onboarding/WelcomeRingGuide', () => ({ __esModule: true, default: () => null }));

// 04:31 UTC on Oct 18 is still Oct 17 in Los Angeles.
const LATE_EVENING_IN_LA = '2026-10-18T04:31:43.364Z';
const SITE_HANDLE_DOMAIN = process.env.SITE_HANDLE_DOMAIN;

/**
 * Makes this machine's default locale and time zone `locale` and `timeZone`
 * for every date and number formatted without them. (Jest copies
 * process.env, so setting TZ doesn't reach Node's clock.) Returns an undo.
 */
function machine(locale: string, timeZone: string) {
  const date = Date.prototype as any;
  const methods = ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'] as const;
  const originals = methods.map((name) => date[name]);
  methods.forEach((name, i) => {
    date[name] = function (this: Date, loc?: string, options?: Intl.DateTimeFormatOptions) {
      return originals[i].call(this, loc ?? locale, { timeZone, ...options });
    };
  });
  const numberToLocale = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function (this: number, loc?: string, options?: Intl.NumberFormatOptions) {
    return numberToLocale.call(this, loc ?? locale, options);
  } as any;
  const DateTimeFormat = Intl.DateTimeFormat;
  const withDefaults = (args: any[]) => [args[0] ?? locale, { timeZone, ...args[1] }];
  Intl.DateTimeFormat = new Proxy(DateTimeFormat, {
    construct: (target, args) => new target(...(withDefaults(args) as [])),
    apply: (target, _this, args) => target(...(withDefaults(args) as [])),
  });
  return () => {
    methods.forEach((name, i) => { date[name] = originals[i]; });
    Number.prototype.toLocaleString = numberToLocale;
    Intl.DateTimeFormat = DateTimeFormat;
  };
}

/** Renders `page` with a fresh module registry, as the server or the browser. */
function renderAs(side: 'server', page: string, props: object): string;
function renderAs(side: 'browser', page: string, props: object, html: string): Promise<unknown[]>;
function renderAs(side: 'server' | 'browser', page: string, props: object, html?: string): any {
  let result: any;
  jest.isolateModules(() => {
    const React = require('react');
    const Page = require(page).default;
    const element = React.createElement(Page, props);
    if (side === 'server') {
      result = require('react-dom/server').renderToString(element);
      return;
    }
    const { hydrateRoot } = require('react-dom/client');
    const container = document.createElement('div');
    container.innerHTML = html!;
    document.body.appendChild(container);
    const errors: unknown[] = [];
    // act() returns a thenable that doesn't chain, so wrap it.
    result = Promise.resolve(React.act(async () => {
      hydrateRoot(container, element, { onRecoverableError: (error: unknown) => errors.push(error) });
    })).then(() => errors);
  });
  return result;
}

async function hydrationErrors(page: string, props: object) {
  let undo = machine('en-US', 'UTC');
  const html = renderAs('server', page, props);
  undo();

  // The browser: another locale and time zone, and no server-only env vars.
  undo = machine('de-DE', 'America/Los_Angeles');
  delete process.env.SITE_HANDLE_DOMAIN;
  try {
    return await renderAs('browser', page, props, html);
  } finally {
    undo();
  }
}

const consoleError = console.error;
beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  (globalThis as any).fetch = jest.fn(() => new Promise(() => {}));
});
beforeEach(() => {
  process.env.SITE_HANDLE_DOMAIN = SITE_HANDLE_DOMAIN || 'HomePageAgain';
  // React also logs each mismatch; the errors are collected instead.
  console.error = jest.fn();
});
afterEach(() => {
  console.error = consoleError;
  process.env.SITE_HANDLE_DOMAIN = SITE_HANDLE_DOMAIN;
  document.body.innerHTML = '';
});

function member(name: string, role: 'host' | 'member', external: boolean) {
  return {
    key: external ? `did:web:${name}.example` : `u-${name}`,
    name,
    handle: external ? `@${name}@${name}.example` : `@${name}`,
    profileHref: external ? `https://${name}.example/~${name}` : `/resident/${name}`,
    role,
    joinedAt: LATE_EVENING_IN_LA,
    avatarUrl: null,
    homeHandle: null,
    local: !external,
  };
}

describe('ring pages hydrate without mismatches', () => {
  it('Manage › People', async () => {
    const errors = await hydrationErrors('@/pages/tr/[slug]/manage', {
      kind: 'manage',
      ring: { slug: 'local-test', name: 'Local test', memberCount: 2, badgeImageUrl: null },
      settings: { name: 'Local test', description: '', curatorNote: '', bannerUrl: '', themeColor: null, joinType: 'open', visibility: 'public', postPolicy: 'members' },
      rights: { tabs: ['people', 'prompts'], roles: false, remove: 'members', invite: true, handOver: false, delete: false },
      people: [member('newcomer1', 'host', false), member('visitor', 'member', true)],
      stops: null,
      viewer: { id: 'u-newcomer1', username: 'newcomer1' },
      tab: 'people',
    });
    expect(errors).toEqual([]);
    expect(document.body.textContent).toContain('joined Oct 18, 2026');
    expect(document.body.textContent).toContain("That's you");
  });

  it('ring page', async () => {
    const errors = await hydrationErrors('@/pages/tr/[slug]', {
      siteConfig: {},
      ring: {
        id: 'ring-alpha',
        uri: 'https://hub.test/rings/alpha',
        name: 'Ring alpha',
        slug: 'alpha',
        description: '',
        joinType: 'open',
        visibility: 'public',
        memberCount: 2,
        postCount: 0,
        curatorId: 'u-someone',
        createdAt: LATE_EVENING_IN_LA,
        curator: null,
        members: [],
      },
    });
    expect(errors).toEqual([]);
    expect(document.body.textContent).toContain('Oct 18, 2026');
  });
});
