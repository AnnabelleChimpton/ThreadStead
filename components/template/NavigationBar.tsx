import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

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
}

function DropdownMenu({ title, items, dropdownKey, activeDropdown, setActiveDropdown }: DropdownMenuProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isOpen = activeDropdown === dropdownKey;

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="nav-link nav-link-underline text-thread-pine hover:text-thread-sunset font-medium flex items-center gap-1 underline hover:no-underline"
        onClick={() => setActiveDropdown(isOpen ? null : dropdownKey)}
        onMouseEnter={() => setActiveDropdown(dropdownKey)}
      >
        {title}
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[10000]"
          onMouseLeave={() => setActiveDropdown(null)}
        >
          {items.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="block px-4 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset transition-colors"
              onClick={() => {
                setTimeout(() => setActiveDropdown(null), 50);
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface NavigationBarProps {
  className?: string;
  fullWidth?: boolean;
}

export default function NavigationBar({ className = "", fullWidth = false }: NavigationBarProps) {
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

  return (
    <header className={`site-header border-b border-thread-sage bg-thread-cream px-4 sm:px-6 py-4 sticky top-0 z-[9999] backdrop-blur-sm bg-thread-cream/95 relative ${className}`}>
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
            
            {/* Discovery dropdown */}
            <DropdownMenu 
              title="Discovery"
              dropdownKey="discovery"
              activeDropdown={activeDropdown}
              setActiveDropdown={setActiveDropdown}
              items={[
                { href: "/feed", label: "Feed" },
                { href: "/directory", label: "Directory" },
                ...discoveryPages.map(page => ({
                  href: `/page/${page.slug}`,
                  label: page.title
                }))
              ]}
            />
            
            {/* ThreadRings dropdown */}
            <DropdownMenu 
              title="ThreadRings"
              dropdownKey="threadrings"
              activeDropdown={activeDropdown}
              setActiveDropdown={setActiveDropdown}
              items={[
                { href: "/threadrings", label: "ThreadRings" },
                { href: "/tr/spool", label: "The Spool" },
                { href: "/threadrings/genealogy", label: "Genealogy" },
                ...threadRingsPages.map(page => ({
                  href: `/page/${page.slug}`,
                  label: page.title
                }))
              ]}
            />
            
            {/* Help dropdown */}
            <DropdownMenu 
              title="Help"
              dropdownKey="help"
              activeDropdown={activeDropdown}
              setActiveDropdown={setActiveDropdown}
              items={[
                { href: "/getting-started", label: "Getting Started" },
                { href: "/design-tutorial", label: "Design Tutorial" },
                { href: "/design-css-tutorial", label: "Design CSS Tutorial" },
                ...helpPages.map(page => ({
                  href: `/page/${page.slug}`,
                  label: page.title
                }))
              ]}
            />
          </div>
          <div className="site-nav-actions flex items-center gap-4">
            {!isPreviewMode && user.loggedIn && (
              <Link 
                href="/post/new"
                className="new-post-button bg-thread-pine text-white px-3 py-1 rounded hover:bg-thread-sunset transition-colors"
              >
                New Post
              </Link>
            )}
            <div className="site-auth">
              {isPreviewMode ? (
                <div className="flex items-center gap-2 text-sm text-thread-sage">
                  <span className="hidden sm:inline">Preview Mode</span>
                  <div className="w-8 h-8 bg-thread-sage rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">👤</span>
                  </div>
                </div>
              ) : user.loggedIn ? (
                <div className="flex items-center gap-2">
                  <Link href={`/resident/${user.username}`} className="text-thread-pine hover:text-thread-sunset">
                    @{user.username}
                  </Link>
                  <Link href="/logout" className="text-sm text-thread-sage hover:text-thread-sunset">
                    Logout
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
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
          
          {/* Discovery Section */}
          <div>
            <button
              className="w-full px-3 py-2 text-left text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center justify-between"
              onClick={() => setMobileDropdownOpen(mobileDropdownOpen === 'discovery' ? null : 'discovery')}
            >
              <span>Discovery</span>
              <svg 
                className={`w-4 h-4 transition-transform ${mobileDropdownOpen === 'discovery' ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {mobileDropdownOpen === 'discovery' && (
              <div className="ml-6 mt-2 space-y-2">
                <Link 
                  href="/feed" 
                  className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Feed
                </Link>
                <Link 
                  href="/directory" 
                  className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Directory
                </Link>
                {discoveryPages.map(page => (
                  <Link 
                    key={page.id}
                    href={`/page/${page.slug}`}
                    className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {page.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          {/* ThreadRings Section */}
          <div>
            <button
              className="w-full px-3 py-2 text-left text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center justify-between"
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
              <div className="ml-6 mt-2 space-y-2">
                <Link 
                  href="/threadrings" 
                  className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  ThreadRings
                </Link>
                <Link 
                  href="/tr/spool" 
                  className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  The Spool
                </Link>
                <Link 
                  href="/threadrings/genealogy" 
                  className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Genealogy
                </Link>
                {threadRingsPages.map(page => (
                  <Link 
                    key={page.id}
                    href={`/page/${page.slug}`}
                    className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {page.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          {/* Help Section */}
          <div>
            <button
              className="w-full px-3 py-2 text-left text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded flex items-center justify-between"
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
              <div className="ml-6 mt-2 space-y-2">
                <Link 
                  href="/getting-started" 
                  className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Getting Started
                </Link>
                <Link 
                  href="/design-tutorial" 
                  className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Design Tutorial
                </Link>
                <Link 
                  href="/design-css-tutorial" 
                  className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Design CSS Tutorial
                </Link>
                {helpPages.map(page => (
                  <Link 
                    key={page.id}
                    href={`/page/${page.slug}`}
                    className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {page.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          {/* User Actions */}
          <div className="border-t border-thread-sage pt-3 mt-3">
            {!isPreviewMode && user.loggedIn && (
              <Link 
                href="/post/new"
                className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                New Post
              </Link>
            )}
            <div className="px-3 py-2">
              {isPreviewMode ? (
                <div className="text-thread-sage text-sm">
                  Preview Mode
                </div>
              ) : user.loggedIn ? (
                <div className="flex flex-col gap-2">
                  <Link href={`/resident/${user.username}`} className="text-thread-pine hover:text-thread-sunset">
                    @{user.username}
                  </Link>
                  <Link href="/logout" className="text-sm text-thread-sage hover:text-thread-sunset">
                    Logout
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
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
      </div>
      )}
    </header>
  );
}