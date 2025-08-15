import React from "react";
import Link from "next/link";
import LoginStatus from "./LoginStatus";
import NotificationDropdown from "./NotificationDropdown";
import { useSiteConfig, SiteConfig } from "@/hooks/useSiteConfig";

interface LayoutProps {
  children: React.ReactNode;
  siteConfig?: SiteConfig;
}

export default function Layout({ children, siteConfig }: LayoutProps) {
  const { config: hookConfig } = useSiteConfig();
  const config = siteConfig || hookConfig;
  return (
    <div className="site-layout min-h-screen thread-surface">
      <header className="site-header border-b border-thread-sage bg-thread-cream px-6 py-4 sticky top-0 z-[9999] backdrop-blur-sm bg-thread-cream/95">
        <nav className="site-navigation mx-auto max-w-5xl flex items-center justify-between">
          <div className="site-branding">
            <h1 className="site-title thread-headline text-2xl font-bold text-thread-pine">{config.site_name}</h1>
            <span className="site-tagline thread-label">{config.site_tagline}</span>
          </div>
          <div className="site-nav-links flex items-center gap-6">
            <Link className="nav-link text-thread-pine hover:text-thread-sunset transition-colors" href="/">Home</Link>
            <Link className="nav-link text-thread-pine hover:text-thread-sunset transition-colors" href="/directory">Directory</Link>
            <NotificationDropdown className="nav-link" />
            <div className="site-auth">
              <LoginStatus />
            </div>
          </div>
        </nav>
      </header>

      {/* Creative header section - users can style this wildly! */}
      <div className="site-creative-header"></div>

      <main className="site-main mx-auto max-w-5xl px-6 py-8">{children}</main>

      <footer className="site-footer border-t border-thread-sage bg-thread-cream px-6 py-4">
        <div className="footer-content mx-auto max-w-5xl text-center">
          <span className="footer-tagline thread-label">{config.site_description}</span>
          <p className="footer-copyright text-sm text-thread-sage mt-1">© {new Date().getFullYear()} {config.footer_text}</p>
        </div>
      </footer>
    </div>
  );
}
