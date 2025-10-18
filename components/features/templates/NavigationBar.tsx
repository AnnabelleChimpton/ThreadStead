import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import UserDropdown from '@/components/features/auth/UserDropdown';
import NotificationDropdown from '@/components/ui/feedback/NotificationDropdown';
import LoginStatus from '@/components/features/auth/LoginStatus';

interface SiteConfig {
  site_name: string;
  site_tagline: string;
}

interface NavPage {
  id: string;
  title: string;
  slug: string;
  navDropdown?: string;
}

interface UserInfo {
  loggedIn: boolean;
  username?: string;
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

  // Icon mapping for navigation items
  const getItemIcon = (label: string): string => {
    const iconMap: { [key: string]: string } = {
      // Discover items
      'Neighborhoods': '🏘️',
      'Search': '🔍',
      'Feed': '📰',
      'Residents': '👥',

      // Build items
      'Templates': '🎨',
      'Getting Started': '🚀',

      // ThreadRings items
      'Browse Rings': '💍',
      'The Spool': '🧵',

      // Help items
      'FAQ': '❓',
      'Contact': '✉️',
    };
    return iconMap[label] || '•';
  };

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
          className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[10000]"
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

import { UniversalCSSProps, separateCSSProps, applyCSSProps, removeTailwindConflicts } from '@/lib/templates/styling/universal-css-props';

interface NavigationBarProps extends UniversalCSSProps {
  className?: string;
  fullWidth?: boolean;
}

export default function NavigationBar(props: NavigationBarProps) {
  const { cssProps, componentProps } = separateCSSProps(props);
  const { className = "", fullWidth = false } = componentProps;
  // Initialize with static data for SSR/compilation
  const [config, setConfig] = useState<SiteConfig>({ 
    site_name: "ThreadStead", 
    site_tagline: "Connect through creativity" 
  });
  const [navPages, setNavPages] = useState<NavPage[]>([]);
  const [user, setUser] = useState<UserInfo>({ loggedIn: false });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(true); // Default to preview mode

  useEffect(() => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        return; // Already initialized with static data
      }

      // Detect if we're in preview mode (shadow DOM or isolated context)
      const previewMode = window.parent !== window || 
                          document.querySelector('#shadow-content') !== null ||
                          window.location.pathname.includes('/preview') ||
                          !window.fetch;

      setIsPreviewMode(previewMode);

      if (previewMode) {
        // Use static mock data for preview - already set in initial state
        return;
      }
    } catch (error) {
      console.error('NavigationBar: Error in preview mode detection:', error);
      // Fallback to preview mode on any error
      setIsPreviewMode(true);
      return;
    }

    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/site-config");
        if (res.ok) {
          const data = await res.json();
          setConfig(data.config || data);
        }
      } catch (error) {
        console.error("Failed to fetch site config:", error);
        // Fallback to static data on error
        setConfig({
          site_name: "ThreadStead",
          site_tagline: "Connect through creativity"
        });
      }
    };

    const fetchNavPages = async () => {
      try {
        const res = await fetch("/api/custom-pages");
        if (res.ok) {
          const data = await res.json();
          const pages = data.pages?.filter((page: any) => page.showInNav) || [];
          setNavPages(pages);
        }
      } catch (error) {
        console.error("Failed to fetch nav pages:", error);
        setNavPages([]);
      }
    };

    const fetchUser = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setUser({ loggedIn: !!data.username, username: data.username });
        }
      } catch (error) {
        console.error("Failed to fetch user info:", error);
        setUser({ loggedIn: false });
      }
    };

    fetchConfig();
    fetchNavPages();
    fetchUser();
  }, []);

  // Organize navigation pages by dropdown
  const topLevelPages = navPages.filter(page => !page.navDropdown);
  const discoveryPages = navPages.filter(page => page.navDropdown === 'discovery');
  const threadRingsPages = navPages.filter(page => page.navDropdown === 'threadrings');
  const helpPages = navPages.filter(page => page.navDropdown === 'help');

  // Close mobile menu when clicking outside
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const mobileMenu = document.getElementById('template-mobile-menu');
      const hamburger = document.getElementById('template-hamburger-button');

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

  const baseClasses = "site-header border-b border-thread-sage bg-thread-cream px-4 sm:px-6 py-4 sticky top-0 z-[9999] backdrop-blur-sm bg-thread-cream/95 relative";
  const filteredClasses = removeTailwindConflicts(baseClasses, cssProps);
  const style = applyCSSProps(cssProps);

  const headerClassName = className
    ? `${filteredClasses} ${className}`
    : filteredClasses;

  return (
    <header className={headerClassName} style={style}>
      <nav className={`site-navigation ${fullWidth ? 'w-full px-2 sm:px-4' : 'mx-auto max-w-5xl'} flex items-center justify-between`}>
        <div className="site-branding flex-shrink-0">
          <Link href="/" className="no-underline">
            <h1 className="site-title thread-headline text-xl sm:text-2xl font-bold text-thread-pine">{config.site_name}</h1>
            <span className="site-tagline thread-label hidden sm:inline">{config.site_tagline}</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <div className="site-nav-container hidden lg:flex items-center gap-8">
          <div className="site-nav-links flex items-center gap-6">
            <Link className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" href="/">Home</Link>
            
            {/* Top level custom pages before dropdowns */}
            {topLevelPages.map(page => (
              <Link
                key={page.id}
                className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline"
                href={`/page/${page.slug}`}
              >
                {page.title}
              </Link>
            ))}

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

            {/* ThreadRings dropdown */}
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

            {/* Help dropdown */}
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
            {isPreviewMode ? (
              <div className="flex items-center gap-2 text-sm text-thread-sage">
                <span className="hidden sm:inline">Preview Mode</span>
                <div className="w-8 h-8 bg-thread-sage rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">👤</span>
                </div>
              </div>
            ) : (
              <>
                {user.loggedIn ? (
                  <>
                    <NotificationDropdown className="nav-link" />
                    <UserDropdown />
                  </>
                ) : (
                  <div className="site-auth">
                    <LoginStatus />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Mobile Navigation Controls */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            id="template-hamburger-button"
            className="p-2 text-thread-pine hover:text-thread-sunset"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          id="template-mobile-menu"
          className="lg:hidden absolute left-0 right-0 top-full z-[9997] bg-thread-cream border-b border-thread-sage shadow-lg max-h-[calc(100vh-73px)] overflow-y-auto"
        >
        <div className="px-4 py-4 space-y-3">
          <Link 
            href="/" 
            className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
            onClick={() => setMobileMenuOpen(false)}
          >
            Home
          </Link>
          
          {/* Top level pages */}
          {topLevelPages.map(page => (
            <Link 
              key={page.id}
              href={`/page/${page.slug}`}
              className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
              onClick={() => setMobileMenuOpen(false)}
            >
              {page.title}
            </Link>
          ))}
          
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
                  className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>🎨</span>
                  <span>Templates</span>
                </Link>
                <Link
                  href="/build/getting-started"
                  className="flex items-center gap-2 px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>🚀</span>
                  <span>Getting Started</span>
                </Link>
              </div>
            )}
          </div>

          {/* ThreadRings Section */}
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
          
          {/* User Actions */}
          <div className="border-t border-thread-sage pt-3 mt-3">
            {isPreviewMode ? (
              <div className="px-3 py-2 text-thread-sage text-sm">
                Preview Mode
              </div>
            ) : user.loggedIn ? (
              <UserDropdown isMobile={true} onItemClick={() => setMobileMenuOpen(false)} />
            ) : (
              <div className="px-3 py-2 flex flex-col gap-2">
                <Link href="/login" className="text-thread-pine hover:text-thread-sunset">
                  Login
                </Link>
                <Link href="/register" className="text-sm text-thread-sage hover:text-thread-sunset">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </header>
  );
}