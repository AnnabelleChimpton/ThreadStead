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
  href: string; // Link to the hub/landing page
}

function DropdownMenu({ title, items, dropdownKey, activeDropdown, setActiveDropdown, href }: DropdownMenuProps) {
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

  // Icon mapping for navigation items
  const getItemIcon = (label: string): string => {
    const iconMap: { [key: string]: string } = {
      // Discover items
      'Neighborhoods': '🏘️',
      'Search': '🔍',
      'Feed': '📰',
      'Residents': '👥',
      'All Homes': '🏘️',
      'Recent Activity': '⚡',
      'Bookmarks': '🔖',
      'Demo Pixel Home': '🎨',
      'My Pixel Home': '🏠',
      'My Profile': '👤',

      // ThreadRings items
      'ThreadRings': '💍',
      'Browse Rings': '💍',
      'All Rings': '💍',
      'The Spool': '🧵',
      'My Rings': '⭐',
      'Create a Ring': '➕',

      // Build items
      'Templates': '🎨',
      'Getting Started': '🚀',

      // Help items
      'FAQ': '❓',
      'Guidelines': '📋',
      'Privacy': '🔒',
      'Terms': '📜',
      'Contact': '✉️',

      // Legacy items
      'Directory': '📚',
      'Genealogy': '🌳',
      'Community Index': '📋',
      'Engagement': '💬',
    };
    return iconMap[label] || '•';
  };

  return (
    <div className="relative" ref={dropdownRef} data-dropdown-container>
      {/* Split button: Link to hub page + dropdown toggle */}
      <div className="flex items-center">
        {/* Left side: Link to hub/landing page */}
        <Link
          href={href}
          className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-thread-sunset focus:ring-offset-2 pr-1"
        >
          {title}
        </Link>

        {/* Right side: Dropdown toggle button */}
        <button
          ref={buttonRef}
          className="text-thread-pine hover:text-thread-sunset focus:outline-none focus:ring-2 focus:ring-thread-sunset focus:ring-offset-2 pl-1 border-l border-thread-sage/30"
          onClick={() => setActiveDropdown(isOpen ? null : dropdownKey)}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={`${title} menu`}
          id={`dropdown-button-${dropdownKey}`}
        >
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
      </div>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[10000] dropdown-animated"
          role="menu"
          aria-labelledby={`dropdown-button-${dropdownKey}`}
        >
          {items.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset transition-colors focus:outline-none focus:bg-thread-background focus:text-thread-sunset"
              role="menuitem"
              tabIndex={isOpen ? 0 : -1}
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

  // Advanced template mode: ZERO styling to avoid conflicts
  const headerClasses = advancedTemplate
    ? "" // Completely unstyled for advanced templates
    : "site-header border-b border-thread-sage bg-thread-cream px-4 sm:px-6 py-4 sticky top-0 z-[9999] backdrop-blur-sm bg-thread-cream/95 relative";

  const navClasses = advancedTemplate
    ? "" // Completely unstyled for advanced templates
    : "site-navigation w-full px-2 sm:px-4 flex items-center justify-between"; // Always full-width

  return (
    <>
      <header className={headerClasses}>
        <nav className={`${navClasses} mobile-nav-enhanced`}>
          <div className="site-branding flex-shrink-0">
            <Link href="/" className="block hover:opacity-80 transition-opacity">
              <div className="flex items-center gap-2">
                <h1 className="site-title thread-headline text-xl sm:text-2xl font-bold text-thread-pine">{config.site_name}</h1>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-thread-cream border border-thread-sage rounded text-thread-sage uppercase shadow-sm">
                  Beta
                </span>
              </div>
              <span className="site-tagline thread-label hidden sm:inline">{config.site_tagline}</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="site-nav-container hidden md:flex items-center gap-8">
            <div className="site-nav-links flex items-center gap-6">
              {/* Home link */}
              <Link
                className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline"
                href="/"
              >
                Home
              </Link>

              {/* Discover dropdown - Neighborhoods as hero */}
              <DropdownMenu
                title="Discover"
                dropdownKey="discover"
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                href="/discover"
                items={[
                  { href: "/neighborhood/explore/all", label: "Neighborhoods" },
                  { href: "/discover/residents", label: "Residents" },
                  { href: "/discover/feed", label: "Feed" },
                  { href: "/discover/search", label: "Search" },
                ]}
              />

              {/* Build dropdown */}
              <DropdownMenu
                title="Build"
                dropdownKey="build"
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                href="/build"
                items={[
                  { href: "/build/templates", label: "Templates" },
                  { href: "/build/getting-started", label: "Getting Started" }
                ]}
              />

              {/* ThreadRings dropdown - STANDOUT FEATURE */}
              <DropdownMenu
                title="ThreadRings"
                dropdownKey="threadrings"
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                href="/threadrings"
                items={[
                  { href: "/threadrings", label: "Browse Rings" },
                  { href: "/tr/spool", label: "The Spool" },
                ]}
              />

              {/* Help dropdown - REDUCED to core items */}
              <DropdownMenu
                title="Help"
                dropdownKey="help"
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                href="/help"
                items={[
                  { href: "/help/faq", label: "FAQ" },
                  { href: "/help/contact", label: "Contact" },
                ]}
              />
            </div>
            <div className="site-nav-actions flex items-center gap-4">
              {isClient && me?.loggedIn ? (
                <>
                  <NotificationDropdown className="nav-link" />
                  <UserDropdown />
                </>
              ) : (
                <>
                  <Link
                    href="/auth/register"
                    className="px-4 py-2 bg-thread-pine text-thread-cream rounded hover:bg-thread-sunset transition-colors font-medium"
                  >
                    Create Profile
                  </Link>
                  <div className="site-auth">
                    <LoginStatus />
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Mobile Navigation Controls */}
          <div className="flex md:hidden items-center gap-2">
            <NotificationDropdown className="nav-link" />
            {!me?.loggedIn && (
              <Link
                href="/auth/register"
                className="px-3 py-1.5 bg-thread-pine text-thread-cream rounded hover:bg-thread-sunset transition-colors font-medium text-sm"
              >
                Create Profile
              </Link>
            )}
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
            className="md:hidden absolute left-0 right-0 top-full z-[9997] bg-thread-cream border-b border-thread-sage shadow-lg overflow-y-auto mobile-menu-animated"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
            role="navigation"
            aria-label="Mobile navigation menu"
            {...swipeHandlers}
          >
          <div className="px-4 py-4 space-y-3">
            {/* Home link */}
            <Link
              href="/"
              className="block px-4 py-3 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>

            {/* Discover Section */}
            <div>
              <button
                className="w-full px-3 py-2 text-left text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center justify-between font-medium"
                onClick={() => setMobileDropdownOpen(mobileDropdownOpen === 'discover' ? null : 'discover')}
              >
                <span>Discover</span>
                <svg
                  className={`w-4 h-4 transition-transform ${mobileDropdownOpen === 'discover' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mobileDropdownOpen === 'discover' && (
                <div className="ml-4 mt-2 space-y-1">
                  <Link
                    href="/neighborhood/explore/all"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>🏘️</span>
                    <span>Neighborhoods</span>
                  </Link>
                  <Link
                    href="/discover/residents"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>👥</span>
                    <span>Residents</span>
                  </Link>
                  <Link
                    href="/discover/feed"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>📰</span>
                    <span>Feed</span>
                  </Link>
                  <Link
                    href="/discover/search"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>🔍</span>
                    <span>Search</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Build Section */}
            <div>
              <button
                className="w-full px-3 py-2 text-left text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center justify-between font-medium"
                onClick={() => setMobileDropdownOpen(mobileDropdownOpen === 'build' ? null : 'build')}
              >
                <span>Build</span>
                <svg
                  className={`w-4 h-4 transition-transform ${mobileDropdownOpen === 'build' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mobileDropdownOpen === 'build' && (
                <div className="ml-4 mt-2 space-y-1">
                  <Link
                    href="/build/templates"
                    className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Templates
                  </Link>
                  <Link
                    href="/build/getting-started"
                    className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Getting Started
                  </Link>
                </div>
              )}
            </div>

            {/* ThreadRings Section - STANDOUT FEATURE */}
            <div>
              <button
                className="w-full px-3 py-2 text-left text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center justify-between font-medium"
                onClick={() => setMobileDropdownOpen(mobileDropdownOpen === 'threadrings' ? null : 'threadrings')}
              >
                <span>ThreadRings</span>
                <svg
                  className={`w-4 h-4 transition-transform ${mobileDropdownOpen === 'threadrings' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mobileDropdownOpen === 'threadrings' && (
                <div className="ml-4 mt-2 space-y-1">
                  <Link
                    href="/threadrings"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>💍</span>
                    <span>Browse Rings</span>
                  </Link>
                  <Link
                    href="/tr/spool"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>🧵</span>
                    <span>The Spool</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Help Section */}
            <div>
              <button
                className="w-full px-3 py-2 text-left text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center justify-between font-medium"
                onClick={() => setMobileDropdownOpen(mobileDropdownOpen === 'help' ? null : 'help')}
              >
                <span>Help</span>
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
                <div className="ml-4 mt-2 space-y-1">
                  <Link
                    href="/help/faq"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>❓</span>
                    <span>FAQ</span>
                  </Link>
                  <Link
                    href="/help/contact"
                    className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>✉️</span>
                    <span>Contact</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Login Status */}
            <div className="border-t border-thread-sage pt-3 mt-3">
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