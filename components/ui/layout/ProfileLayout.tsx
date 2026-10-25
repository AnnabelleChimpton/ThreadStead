import React, { useContext } from "react";
import Layout from "./Layout";
import AdvancedNavFrame from "@/components/core/profile/AdvancedNavFrame";
import type { CSSMode, TemplateMode } from "@/lib/utils/css/layers";
import { resolveCSSMode } from "@/lib/utils/css/css-mode";
import { useSiteCSS, SiteCssContext } from "@/hooks/useSiteCSS";

interface ProfileLayoutProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  showSidebar?: boolean;
  hideNavigation?: boolean;
  templateMode?: TemplateMode;
  cssMode?: CSSMode;
  /** Site chrome under the nav (or at the very top when the nav is hidden) */
  afterNav?: React.ReactNode;
  /** The page's CSS is a theme (it sets --ts-ink…): styles/theme-parts.css
      gives the site's own parts its colours */
  themed?: boolean;
}

export default function ProfileLayout({
  children,
  sidebarContent,
  showSidebar = false,
  hideNavigation = false,
  templateMode = 'default',
  cssMode = 'inherit',
  afterNav,
  themed = false
}: ProfileLayoutProps) {
  // Shared resolver: the same resolution the profile-page SSR uses, so
  // server and client agree.
  const actualCSSMode = resolveCSSMode(cssMode);

  // Return value unused — the hook still manages #site-wide-css DOM behavior
  // (e.g. clearing it in disable mode) on client-side navigations.
  useSiteCSS({
    skipDOMInjection: templateMode === 'advanced', // Advanced templates manage their own CSS
    cssMode: actualCSSMode,
    // The site's CSS as _app has it (sent once with the page), so it isn't fetched again
    initialCSS: useContext(SiteCssContext)
  });

  // An advanced page whose own HTML is switched off or missing: the standard
  // header and tabs, under the advanced page's nav (its CSS comes from _app)
  if (templateMode === 'advanced') {
    if (hideNavigation) {
      return (
        <>
          {afterNav}
          {children}
        </>
      );
    }
    return (
      <AdvancedNavFrame showNavigation afterNav={afterNav}>
        {children}
      </AdvancedNavFrame>
    );
  }

  return (
    <Layout afterNav={afterNav}>
      {/* Inside Layout, not around it: templates style .ts-profile-container
          as the profile's card (width, border, background), and wrapping
          the site header/footer in it squeezed the nav out of its box. */}
      <div className="ts-profile-container" data-component="profile-layout" data-ts-theme={themed ? '' : undefined}>
        <div className="ts-profile-content-wrapper">
          <div className="ts-profile-main-content">
            {children}
          </div>
          
          <div 
            className={`ts-profile-sidebar ${showSidebar ? 'profile-sidebar-visible' : 'profile-sidebar-hidden'}`}
            data-sidebar-visible={showSidebar}
          >
            <div className="ts-sidebar-content">{sidebarContent}</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}