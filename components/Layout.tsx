import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import LoginStatus from "./LoginStatus";
import NotificationDropdown from "./NotificationDropdown";
import { useSiteConfig, SiteConfig } from "@/hooks/useSiteConfig";
import { useNavPages } from "@/hooks/useNavPages";
import { useIdentitySync } from "@/hooks/useIdentitySync";
import { useMe } from "@/hooks/useMe";
import { featureFlags } from "@/lib/feature-flags";

interface LayoutProps {
  children: React.ReactNode;
  siteConfig?: SiteConfig;
  fullWidth?: boolean;
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setActiveDropdown]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="nav-link text-thread-pine hover:text-thread-sunset font-medium flex items-center gap-1 underline hover:no-underline"
        style={{textDecorationThickness: '1px', textDecorationColor: '#A18463'}}
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
          className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
          onMouseLeave={() => setActiveDropdown(null)}
        >
          {items.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="block px-4 py-2 text-thread-pine hover:bg-thread-background hover:text-thread-sunset transition-colors"
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

export default function Layout({ children, siteConfig, fullWidth = false }: LayoutProps) {
  const { config: hookConfig } = useSiteConfig();
  const { pages: navPages } = useNavPages();
  const { hasMismatch, fixMismatch } = useIdentitySync();
  const { me } = useMe();
  const config = siteConfig || hookConfig;
  
  // State to track which dropdown is open (only one at a time)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // Organize navigation pages by dropdown
  const topLevelPages = navPages.filter(page => !page.navDropdown);
  const discoveryPages = navPages.filter(page => page.navDropdown === 'discovery');
  const helpPages = navPages.filter(page => page.navDropdown === 'help');
  return (
    <div className="site-layout min-h-screen thread-surface flex flex-col">
      {/* Identity Sync Issue Banner */}
      {hasMismatch && (
        <div className="bg-amber-100 border-b border-amber-300 px-6 py-2">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-amber-600">⚠️</span>
              <span className="text-amber-800">
                Identity sync issue detected. Your browser data needs to be refreshed.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fixMismatch}
                className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded"
              >
                Fix Now
              </button>
              <Link
                href="/identity"
                className="px-3 py-1 text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 rounded"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      )}
      
      <header className="site-header border-b border-thread-sage bg-thread-cream px-6 py-4 sticky top-0 z-[9999] backdrop-blur-sm bg-thread-cream/95">
        <nav className={`site-navigation ${fullWidth ? 'w-full px-4' : 'mx-auto max-w-5xl'} flex items-center justify-between`}>
          <div className="site-branding">
            <h1 className="site-title thread-headline text-2xl font-bold text-thread-pine">{config.site_name}</h1>
            <span className="site-tagline thread-label">{config.site_tagline}</span>
          </div>
          <div className="site-nav-container flex items-center gap-8">
            <div className="site-nav-links flex items-center gap-6">
              <Link className="nav-link text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" style={{textDecorationThickness: '1px', textDecorationColor: '#A18463'}} href="/">Home</Link>
              
              {/* Top level custom pages before dropdowns */}
              {topLevelPages.map(page => (
                <Link 
                  key={page.id} 
                  className="nav-link text-thread-pine hover:text-thread-sunset font-medium underline hover:no-underline" 
                  style={{textDecorationThickness: '1px', textDecorationColor: '#A18463'}}
                  href={`/page/${page.slug}`}
                >
                  {page.title}
                </Link>
              ))}
              
              {/* Discovery dropdown - show only if there are items */}
              {(discoveryPages.length > 0 || featureFlags.threadrings(me?.user)) && (
                <DropdownMenu 
                  title="Discovery"
                  dropdownKey="discovery"
                  activeDropdown={activeDropdown}
                  setActiveDropdown={setActiveDropdown}
                  items={[
                    { href: "/feed", label: "Feed" },
                    { href: "/directory", label: "Directory" },
                    ...(featureFlags.threadrings(me?.user) ? [{ href: "/threadrings", label: "ThreadRings" }] : []),
                    ...(featureFlags.threadrings(me?.user) ? [{ href: "/threadrings/spool", label: "The Spool" }] : []),
                    ...discoveryPages.map(page => ({
                      href: `/page/${page.slug}`,
                      label: page.title
                    }))
                  ]}
                />
              )}
              
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
                  className="px-3 py-1.5 text-sm border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
                >
                  ✏️ New Post
                </Link>
              )}
              <NotificationDropdown className="nav-link" />
              <div className="site-auth">
                <LoginStatus />
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Creative header section - users can style this wildly! */}
      <div className="site-creative-header"></div>

      <main className={`site-main flex-1 ${fullWidth ? 'w-full' : 'mx-auto max-w-5xl px-6 py-8'}`}>{children}</main>

      <footer className="site-footer border-t border-thread-sage bg-thread-cream px-6 py-4 mt-auto">
        <div className="footer-content mx-auto max-w-5xl text-center">
          <span className="footer-tagline thread-label">{config.site_description}</span>
          <p className="footer-copyright text-sm text-thread-sage mt-1">© {new Date().getFullYear()} {config.footer_text}</p>
        </div>
      </footer>
    </div>
  );
}
