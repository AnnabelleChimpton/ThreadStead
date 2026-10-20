// One map of the site, shared by the header, the phone menu, the account
// menus and the footer, so each place has one name and one URL everywhere.
import type { PixelIconName } from "@/components/ui/PixelIcon";

export interface NavLinkItem {
  href: string;
  label: string;
  /** Only shown to signed-in visitors */
  signedInOnly?: boolean;
}

export interface NavSection {
  key: string;
  title: string;
  /** The section's own page. Plain sections link straight here. */
  href: string;
  /** Set for sections that open a menu; the hub is the menu's first item */
  hubLabel?: string;
  items?: NavLinkItem[];
  /** Paths (and everything under them) that light this section up */
  activePrefixes: string[];
  /** Admin-configured custom pages with this navDropdown value join the menu */
  customPagesKey?: string;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    key: "feed",
    title: "Feed",
    href: "/feed",
    activePrefixes: ["/feed", "/discover/feed"],
  },
  {
    key: "neighborhood",
    title: "Neighborhood",
    href: "/neighborhood",
    hubLabel: "The street",
    items: [
      { href: "/neighborhood/residents", label: "Residents" },
      { href: "/neighborhood/random", label: "A random house" },
    ],
    activePrefixes: ["/neighborhood"],
    customPagesKey: "discovery",
  },
  {
    key: "rings",
    title: "Rings",
    href: "/threadrings",
    hubLabel: "All rings",
    items: [
      { href: "/threadrings?tab=mine", label: "My rings", signedInOnly: true },
      { href: "/tr/spool/fork", label: "Start a ring", signedInOnly: true },
    ],
    activePrefixes: ["/threadrings", "/tr"],
    customPagesKey: "threadrings",
  },
  {
    key: "community",
    title: "Community",
    href: "/community",
    activePrefixes: ["/community", "/bulletin", "/chat", "/news"],
  },
  {
    key: "help",
    title: "Help",
    href: "/help",
    hubLabel: "Help home",
    items: [
      { href: "/build/getting-started", label: "Getting started" },
      { href: "/help/faq", label: "FAQ" },
      { href: "/build", label: "Build your page" },
      { href: "/build/showcase", label: "Page showcase" },
      { href: "/help/music-guide", label: "Music guide" },
      { href: "/help/guidelines", label: "Guidelines" },
      { href: "/help/contact", label: "Contact" },
    ],
    activePrefixes: ["/help", "/build", "/discover/faq"],
    customPagesKey: "help",
  },
];

export type CommunityTabKey = "board" | "chat" | "news" | "polls";

/** /community's tabs; each is its own page */
export const COMMUNITY_TABS: { key: CommunityTabKey; href: string; label: string }[] = [
  { key: "board", href: "/community", label: "Board" },
  { key: "chat", href: "/community/chat", label: "Chat" },
  { key: "news", href: "/community/news", label: "News" },
  { key: "polls", href: "/community/polls", label: "Polls" },
];

export type AdminPageKey = "dashboard" | "index" | "decorations";

/** Every admin page lives under /admin; AdminHeader shows them as tabs */
export const ADMIN_PAGES: { key: AdminPageKey; href: string; label: string; title: string }[] = [
  { key: "dashboard", href: "/admin", label: "Dashboard", title: "Dashboard" },
  { key: "index", href: "/admin/indie", label: "Indie Index", title: "Indie Index" },
  { key: "decorations", href: "/admin/decorations", label: "Decorations", title: "Decorations" },
];

export const SEARCH_HREF = "/search";
export const SEARCH_ACTIVE_PREFIXES = ["/search", "/discover/search"];
export const WRITE_HREF = "/post/new";

/** `/a/b?x=1#y` → `/a/b` */
export function pathOnly(asPath: string): string {
  return asPath.split(/[?#]/)[0] || "/";
}

export function pathStartsWith(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function isSectionActive(section: NavSection, path: string): boolean {
  return section.activePrefixes.some((prefix) => pathStartsWith(path, prefix));
}

export function isSearchActive(path: string): boolean {
  return SEARCH_ACTIVE_PREFIXES.some((prefix) => pathStartsWith(path, prefix));
}

export interface AccountMenuItem {
  key: string;
  href: string;
  label: string;
  icon: PixelIconName;
  /** Starts a new group (a divider goes above it) */
  groupStart?: boolean;
}

/** The me▾ menu, in order. Same list on desktop and phone. */
export function accountMenuItems(username: string, isAdmin: boolean): AccountMenuItem[] {
  const items: AccountMenuItem[] = [
    { key: "house", href: `/home/${username}`, label: "My house", icon: "home" },
    { key: "page", href: `/resident/${username}`, label: "My page", icon: "user" },
    { key: "messages", href: "/messages", label: "Messages", icon: "mail" },
    { key: "bookmarks", href: "/bookmarks", label: "Bookmarks", icon: "bookmark" },
    { key: "settings", href: "/settings", label: "Settings", icon: "sliders", groupStart: true },
  ];
  if (isAdmin) {
    items.push({ key: "admin", href: "/admin", label: "Admin", icon: "shield" });
  }
  return items;
}

/** True when `href` (path only) is the page being viewed */
export function isCurrentHref(href: string, path: string): boolean {
  return pathOnly(href) === path;
}

export interface FooterColumn {
  title: string;
  links: NavLinkItem[];
}

/** The footer mirrors the five sections, plus legal. */
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Feed",
    links: [
      { href: "/feed?tab=recent", label: "Recent" },
      { href: "/feed?tab=my-rings", label: "Ring posts" },
      { href: "/feed?tab=trending", label: "Trending" },
    ],
  },
  {
    title: "Neighborhood",
    links: [
      { href: "/neighborhood", label: "The street" },
      { href: "/neighborhood/residents", label: "Residents" },
      { href: "/neighborhood/random", label: "A random house" },
      { href: SEARCH_HREF, label: "Search" },
    ],
  },
  {
    title: "Rings",
    links: [
      { href: "/threadrings", label: "All rings" },
      { href: "/tr/spool/fork", label: "Start a ring" },
      { href: "/threadrings/genealogy", label: "Family tree" },
      { href: "/tr/spool", label: "The Spool" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/community", label: "Board" },
      { href: "/community/chat", label: "Chat" },
      { href: "/community/news", label: "News" },
      { href: "/community/polls", label: "Polls" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/build/getting-started", label: "Getting started" },
      { href: "/help/faq", label: "FAQ" },
      { href: "/build", label: "Build your page" },
      { href: "/help/music-guide", label: "Music guide" },
      { href: "/help/guidelines", label: "Guidelines" },
      { href: "/help/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/help/privacy", label: "Privacy" },
      { href: "/help/terms", label: "Terms" },
    ],
  },
];
