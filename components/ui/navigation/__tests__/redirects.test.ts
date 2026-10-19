/**
 * @jest-environment node
 *
 * Every old URL keeps working after the navigation rework (PRODUCT_UX_AUDIT
 * §4), and every link in the header, account menu and footer lands on a page.
 */
import { applyRedirect, loadRedirects, pageFor, resolve } from "./routeTable";
import { ADMIN_PAGES, COMMUNITY_TABS, FOOTER_COLUMNS, NAV_SECTIONS, SEARCH_HREF, WRITE_HREF, accountMenuItems } from "../siteNav";

// One way into profile editing (design/profile-editing-audit PLAN Phase 2).
// The template editor is the HTML editor; ?mode=css means the CSS editor.
const PROFILE_EDITING_URLS: [string, string][] = [
  ["/resident/someone/edit", "/settings"],
  ["/settings/profile", "/settings"],
  ["/resident/someone/template-editor", "/resident/someone/template-editor"],
  ["/resident/someone/template-editor?mode=template", "/resident/someone/template-editor?mode=template"],
  ["/resident/someone/template-editor?mode=css", "/resident/someone/css-editor?mode=css"],
  ["/resident/someone/css-editor", "/resident/someone/css-editor"],
  ["/resident/someone/post/abc123/edit", "/resident/someone/post/abc123/edit"],
];

// [old URL, where it should end up] — the old URL may be served directly
// (destination === old URL) or redirected.
const OLD_URLS: [string, string][] = [
  // Round 1: the feed's real URL is /feed. /discover/feed is served, not
  // redirected, because production cached a permanent /feed → /discover/feed.
  ["/feed", "/feed"],
  ["/feed?tab=trending", "/feed?tab=trending"],
  ["/discover/feed", "/discover/feed"],
  ["/discover/feed?tab=following", "/discover/feed?tab=following"],
  ["/threadrings?tab=mine", "/threadrings?tab=mine"],

  // Round 2: Community is one place with tabs
  ["/community", "/community"],
  ["/bulletin", "/community"],
  ["/chat", "/community/chat"],
  ["/news", "/community/news"],
  ["/news/abc123", "/community/news/abc123"],
  ["/community/polls", "/community/polls"],

  // Round 3: one street at /neighborhood
  ["/neighborhood", "/neighborhood"],
  ["/neighborhood/explore/all", "/neighborhood"],
  ["/neighborhood/explore/recent", "/neighborhood"],
  ["/neighborhood/explore/popular", "/neighborhood"],
  ["/neighborhood/explore/random", "/neighborhood/random"],
  ["/neighborhood/random", "/neighborhood/random"],
  ["/neighborhood/ring/knitting", "/neighborhood/ring/knitting"],
  ["/neighborhood/mutual-friends/someone", "/neighborhood"],
  ["/neighborhood/mutual/someone", "/neighborhood"],
  ["/discover", "/neighborhood"],
  ["/discover?q=moss", "/search?q=moss"],
  ["/discover/residents", "/neighborhood/residents"],

  // Round 4: every admin page under /admin
  ["/admin", "/admin"],
  ["/settings/admin", "/admin"],
  ["/settings?tab=admin", "/admin?tab=admin"],
  ["/settings?tab=profile", "/settings?tab=profile"],
  ["/admin/crawler", "/admin/indie"],
  ["/admin/community-index", "/admin/indie"],
  ["/admin/curated-sites", "/admin/indie"],
  ["/admin/decorations", "/admin/decorations"],

  // Earlier moves that must keep working
  ["/identity", "/settings"],
  ["/directory", "/neighborhood/residents"],
  ["/community-index/discover", "/search?scope=indie"],
  ["/community-index/submit", "/indie"],
  ["/community-index/validate", "/indie"],
  ["/community-index", "/indie"],
  ["/templates", "/build/templates"],
  ["/templates/components", "/build/templates/components"],
  ["/getting-started", "/build/getting-started"],
  ["/design-tutorial", "/build/templates"],
  ["/community-guidelines", "/help/guidelines"],
  ["/privacy", "/help/privacy"],
  ["/terms", "/help/terms"],
  ["/rings/knitting/neighborhood", "/neighborhood/ring/knitting"],
  ["/threadrings/create", "/tr/spool/fork"],
  ["/threadrings/knitting", "/tr/knitting"],
  ["/threadrings/genealogy", "/threadrings/genealogy"],
  ["/explore/homes", "/neighborhood"],
  ["/explore/homes?template=loft_v1", "/neighborhood?template=loft_v1"],

  ...PROFILE_EDITING_URLS,
];

describe("old URLs", () => {
  it.each(OLD_URLS)("%s ends up at %s, which a page serves", async (oldUrl, expected) => {
    const { finalUrl, page } = await resolve(oldUrl);
    expect(finalUrl).toBe(expected);
    expect(page).not.toBeNull();
  });

  it("never sends /feed back to /discover/feed (a browser-cached 308 would loop)", async () => {
    expect(await applyRedirect("/feed")).toBeNull();
    expect(await applyRedirect("/discover/feed")).toBeNull();
  });

  it("never permanently redirects a profile-editing URL (these paths might come back)", async () => {
    for (const [oldUrl] of PROFILE_EDITING_URLS) {
      expect((await applyRedirect(oldUrl))?.permanent ?? false).toBe(false);
    }
  });

  it("has no redirect whose destination is itself redirected", async () => {
    const chained: string[] = [];
    for (const r of await loadRedirects()) {
      if (/[:(]/.test(r.destination)) continue; // parameterised; covered by the cases above
      const next = await applyRedirect(r.destination);
      if (next) chained.push(`${r.source} → ${r.destination} → ${next.destination}`);
    }
    expect(chained).toEqual([]);
  });
});

describe("every nav link lands on a page", () => {
  const hrefs = new Set<string>([SEARCH_HREF, WRITE_HREF]);
  for (const section of NAV_SECTIONS) {
    hrefs.add(section.href);
    section.items?.forEach((item) => hrefs.add(item.href));
  }
  FOOTER_COLUMNS.forEach((column) => column.links.forEach((link) => hrefs.add(link.href)));
  accountMenuItems("someone", true).forEach((item) => hrefs.add(item.href));
  COMMUNITY_TABS.forEach((tab) => hrefs.add(tab.href));
  ADMIN_PAGES.forEach((page) => hrefs.add(page.href));

  it.each([...hrefs])("%s", async (href) => {
    const { page } = await resolve(href);
    expect(page).not.toBeNull();
  });
});

describe("route table helper", () => {
  it("prefers a static page over a dynamic one", () => {
    expect(pageFor("/threadrings/genealogy")).toBe("/threadrings/genealogy");
    expect(pageFor("/tr/spool")).toBe("/tr/[slug]");
  });

  it("finds nothing for a made-up path", () => {
    expect(pageFor("/no-such-place/at-all")).toBeNull();
  });
});
