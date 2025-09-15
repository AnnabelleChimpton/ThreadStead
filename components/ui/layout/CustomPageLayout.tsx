import React from "react";
import Link from "next/link";
import NavBar from "../navigation/NavBar";
import { useSiteConfig, SiteConfig } from "@/hooks/useSiteConfig";
import { useIdentitySync } from "@/hooks/useIdentitySync";

interface CustomPageLayoutProps {
  children: React.ReactNode;
  siteConfig?: SiteConfig;
  hideNavbar?: boolean;
}

export default function CustomPageLayout({ children, siteConfig, hideNavbar = false }: CustomPageLayoutProps) {
  const { config: hookConfig } = useSiteConfig();
  const { hasMismatch, fixMismatch } = useIdentitySync();
  const config = siteConfig || hookConfig;

  // Prevent hydration mismatch by only showing identity sync banner after client hydration
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  return (
    <div className="site-layout min-h-screen thread-surface flex flex-col">
      {/* Identity Sync Issue Banner */}
      {isClient && hasMismatch && (
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
      
      {!hideNavbar && <NavBar siteConfig={config} />}

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