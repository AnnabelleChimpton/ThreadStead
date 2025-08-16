import React from "react";
import Link from "next/link";
import LoginStatus from "./LoginStatus";
import NotificationDropdown from "./NotificationDropdown";
import { useSiteConfig, SiteConfig } from "@/hooks/useSiteConfig";
import { useNavPages } from "@/hooks/useNavPages";
import { useIdentitySync } from "@/hooks/useIdentitySync";

interface CustomPageLayoutProps {
  children: React.ReactNode;
  siteConfig?: SiteConfig;
}

export default function CustomPageLayout({ children, siteConfig }: CustomPageLayoutProps) {
  const { config: hookConfig } = useSiteConfig();
  const { pages: navPages } = useNavPages();
  const { hasMismatch, fixMismatch } = useIdentitySync();
  const config = siteConfig || hookConfig;
  
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
        <nav className="site-navigation mx-auto max-w-5xl flex items-center justify-between">
          <div className="site-branding">
            <h1 className="site-title thread-headline text-2xl font-bold text-thread-pine">{config.site_name}</h1>
            <span className="site-tagline thread-label">{config.site_tagline}</span>
          </div>
          <div className="site-nav-container flex items-center gap-8">
            <div className="site-nav-links flex items-center gap-6">
              <Link className="nav-link text-thread-pine hover:text-thread-sunset font-medium" href="/">Home</Link>
              <Link className="nav-link text-thread-pine hover:text-thread-sunset font-medium" href="/feed">Feed</Link>
              <Link className="nav-link text-thread-pine hover:text-thread-sunset font-medium" href="/directory">Directory</Link>
              {navPages.map(page => (
                <Link 
                  key={page.id} 
                  className="nav-link text-thread-pine hover:text-thread-sunset font-medium" 
                  href={`/page/${page.slug}`}
                >
                  {page.title}
                </Link>
              ))}
            </div>
            <div className="site-nav-actions flex items-center gap-4">
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

      {/* Custom page content - no constraints */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>

      <footer className="site-footer border-t border-thread-sage bg-thread-cream px-6 py-4 mt-auto">
        <div className="footer-content mx-auto max-w-5xl text-center">
          <span className="footer-tagline thread-label">{config.site_description}</span>
          <p className="footer-copyright text-sm text-thread-sage mt-1">© {new Date().getFullYear()} {config.footer_text}</p>
        </div>
      </footer>
    </div>
  );
}