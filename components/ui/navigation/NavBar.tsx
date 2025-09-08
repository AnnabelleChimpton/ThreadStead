import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import LoginStatus from "../../features/auth/LoginStatus";
import NotificationDropdown from "../feedback/NotificationDropdown";
import { useSiteConfig, SiteConfig } from "@/hooks/useSiteConfig";
import { useNavPages } from "@/hooks/useNavPages";
import { useMe } from "@/hooks/useMe";

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
          className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[10000] dropdown-animated"
          role="menu"
          aria-labelledby={`dropdown-button-${dropdownKey}`}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          {items.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="block px-4 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset transition-colors focus:outline-none focus:bg-thread-background focus:text-thread-sunset"
              role="menuitem"
              tabIndex={isOpen ? 0 : -1}
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
              
              {/* Discovery dropdown - show only if there are items */}
              {(discoveryPages.length > 0 || true) && (
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
              )}
              
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
              
              {/* Help dropdown - always show */}
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
              {me?.loggedIn && (
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
            <Link 
              href="/" 
              className="block px-4 py-3 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded focus:outline-none focus:bg-thread-background focus:text-thread-sunset"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Home
            </Link>
            
            {/* Top level pages */}
            {topLevelPages.map(page => (
              <Link 
                key={page.id}
                href={`/page/${page.slug}`}
                className="block px-4 py-3 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded focus:outline-none focus:bg-thread-background focus:text-thread-sunset"
                onClick={() => setMobileMenuOpen(false)}
                role="menuitem"
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
              {me?.loggedIn && (
                <Link 
                  href="/post/new"
                  className="block px-3 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  New Post
                </Link>
              )}
              <div className="px-3 py-2">
                <LoginStatus />
              </div>
            </div>
          </div>
        </div>
        )}
      </header>
    </>
  );
}