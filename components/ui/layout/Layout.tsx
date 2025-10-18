import React from "react";
import Link from "next/link";
import NavBar from "../navigation/NavBar";
import ScrollToTop from "../feedback/ScrollToTop";
import { useSiteConfig, SiteConfig } from "@/hooks/useSiteConfig";
import { useIdentitySync } from "@/hooks/useIdentitySync";

interface LayoutProps {
  children: React.ReactNode;
  siteConfig?: SiteConfig;
  fullWidth?: boolean;
  advancedTemplate?: boolean;
}

export default function Layout({ children, siteConfig, fullWidth = false, advancedTemplate = false }: LayoutProps) {
  const { config: hookConfig } = useSiteConfig();
  const { hasMismatch, fixMismatch } = useIdentitySync();
  const config = siteConfig || hookConfig;
  
  // Advanced template mode: minimal container, no background conflicts
  if (advancedTemplate) {
    return (
      <div
        className="site-layout min-h-screen flex flex-col"
        style={{ backgroundColor: '#FCFAF7' }}
      >
        {/* Skip to main content for screen readers */}
        <a 
          href="#main-content" 
          className="skip-link"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              document.getElementById('main-content')?.focus();
            }
          }}
        >
          Skip to main content
        </a>

        {/* Identity Sync Issue Banner */}
        {hasMismatch && (
          <div className="bg-amber-100 border-b border-amber-300 px-6 py-2 relative z-[10000]">
            <div className="mx-auto max-w-5xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-amber-600">⚠️</span>
                <span className="text-amber-800">
                  Identity conflict detected. Your browser has keys for a different account than you&apos;re logged in as.
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
                  href="/settings"
                  className="px-3 py-1 text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 rounded"
                >
                  Account Settings
                </Link>
              </div>
            </div>
          </div>
        )}
        
        {/* Navigation - positioned to not interfere with user content */}
        <NavBar siteConfig={config} fullWidth={true} advancedTemplate={true} />

        {/* Spacing after navbar */}
        <div className="py-4"></div>

        {/* Creative header section - users can style this wildly! */}
        <div className="site-creative-header"></div>

        {/* Minimal main container - no constraints */}
        <main 
          id="main-content"
          tabIndex={-1}
          className="site-main flex-1 w-full mobile-content-container"
        >
          {children}
        </main>

        {/* Spacing before footer */}
        <div className="py-4"></div>

        {/* Footer with minimal styling */}
        <footer className="site-footer border-t border-thread-sage bg-thread-cream px-4 sm:px-6 py-8 mt-auto relative z-[9998]">
          <div className="footer-content mx-auto max-w-6xl">
            {/* Sitemap Navigation */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
              {/* Discover Section */}
              <div>
                <h3 className="font-bold text-thread-pine mb-3 text-sm uppercase tracking-wide">Discover</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/discover/search" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      Search
                    </Link>
                  </li>
                  <li>
                    <Link href="/discover/feed" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      Feed
                    </Link>
                  </li>
                  <li>
                    <Link href="/discover/residents" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      Residents
                    </Link>
                  </li>
                  <li>
                    <Link href="/neighborhood/explore/all" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      All Homes
                    </Link>
                  </li>
                  <li>
                    <Link href="/neighborhood/explore/recent" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      Recent Activity
                    </Link>
                  </li>
                  <li>
                    <Link href="/threadrings" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      ThreadRings
                    </Link>
                  </li>
                  <li>
                    <Link href="/tr/spool" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      The Spool
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Build Section */}
              <div>
                <h3 className="font-bold text-thread-pine mb-3 text-sm uppercase tracking-wide">Build</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/build/templates" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      Templates
                    </Link>
                  </li>
                  <li>
                    <Link href="/build/getting-started" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      Getting Started
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Help Section */}
              <div>
                <h3 className="font-bold text-thread-pine mb-3 text-sm uppercase tracking-wide">Help</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/help/faq" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link href="/help/contact" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link href="/help/guidelines" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      Community Guidelines
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal Section */}
              <div>
                <h3 className="font-bold text-thread-pine mb-3 text-sm uppercase tracking-wide">Legal</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/help/privacy" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/help/terms" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* Site Description & Copyright */}
            <div className="border-t border-thread-sage pt-6 text-center">
              <p className="footer-tagline thread-label mb-2">{config.site_description}</p>
              <p className="footer-copyright text-sm text-thread-sage">
                © {new Date().getFullYear()} HomePageAgain — powered by ThreadStead Technologies LLC
              </p>
            </div>
          </div>
        </footer>

        {/* Scroll to Top Button */}
        <ScrollToTop />
      </div>
    );
  }

  // Standard layout mode
  return (
    <div
      className="site-layout min-h-screen thread-surface flex flex-col"
      style={{ backgroundColor: '#FCFAF7' }}
    >
      {/* Skip to main content for screen readers */}
      <a 
        href="#main-content" 
        className="skip-link"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            document.getElementById('main-content')?.focus();
          }
        }}
      >
        Skip to main content
      </a>

      {/* Identity Sync Issue Banner */}
      {hasMismatch && (
        <div className="bg-amber-100 border-b border-amber-300 px-6 py-2">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-amber-600">⚠️</span>
              <span className="text-amber-800">
                Identity conflict detected. Your browser has keys for a different account than you&apos;re logged in as.
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
                href="/settings"
                className="px-3 py-1 text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 rounded"
              >
                Account Settings
              </Link>
            </div>
          </div>
        </div>
      )}
      
      <NavBar siteConfig={config} fullWidth={fullWidth} />

      {/* Spacing after navbar */}
      <div className="py-4"></div>

      {/* Creative header section - users can style this wildly! */}
      <div className="site-creative-header"></div>

      <main 
        id="main-content"
        tabIndex={-1}
        className={`site-main flex-1 ${fullWidth ? 'w-full mobile-content-container' : 'responsive-content mobile-content-spacing'}`}
      >
        {children}
      </main>

      {/* Spacing before footer */}
      <div className="py-4"></div>

      <footer className="site-footer border-t border-thread-sage bg-thread-cream px-4 sm:px-6 py-8 mt-auto">
        <div className="footer-content mx-auto max-w-6xl">
          {/* Sitemap Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
            {/* Discover Section */}
            <div>
              <h3 className="font-bold text-thread-pine mb-3 text-sm uppercase tracking-wide">Discover</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/discover/search" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                    Search
                  </Link>
                </li>
                <li>
                  <Link href="/discover/feed" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                    Feed
                  </Link>
                </li>
                <li>
                  <Link href="/discover/residents" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                    Residents
                  </Link>
                </li>
                <li>
                  <Link href="/neighborhood/explore/all" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                    All Homes
                  </Link>
                </li>
                <li>
                  <Link href="/neighborhood/explore/recent" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                    Recent Activity
                  </Link>
                </li>
                <li>
                  <Link href="/threadrings" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                    ThreadRings
                  </Link>
                </li>
                <li>
                  <Link href="/tr/spool" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                    The Spool
                  </Link>
                </li>
              </ul>
            </div>

            {/* Build Section */}
            <div>
              <h3 className="font-bold text-thread-pine mb-3 text-sm uppercase tracking-wide">Build</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/build/templates" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                    Templates
                  </Link>
                </li>
                <li>
                  <Link href="/build/getting-started" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                    Getting Started
                  </Link>
                </li>
              </ul>
            </div>

            {/* Help Section */}
            <div>
              <h3 className="font-bold text-thread-pine mb-3 text-sm uppercase tracking-wide">Help</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/help/faq" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/help/contact" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/help/guidelines" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                    Community Guidelines
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Section */}
            <div>
              <h3 className="font-bold text-thread-pine mb-3 text-sm uppercase tracking-wide">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/help/privacy" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/help/terms" className="text-sm text-thread-sage hover:text-thread-pine hover:underline">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Site Description & Copyright */}
          <div className="border-t border-thread-sage pt-6 text-center">
            <p className="footer-tagline thread-label mb-2">{config.site_description}</p>
            <p className="footer-copyright text-sm text-thread-sage">
              © {new Date().getFullYear()} HomePageAgain — powered by ThreadStead Technologies LLC
            </p>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}
