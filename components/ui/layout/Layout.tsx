import React from "react";
import Link from "next/link";
import NavBar from "../navigation/NavBar";
import SiteFooter from "../navigation/SiteFooter";
import ScrollToTop from "../feedback/ScrollToTop";
import { useSiteConfig, SiteConfig } from "@/hooks/useSiteConfig";
import { useIdentitySync } from "@/hooks/useIdentitySync";
import { PixelIcon } from '@/components/ui/PixelIcon';
import LeavingBanner from "@/components/features/account/LeavingBanner";

interface LayoutProps {
  children: React.ReactNode;
  siteConfig?: SiteConfig;
  fullWidth?: boolean;
  advancedTemplate?: boolean;
  homepageLayout?: boolean;
  /** Site chrome right under the nav, e.g. a profile's "Step back outside" */
  afterNav?: React.ReactNode;
  /**
   * A tool that fills the window under the nav (the page editors): the whole
   * width, no footer, and on a laptop the page itself doesn't scroll, its
   * panes do. Phones get the normal flow.
   */
  workspace?: boolean;
}

export default function Layout({ children, siteConfig, fullWidth = false, advancedTemplate = false, homepageLayout = false, afterNav, workspace = false }: LayoutProps) {
  const { config: hookConfig } = useSiteConfig();
  const { hasMismatch, fixMismatch } = useIdentitySync();
  const config = siteConfig || hookConfig;

  // Advanced template mode: minimal container, no background conflicts
  if (advancedTemplate) {
    return (
      <div
        className="site-layout min-h-screen flex flex-col"
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

        <LeavingBanner raised />

        {/* Identity Sync Issue Banner */}
        {hasMismatch && (
          <div className="bg-thread-cream border-b-2 border-thread-sunset px-6 py-2 relative z-[10000]">
            <div className="mx-auto max-w-5xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <PixelIcon name="alert" />
                <span className="text-thread-charcoal">
                  Identity conflict detected. Your browser has keys for a different account than you&apos;re logged in as.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fixMismatch}
                  className="px-3 py-1 text-xs bg-thread-sunset hover:bg-thread-pine text-thread-paper rounded"
                >
                  Fix Now
                </button>
                <Link
                  href="/settings"
                  className="px-3 py-1 text-xs bg-thread-paper hover:bg-thread-background border border-thread-sage text-thread-pine rounded"
                >
                  Account Settings
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Navigation - positioned to not interfere with user content */}
        <NavBar siteConfig={config} fullWidth={true} advancedTemplate={true} />
        {afterNav}

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

        <SiteFooter siteDescription={config.site_description} raised />

        {/* Scroll to Top Button */}
        <ScrollToTop />
      </div>
    );
  }

  // Determine max-width classes based on props
  const maxWidthClass = workspace
    ? 'w-full min-h-0 flex flex-col'
    : homepageLayout
    ? 'w-full max-w-full sm:max-w-[640px] md:max-w-[768px] lg:max-w-[1024px] xl:max-w-7xl 2xl:max-w-screen-2xl mx-auto sm:px-6 md:px-8'
    : fullWidth
      ? 'w-full max-w-full sm:max-w-[640px] md:max-w-[768px] lg:max-w-[1024px] xl:max-w-[1200px] mx-auto sm:px-6 md:px-8'
      : 'responsive-content mobile-content-container';

  // Standard layout mode
  return (
    <div
      className={`site-layout thread-surface flex flex-col ${workspace ? 'min-h-screen lg:min-h-0 lg:h-[100dvh] lg:overflow-hidden' : 'min-h-screen'}`}
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

      <LeavingBanner />

      {/* Identity Sync Issue Banner */}
      {hasMismatch && (
        <div className="bg-thread-cream border-b-2 border-thread-sunset px-6 py-2">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-thread-sunset"><PixelIcon name="alert" size={16} /></span>
              <span className="text-thread-charcoal">
                Identity conflict detected. Your browser has keys for a different account than you&apos;re logged in as.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fixMismatch}
                className="px-3 py-1 text-xs bg-thread-sunset hover:bg-thread-pine text-thread-paper rounded"
              >
                Fix Now
              </button>
              <Link
                href="/settings"
                className="px-3 py-1 text-xs bg-thread-paper hover:bg-thread-background border border-thread-sage text-thread-pine rounded"
              >
                Account Settings
              </Link>
            </div>
          </div>
        </div>
      )}

      <NavBar siteConfig={config} fullWidth={fullWidth || workspace} />
      {afterNav}

      {/* Spacing after navbar */}
      {!workspace && <div className="py-4"></div>}

      {/* Creative header section - users can style this wildly! */}
      <div className="site-creative-header"></div>

      <main
        id="main-content"
        tabIndex={-1}
        className={`site-main flex-1 ${maxWidthClass}`}
      >
        {children}
      </main>

      {!workspace && (
        <>
          {/* Spacing before footer */}
          <div className="py-4"></div>

          <SiteFooter siteDescription={config.site_description} />

          {/* Scroll to Top Button */}
          <ScrollToTop />
        </>
      )}
    </div>
  );
}
