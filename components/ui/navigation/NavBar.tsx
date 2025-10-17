import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import LoginStatus from "../../features/auth/LoginStatus";
import UserDropdown from "../../features/auth/UserDropdown";
import AuthenticationDropdown from "../../features/auth/AuthenticationDropdown";
import NotificationDropdown from "../feedback/NotificationDropdown";
import { useSiteConfig, SiteConfig } from "@/hooks/useSiteConfig";
import { useNavPages } from "@/hooks/useNavPages";
import { useMe } from "@/hooks/useMe";

// Mobile-specific login status component
function MobileLoginStatus({ onItemClick }: { onItemClick: () => void }) {
  const { me } = useMe();

  if (!me?.loggedIn) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-500 px-3">visitor mode</div>
        <AuthenticationDropdown />
      </div>
    );
  }

  return <UserDropdown isMobile={true} onItemClick={onItemClick} />;
}

// Swipe gesture hook for mobile menu
const useSwipeGesture = (onSwipe: (direction: 'left' | 'right') => void) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

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

interface DropdownMenuProps {
  title: string;
  items: { href: string; label: string }[];
  dropdownKey: string;
  activeDropdown: string | null;
  setActiveDropdown: (key: string | null) => void;
}

function DropdownMenu({ title, items, dropdownKey, activeDropdown, setActiveDropdown }: DropdownMenuProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isOpen = activeDropdown === dropdownKey;

  // Enhanced keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        setActiveDropdown(isOpen ? null : dropdownKey);
        break;
      case 'Escape':
        setActiveDropdown(null);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        if (!isOpen) {
          event.preventDefault();
          setActiveDropdown(dropdownKey);
        }
        break;
    }
  };

  // Enhanced outside click handling
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setActiveDropdown(null);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [setActiveDropdown]);

  // Icon mapping for navigation items
  const getItemIcon = (label: string): string => {
    const iconMap: { [key: string]: string } = {
      // My Space items
      'Bookmarks': '🔖',
      'Feed': '📰',
      'My Pixel Home': '🏠',
      'My Profile': '👤',

      // Explore items
      'Demo Pixel Home': '🎨',
      'All Homes': '🏘️',
      'Recent Activity': '⚡',
      'Directory': '📚',
      'ThreadRings': '💍',
      'The Spool': '🧵',
      'Genealogy': '🌳',
      'Community Index': '📋',
      'Engagement': '💬',
    };
    return iconMap[label] || '•';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium flex items-center gap-1 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-thread-sunset focus:ring-offset-2"
        onClick={() => setActiveDropdown(isOpen ? null : dropdownKey)}
        onMouseEnter={() => setActiveDropdown(dropdownKey)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`${title} menu`}
        id={`dropdown-button-${dropdownKey}`}
      >
        {title}
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
          className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[10000] dropdown-animated"
          role="menu"
          aria-labelledby={`dropdown-button-${dropdownKey}`}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          {items.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset transition-colors focus:outline-none focus:bg-thread-background focus:text-thread-sunset"
              role="menuitem"
              tabIndex={isOpen ? 0 : -1}
              onClick={() => {
                setTimeout(() => setActiveDropdown(null), 50);
              }}
            >
              <span className="text-sm" role="img" aria-hidden="true">
                {getItemIcon(item.label)}
              </span>
              <span>{item.label}</span>
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
  const config = siteConfig || hookConfig;

  // State to track which dropdown is open (only one at a time)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  // State for mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState<string | null>(null);

  // Prevent hydration mismatch by only rendering user-dependent content after hydration
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Add swipe gesture support
  const swipeHandlers = useSwipeGesture((direction) => {
    if (direction === 'left' && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  });
  
  // Organize navigation pages by dropdown
  const topLevelPages = navPages.filter(page => !page.navDropdown);
  const discoveryPages = navPages.filter(page => page.navDropdown === 'discovery');
  const threadRingsPages = navPages.filter(page => page.navDropdown === 'threadrings');
  const helpPages = navPages.filter(page => page.navDropdown === 'help');
  
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

  // Advanced template mode: ZERO styling to avoid conflicts
  const headerClasses = advancedTemplate 
    ? "" // Completely unstyled for advanced templates
    : "site-header border-b border-thread-sage bg-thread-cream px-4 sm:px-6 py-4 sticky top-0 z-[9999] backdrop-blur-sm bg-thread-cream/95 relative";
  
  const navClasses = advancedTemplate
    ? "" // Completely unstyled for advanced templates
    : `site-navigation ${fullWidth ? 'w-full px-2 sm:px-4' : 'mx-auto max-w-5xl'} flex items-center justify-between`;

  return (
    <>
      <header className={headerClasses}>
        <nav className={`${navClasses} mobile-nav-enhanced`}>
          <div className="site-branding flex-shrink-0">
            <h1 className="site-title thread-headline text-xl sm:text-2xl font-bold text-thread-pine">{config.site_name}</h1>
            <span className="site-tagline thread-label hidden sm:inline">{config.site_tagline}</span>
          </div>
          
          {/* Desktop Navigation */}
          <div className="site-nav-container hidden lg:flex items-center gap-8">
            <div className="site-nav-links flex items-center gap-6">
              <Link className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" href="/">Home</Link>
              <Link className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" href="/discover">Discover</Link>

              {/* Explore dropdown - consolidated community and personal features */}
              <DropdownMenu
                title="Explore"
                dropdownKey="explore"
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                items={[
                  // Demo for visitors (top priority)
                  ...(!me?.loggedIn ? [
                    { href: "/home/demo", label: "Demo Pixel Home" }
                  ] : []),
                  // Core community features (always visible)
                  { href: "/neighborhood/explore/all", label: "All Homes" },
                  { href: "/directory", label: "Directory" },
                  { href: "/threadrings", label: "ThreadRings" },
                  { href: "/tr/spool", label: "The Spool" },
                  // Personal features (for logged-in users)
                  ...(me?.loggedIn ? [
                    { href: "/feed", label: "Feed" },
                    { href: "/bookmarks", label: "Bookmarks" },
                    ...(isClient && me?.user?.primaryHandle ? [
                      { href: `/home/${me.user.primaryHandle.split('@')[0]}`, label: "My Pixel Home" },
                      { href: `/resident/${me.user.primaryHandle.split('@')[0]}`, label: "My Profile" }
                    ] : [])
                  ] : []),
                  // Additional features
                  { href: "/neighborhood/explore/recent", label: "Recent Activity" },
                  ...discoveryPages.slice(0, 2).map(page => ({ // Limit to 2 most important
                    href: `/page/${page.slug}`,
                    label: page.title
                  })),
                  ...threadRingsPages.slice(0, 2).map(page => ({ // Limit to 2 most important
                    href: `/page/${page.slug}`,
                    label: page.title
                  }))
                ]}
              />

              {/* Simplified Help dropdown - core resources only */}
              <DropdownMenu
                title="Help"
                dropdownKey="help"
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                items={[
                  { href: "/getting-started", label: "Getting Started" },
                  { href: "/templates", label: "Learn to Customize" },
                  ...(helpPages.length > 0 ? [{ href: `/page/${helpPages[0].slug}`, label: "FAQ" }] : []) // First help page as FAQ
                ]}
              />
            </div>
            <div className="site-nav-actions flex items-center gap-4">
              {isClient && me?.loggedIn && (
                <Link
                  href="/post/new"
                  className="new-post-button"
                >
                  New Post
                </Link>
              )}
              <NotificationDropdown className="nav-link" />
              <div className="site-auth">
                <LoginStatus />
              </div>
            </div>
          </div>
          
          {/* Mobile Navigation Controls */}
          <div className="flex lg:hidden items-center gap-2">
            <NotificationDropdown className="nav-link" />
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
            style={{ maxHeight: 'calc(100vh - 80px)' }}
            role="navigation"
            aria-label="Mobile navigation menu"
            {...swipeHandlers}
          >
          <div className="px-4 py-4 space-y-3">
            {/* Home */}
            <Link
              href="/"
              className="block px-4 py-3 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded focus:outline-none focus:bg-thread-background focus:text-thread-sunset"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Home
            </Link>

            {/* Discover */}
            <Link
              href="/discover"
              className="block px-4 py-3 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded focus:outline-none focus:bg-thread-background focus:text-thread-sunset"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Discover
            </Link>

            {/* Explore dropdown - consolidated community and personal features */}
            <div>
              <button
                className="w-full px-3 py-2 text-left text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center justify-between"
                onClick={() => setMobileDropdownOpen(mobileDropdownOpen === 'explore' ? null : 'explore')}
              >
                <span className="flex items-center gap-2">
                  <span>🌍</span>
                  <span>Explore</span>
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${mobileDropdownOpen === 'explore' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mobileDropdownOpen === 'explore' && (
                <div className="ml-6 mt-2 space-y-1">
                  {/* Core community features */}
                  <Link
                    href="/neighborhood/explore/all"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>🏘️</span>
                    <span>All Homes</span>
                  </Link>
                  <Link
                    href="/directory"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>📚</span>
                    <span>Directory</span>
                  </Link>
                  <Link
                    href="/threadrings"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>💍</span>
                    <span>ThreadRings</span>
                  </Link>
                  <Link
                    href="/tr/spool"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>🧵</span>
                    <span>The Spool</span>
                  </Link>

                  {/* Personal features for logged-in users */}
                  {me?.loggedIn && (
                    <>
                      <div className="border-t border-thread-sage my-2 pt-2">
                        <div className="px-3 py-1 text-xs text-thread-sage font-medium">Your Space</div>
                      </div>
                      <Link
                        href="/feed"
                        className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span>📰</span>
                        <span>Feed</span>
                      </Link>
                      <Link
                        href="/bookmarks"
                        className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span>🔖</span>
                        <span>Bookmarks</span>
                      </Link>
                      {isClient && me?.user?.primaryHandle && (
                        <>
                          <Link
                            href={`/home/${me.user.primaryHandle.split('@')[0]}`}
                            className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <span>🏠</span>
                            <span>My Pixel Home</span>
                          </Link>
                          <Link
                            href={`/resident/${me.user.primaryHandle.split('@')[0]}`}
                            className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <span>👤</span>
                            <span>My Profile</span>
                          </Link>
                        </>
                      )}
                    </>
                  )}

                  {/* Additional features - limited to most important */}
                  <Link
                    href="/neighborhood/explore/recent"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>⚡</span>
                    <span>Recent Activity</span>
                  </Link>
                </div>
              )}
            </div>
            
            {/* Simplified Help dropdown - core resources only */}
            <div>
              <button
                className="w-full px-3 py-2 text-left text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center justify-between"
                onClick={() => setMobileDropdownOpen(mobileDropdownOpen === 'help' ? null : 'help')}
              >
                <span className="flex items-center gap-2">
                  <span>❓</span>
                  <span>Help</span>
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${mobileDropdownOpen === 'help' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mobileDropdownOpen === 'help' && (
                <div className="ml-6 mt-2 space-y-1">
                  <Link
                    href="/getting-started"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Getting Started</span>
                  </Link>
                  <Link
                    href="/templates"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Learn to customize</span>
                  </Link>
                  {helpPages.length > 0 && (
                    <Link
                      href={`/page/${helpPages[0].slug}`}
                      className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span>📋</span>
                      <span>FAQ</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
            
            {/* User Actions */}
            <div className="border-t border-thread-sage pt-3 mt-3">
              {isClient && me?.loggedIn && (
                <Link
                  href="/post/new"
                  className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  New Post
                </Link>
              )}
              <div className="px-3 py-2">
                <MobileLoginStatus onItemClick={() => setMobileMenuOpen(false)} />
              </div>
            </div>
          </div>
        </div>
        )}
      </header>
    </>
  );
}