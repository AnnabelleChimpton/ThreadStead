import React from "react";
import Link from "next/link";
import NavBar from "../navigation/NavBar";
import Breadcrumb from "../navigation/Breadcrumb";
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
      <div className="site-layout min-h-screen flex flex-col">
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

        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mx-auto max-w-5xl px-6 py-2" autoGenerate={true} />

        {/* Creative header section - users can style this wildly! */}
        <div className="site-creative-header"></div>

        {/* Minimal main container - no constraints */}
        <main 
          id="main-content"
          tabIndex={-1}
          className="site-main flex-1 w-full"
        >
          {children}
        </main>

        {/* Footer with minimal styling */}
        <footer className="site-footer border-t border-thread-sage bg-thread-cream px-6 py-4 mt-auto relative z-[9998]">
          <div className="footer-content mx-auto max-w-5xl text-center">
            <span className="footer-tagline thread-label">{config.site_description}</span>
            <p className="footer-copyright text-sm text-thread-sage mt-1">© {new Date().getFullYear()} {config.footer_text}</p>
          </div>
        </footer>
      </div>
    );
  }
  
  // Standard layout mode
  return (
    <div className="site-layout min-h-screen thread-surface flex flex-col">
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

      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mx-auto max-w-5xl px-6 py-2" autoGenerate={true} />

      {/* Creative header section - users can style this wildly! */}
      <div className="site-creative-header"></div>

      <main 
        id="main-content"
        tabIndex={-1}
        className={`site-main flex-1 ${fullWidth ? 'w-full' : 'mx-auto max-w-5xl px-6 py-8'}`}
      >
        {children}
      </main>

      <footer className="site-footer border-t border-thread-sage bg-thread-cream px-6 py-4 mt-auto">
        <div className="footer-content mx-auto max-w-5xl text-center">
          <span className="footer-tagline thread-label">{config.site_description}</span>
          <p className="footer-copyright text-sm text-thread-sage mt-1">© {new Date().getFullYear()} {config.footer_text}</p>
        </div>
      </footer>
    </div>
  );
}
