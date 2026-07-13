import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import LoginStatus from "../../features/auth/LoginStatus";
import UserDropdown from "../../features/auth/UserDropdown";
import AuthenticationDropdown from "../../features/auth/AuthenticationDropdown";
import NotificationDropdown from "../feedback/NotificationDropdown";
import UserAccountBottomSheet from "../../features/auth/UserAccountBottomSheet";
import { useSiteConfig, SiteConfig } from "@/hooks/useSiteConfig";
import { useNavPages } from "@/hooks/useNavPages";
import { useMe } from "@/hooks/useMe";
import { PixelIcon } from "@/components/ui/PixelIcon";

// Mobile-specific login status component
function MobileLoginStatus({ onAccountClick }: { onAccountClick: () => void }) {
  const { me } = useMe();

  if (!me?.loggedIn) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-500 px-3">visitor mode</div>
        <AuthenticationDropdown />
      </div>
    );
  }

  const username = me.user?.primaryHandle?.split("@")[0] || "User";

  return (
    <button
      onClick={onAccountClick}
      className="w-full px-3 py-3 bg-thread-pine text-thread-paper hover:bg-thread-sunset rounded flex items-center justify-between min-h-[48px] font-medium active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-3">
        <PixelIcon name="user" size={20} />
        <div className="text-left">
          <div className="text-xs opacity-75">signed in as</div>
          <div className="font-medium">{username}</div>
        </div>
      </div>
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// Tracks whether the viewport is at the desktop breakpoint (lg: 1024px).
// The full nav (6 items + auth) measures ~1090px and doesn't fit below that,
// so the hamburger persists through tablet widths.
// Must match the lg: classes on site-nav-container / the mobile toggle.
// Returns null before hydration so exactly one branch renders after mount.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

// Swipe gesture hook for mobile menu
const useSwipeGesture = (onSwipe: (direction: 'left' | 'right') => void) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchEndY(null);
    setTouchStart(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || !touchStartY || !touchEndY) return;

    const distanceX = touchStart - touchEnd;
    const distanceY = touchStartY - touchEndY;

    // Only trigger horizontal swipe if horizontal movement is dominant over vertical
    if (Math.abs(distanceX) < Math.abs(distanceY)) return;

    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    if (isLeftSwipe) onSwipe('left');
    if (isRightSwipe) onSwipe('right');
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
};

interface NavBarProps {
  siteConfig?: SiteConfig;
  fullWidth?: boolean;
  advancedTemplate?: boolean;
}

interface NavItem {
  href: string;
  label: string;
}

interface NavSection {
  key: string;
  title: string;
  hubHref: string;
  hubLabel: string;
  items: NavItem[];
  // asPath prefixes that light this section up as active
  activePrefixes: string[];
  // prefixes that belong to another nav item and should NOT count (e.g. the
  // top-level Feed link lives under /discover/*)
  activeExclusions?: string[];
}

const navLinkClass = (active: boolean) =>
  `nav-link nav-link-underline font-medium ${
    active
      ? "text-thread-sunset underline decoration-2 underline-offset-4"
      : "text-thread-pine hover:text-thread-sunset underline hover:no-underline"
  }`;

interface DropdownMenuProps {
  section: NavSection;
  active: boolean;
  activeDropdown: string | null;
  setActiveDropdown: (key: string | null) => void;
}

// Disclosure-style nav menu: the whole item is one button that opens the
// menu on click; the section's hub page is the first menu item.
function DropdownMenu({ section, active, activeDropdown, setActiveDropdown }: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isOpen = activeDropdown === section.key;

  const focusItem = (index: number) => {
    const links = menuRef.current?.querySelectorAll<HTMLAnchorElement>('a[role="menuitem"]');
    if (!links || links.length === 0) return;
    const clamped = ((index % links.length) + links.length) % links.length;
    links[clamped].focus();
  };

  const openAndFocusFirst = () => {
    setActiveDropdown(section.key);
    // Menu renders on next tick
    requestAnimationFrame(() => focusItem(0));
  };

  const handleButtonKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        openAndFocusFirst();
        break;
      case 'Escape':
        setActiveDropdown(null);
        break;
    }
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    const links = Array.from(
      menuRef.current?.querySelectorAll<HTMLAnchorElement>('a[role="menuitem"]') ?? []
    );
    const currentIndex = links.findIndex((link) => link === document.activeElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusItem(currentIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusItem(currentIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        focusItem(links.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        setActiveDropdown(null);
        buttonRef.current?.focus();
        break;
      case 'Tab':
        // Let focus move on naturally, but close the menu behind it
        setActiveDropdown(null);
        break;
    }
  };

  return (
    <div className="relative" data-dropdown-container>
      <button
        ref={buttonRef}
        className={`${navLinkClass(active)} inline-flex items-center gap-1 py-2 focus:outline-none focus:ring-2 focus:ring-thread-sunset focus:ring-offset-2`}
        onClick={() => setActiveDropdown(isOpen ? null : section.key)}
        onKeyDown={handleButtonKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        id={`dropdown-button-${section.key}`}
      >
        {section.title}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-2 w-56 bg-thread-paper rounded-lg shadow-lg border border-thread-sage py-2 z-[10000] dropdown-animated"
          role="menu"
          aria-labelledby={`dropdown-button-${section.key}`}
          onKeyDown={handleMenuKeyDown}
        >
          {/* Hub page first, visually separated from the section's children */}
          <Link
            href={section.hubHref}
            className="flex items-center justify-between gap-3 px-4 py-2 font-medium text-thread-pine hover:bg-thread-background hover:text-thread-sunset transition-colors focus:outline-none focus:bg-thread-background focus:text-thread-sunset border-b border-thread-sage/40 mb-1"
            role="menuitem"
            onClick={() => setActiveDropdown(null)}
          >
            <span>{section.hubLabel}</span>
            <span aria-hidden="true">→</span>
          </Link>
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset transition-colors focus:outline-none focus:bg-thread-background focus:text-thread-sunset"
              role="menuitem"
              onClick={() => setActiveDropdown(null)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NavBar({ siteConfig, fullWidth = false, advancedTemplate = false }: NavBarProps) {
  const { config: hookConfig } = useSiteConfig();
  const { pages: navPages } = useNavPages();
  const { me } = useMe();
  const router = useRouter();
  const config = siteConfig || hookConfig;

  // State to track which dropdown is open (only one at a time)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  // State for mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState<string | null>(null);
  // State for mobile account bottom sheet
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);

  // Prevent hydration mismatch by only rendering user-dependent content after hydration
  const [isClient, setIsClient] = useState(false);

  // Track breakpoint so exactly one NotificationDropdown mounts (avoids duplicate polling)
  const isDesktop = useIsDesktop();

  // Ref to measure nav bar height
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Set CSS variable for nav bar height (for mobile chat positioning)
  useEffect(() => {
    const updateNavHeight = () => {
      if (navRef.current) {
        const height = navRef.current.offsetHeight;
        document.documentElement.style.setProperty('--nav-height', `${height}px`);
      }
    };

    updateNavHeight();
    window.addEventListener('resize', updateNavHeight);
    return () => window.removeEventListener('resize', updateNavHeight);
  }, []);

  // Add swipe gesture support
  const swipeHandlers = useSwipeGesture((direction) => {
    if (direction === 'left' && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  });

  // Admin-configured custom pages (settings/admin → "show in navigation")
  const topLevelPages = navPages.filter(page => !page.navDropdown);
  const discoveryPages = navPages.filter(page => page.navDropdown === 'discovery');
  const threadRingsPages = navPages.filter(page => page.navDropdown === 'threadrings');
  const helpPages = navPages.filter(page => page.navDropdown === 'help');

  const customPageItem = (page: { slug: string; title: string }): NavItem => ({
    href: `/page/${page.slug}`,
    label: page.title,
  });

  const sections: NavSection[] = [
    {
      key: 'discover',
      title: 'Discover',
      hubHref: '/discover',
      hubLabel: 'Discover overview',
      items: [
        { href: '/neighborhood/explore/all', label: 'Neighborhoods' },
        { href: '/explore/homes', label: 'All Homes' },
        { href: '/discover/residents', label: 'Residents' },
        { href: '/discover/search', label: 'Search' },
        ...discoveryPages.map(customPageItem),
      ],
      activePrefixes: ['/discover', '/neighborhood', '/explore'],
      activeExclusions: ['/discover/feed'],
    },
    {
      key: 'threadrings',
      title: 'ThreadRings',
      hubHref: '/threadrings',
      hubLabel: 'Browse Rings',
      items: [
        { href: '/tr/spool', label: 'The Spool' },
        { href: '/threadrings/genealogy', label: 'Genealogy' },
        ...threadRingsPages.map(customPageItem),
      ],
      activePrefixes: ['/threadrings', '/tr'],
    },
    {
      key: 'build',
      title: 'Build',
      hubHref: '/build',
      hubLabel: 'Build overview',
      items: [
        { href: '/build/templates', label: 'Templates' },
        { href: '/build/getting-started', label: 'Getting Started' },
      ],
      activePrefixes: ['/build'],
    },
    {
      key: 'help',
      title: 'Help',
      hubHref: '/help',
      hubLabel: 'Help center',
      items: [
        { href: '/help/faq', label: 'FAQ' },
        { href: '/help/music-guide', label: 'Music Guide' },
        { href: '/help/contact', label: 'Contact' },
        ...helpPages.map(customPageItem),
      ],
      activePrefixes: ['/help'],
    },
  ];

  // Current path without query/hash, for active-state checks
  const currentPath = router.asPath.split(/[?#]/)[0];

  const pathStartsWith = (prefix: string) =>
    currentPath === prefix || currentPath.startsWith(`${prefix}/`);

  const isSectionActive = (section: NavSection) => {
    if (section.activeExclusions?.some(pathStartsWith)) return false;
    return section.activePrefixes.some(pathStartsWith);
  };

  const feedActive = pathStartsWith('/discover/feed');
  const communityActive = pathStartsWith('/community') || pathStartsWith('/bulletin');

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const mobileMenu = document.getElementById('mobile-menu');
      const hamburger = document.getElementById('hamburger-button');

      if (mobileMenuOpen &&
          mobileMenu && !mobileMenu.contains(target) &&
          hamburger && !hamburger.contains(target)) {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [mobileMenuOpen]);

  // Close desktop dropdowns when clicking outside - single handler for all dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!activeDropdown) return; // No dropdown is open

      const target = event.target as HTMLElement;
      // Check if click is inside any dropdown container
      const clickedInsideDropdown = target.closest('[data-dropdown-container]');

      if (!clickedInsideDropdown) {
        setActiveDropdown(null);
      }
    }

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  // Close any open dropdown after navigating
  useEffect(() => {
    setActiveDropdown(null);
    setMobileMenuOpen(false);
    setMobileDropdownOpen(null);
  }, [currentPath]);

  // Advanced template mode: ZERO styling to avoid conflicts
  const headerClasses = advancedTemplate
    ? "" // Completely unstyled for advanced templates
    : "site-header border-b border-thread-sage bg-thread-cream px-4 sm:px-6 py-4 sticky top-0 z-[9999] backdrop-blur-sm bg-thread-cream/95 relative overflow-visible";

  const navClasses = advancedTemplate
    ? "" // Completely unstyled for advanced templates
    : "site-navigation w-full px-2 sm:px-4 flex items-center justify-between"; // Always full-width

  const mobileNavLinkClass = (active: boolean) =>
    `block px-4 py-3 rounded font-medium ${
      active
        ? "bg-thread-background text-thread-sunset"
        : "text-thread-pine hover:bg-thread-background hover:text-thread-sunset"
    }`;

  return (
    <>
      <header ref={navRef} className={headerClasses}>
        <nav className={`${navClasses} mobile-nav-enhanced`}>
          <div className="site-branding flex-shrink-0">
            <Link href="/" className="block hover:opacity-80 transition-opacity" aria-label={`${config.site_name} home`}>
              <div className="flex items-center gap-2">
                <h1 className="site-title thread-headline text-xl sm:text-2xl font-bold text-thread-pine">{config.site_name}</h1>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-thread-cream border border-thread-sage rounded text-thread-sage uppercase shadow-sm">
                  Beta
                </span>
              </div>
              <span className="site-tagline thread-label hidden xl:inline">{config.site_tagline}</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="site-nav-container hidden lg:flex items-center gap-3 lg:gap-4 xl:gap-8 min-w-0">
            <div className="site-nav-links flex items-center gap-3 lg:gap-4 xl:gap-6">
              {/* Feed - the most common destination gets a top-level spot */}
              <Link
                className={navLinkClass(feedActive)}
                href="/discover/feed"
                aria-current={feedActive ? 'page' : undefined}
              >
                Feed
              </Link>

              {/* Community Center link */}
              <Link
                className={navLinkClass(communityActive)}
                href="/community"
                aria-current={communityActive ? 'page' : undefined}
              >
                Community
              </Link>

              {sections.map((section) => (
                <DropdownMenu
                  key={section.key}
                  section={section}
                  active={isSectionActive(section)}
                  activeDropdown={activeDropdown}
                  setActiveDropdown={setActiveDropdown}
                />
              ))}

              {/* Admin-configured top-level custom pages */}
              {topLevelPages.map((page) => (
                <Link
                  key={page.id}
                  className={navLinkClass(pathStartsWith(`/page/${page.slug}`))}
                  href={`/page/${page.slug}`}
                  aria-current={pathStartsWith(`/page/${page.slug}`) ? 'page' : undefined}
                >
                  {page.title}
                </Link>
              ))}
            </div>
            <div className="site-nav-actions flex items-center gap-2 xl:gap-4">
              {!isClient ? (
                // Placeholder keeps layout stable until we know the auth state
                <div className="w-24 h-8" aria-hidden="true" />
              ) : me?.loggedIn ? (
                <>
                  {isDesktop === true && <NotificationDropdown className="nav-link" />}
                  <UserDropdown />
                </>
              ) : (
                <div className="site-auth">
                  <LoginStatus />
                </div>
              )}
            </div>
          </div>

          {/* Mobile Navigation Controls */}
          <div className="flex lg:hidden items-center gap-2">
            {isDesktop === false && <NotificationDropdown className="nav-link" />}
            <button
              id="hamburger-button"
              className="p-3 text-thread-pine hover:text-thread-sunset focus:outline-none focus:ring-2 focus:ring-thread-sunset focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="lg:hidden absolute left-0 right-0 top-full z-[9997] bg-thread-cream border-b border-thread-sage shadow-lg overflow-y-auto mobile-menu-animated"
            style={{
              maxHeight: 'calc(100vh - 64px)',
              WebkitOverflowScrolling: 'touch'
            }}
            role="navigation"
            aria-label="Mobile navigation menu"
            {...swipeHandlers}
          >
          <div className="px-4 py-2 pb-[calc(3rem+env(safe-area-inset-bottom))] space-y-2">
            {/* Common destinations stay one tap away */}
            <Link
              href="/discover/feed"
              className={mobileNavLinkClass(feedActive)}
              aria-current={feedActive ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              Feed
            </Link>

            <Link
              href="/community"
              className={mobileNavLinkClass(communityActive)}
              aria-current={communityActive ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              Community
            </Link>

            <Link
              href="/discover/search"
              className={mobileNavLinkClass(pathStartsWith('/discover/search'))}
              aria-current={pathStartsWith('/discover/search') ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              Search
            </Link>

            {/* Admin-configured top-level custom pages */}
            {topLevelPages.map((page) => (
              <Link
                key={page.id}
                href={`/page/${page.slug}`}
                className={mobileNavLinkClass(pathStartsWith(`/page/${page.slug}`))}
                onClick={() => setMobileMenuOpen(false)}
              >
                {page.title}
              </Link>
            ))}

            {/* Section accordions */}
            {sections.map((section) => (
              <div key={section.key}>
                <button
                  className={`w-full px-3 py-2 text-left rounded flex items-center justify-between font-medium ${
                    isSectionActive(section)
                      ? 'text-thread-sunset'
                      : 'text-thread-pine hover:bg-thread-background hover:text-thread-sunset'
                  }`}
                  onClick={() => setMobileDropdownOpen(mobileDropdownOpen === section.key ? null : section.key)}
                  aria-expanded={mobileDropdownOpen === section.key}
                  aria-controls={`mobile-section-${section.key}`}
                >
                  <span>{section.title}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${mobileDropdownOpen === section.key ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileDropdownOpen === section.key && (
                  <div id={`mobile-section-${section.key}`} className="ml-4 mt-2 space-y-1">
                    <Link
                      href={section.hubHref}
                      className="px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm font-medium block"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {section.hubLabel} →
                    </Link>
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm block"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Login Status */}
            <div className="border-t border-thread-sage pt-3 mt-3">
              <div className="px-3 py-2">
                <MobileLoginStatus
                  onAccountClick={() => {
                    setMobileMenuOpen(false);
                    setAccountSheetOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        )}
      </header>

      {/* Mobile Account Bottom Sheet - Hidden on desktop */}
      <div className="lg:hidden">
        <UserAccountBottomSheet
          isOpen={accountSheetOpen}
          onClose={() => setAccountSheetOpen(false)}
        />
      </div>
    </>
  );
}
