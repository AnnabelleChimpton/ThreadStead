import React from "react";
import Layout from "./Layout";
import NavBar from "../navigation/NavBar";
import NavigationPreview from "@/components/features/templates/NavigationPreview";
import { generateOptimizedCSS, type CSSMode, type TemplateMode } from "@/lib/utils/css/layers";
import { useSiteCSS } from "@/hooks/useSiteCSS";

interface ProfileLayoutProps {
  children: React.ReactNode;
  customCSS?: string;
  sidebarContent?: React.ReactNode;
  showSidebar?: boolean;
  hideNavigation?: boolean;
  includeSiteCSS?: boolean;
  templateMode?: TemplateMode;
  cssMode?: CSSMode;
  initialSiteCSS?: string; // Pre-fetched site CSS from SSR to prevent hydration mismatches
  preRenderedCSS?: string; // Pre-rendered complete CSS from SSR to prevent hydration mismatches
}

export default function ProfileLayout({
  children,
  customCSS,
  sidebarContent,
  showSidebar = false,
  hideNavigation = false,
  includeSiteCSS = true,
  templateMode = 'default',
  cssMode = 'inherit',
  initialSiteCSS,
  preRenderedCSS
}: ProfileLayoutProps) {
  // Extract CSS mode from custom CSS if not explicitly provided
  const extractCSSMode = (css: string | undefined): CSSMode => {
    if (!css) return cssMode;
    const modeMatch = css.match(/\/\* CSS_MODE:(\w+) \*\//);
    if (modeMatch && ['inherit', 'override', 'disable'].includes(modeMatch[1])) {
      return modeMatch[1] as CSSMode;
    }
    return cssMode;
  };
  
  const actualCSSMode = extractCSSMode(customCSS);

  const { css: siteWideCSS } = useSiteCSS({
    skipDOMInjection: templateMode === 'advanced', // Advanced templates manage their own CSS
    cssMode: actualCSSMode,
    initialCSS: initialSiteCSS // Pass SSR-fetched CSS to prevent hydration mismatch
  });

  // Use pre-rendered CSS from SSR if available, otherwise generate on client
  // Pre-rendered CSS ensures server/client consistency and prevents hydration mismatches
  // Site CSS should only be included if cssMode allows it (not 'disable') AND includeSiteCSS is true
  const shouldIncludeSiteCSS = includeSiteCSS && actualCSSMode !== 'disable';
  const layeredCSS = preRenderedCSS ?? generateOptimizedCSS({
    cssMode: actualCSSMode,
    templateMode,
    siteWideCSS: shouldIncludeSiteCSS ? siteWideCSS : '',
    userCustomCSS: customCSS || '',
    profileId: 'profile-layout'
  });
  
  // Advanced template mode: DO NOT inject CSS here - ProfileModeRenderer handles it
  if (templateMode === 'advanced') {
    // For Visual Builder (advanced mode), ProfileModeRenderer handles ALL CSS injection
    // ProfileLayout should NOT interfere with advanced template CSS rendering

    // Handle navigation for advanced templates
    if (hideNavigation) {
      // Advanced template with hidden navigation - no CSS injection, no containers
      return (
        <>
          {/* NO CSS injection - ProfileModeRenderer handles it */}
          {/* Completely raw content - no containers, no classes, no styling */}
          {children}
        </>
      );
    } else {
      // Advanced template with navigation shown - minimal navigation only
      return (
        <>
          {/* NO CSS injection - ProfileModeRenderer handles it */}
          {/* Unified navigation with dropdown support */}
          <NavigationPreview />

          {/* Use margin-top (not padding) so absolute children position below navigation */}
          <div style={{ position: 'relative', marginTop: '70px' }}>
            {/* Completely raw content - no containers, no classes, no styling */}
            {children}
          </div>
        </>
      );
    }
  }

  if (hideNavigation) {
    // Check if site CSS is disabled - if so, render without any styling
    if (actualCSSMode === 'disable') {
      return (
        <>
          <style dangerouslySetInnerHTML={{ __html: layeredCSS || '' }} />
          {/* No wrapper styling when CSS is disabled */}
          {children}
        </>
      );
    }
    
    // Render without Layout wrapper when hiding navigation but keeping site CSS (NON-advanced templates only)
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: layeredCSS || '' }} />
        {/* Hide nav/footer but keep responsive structure */}
        <div className="min-h-screen thread-surface flex flex-col">
          <main className="flex-1 mx-auto max-w-5xl px-6 py-8">
            <div className="ts-profile-container" data-component="profile-layout">
              <div className="ts-profile-content-wrapper">
                <div className="ts-profile-main-content">
                  {children}
                </div>
                
                <div 
                  className={`ts-profile-sidebar ${showSidebar ? 'profile-sidebar-visible' : 'profile-sidebar-hidden'}`}
                  data-sidebar-visible={showSidebar}
                >
                  <div className="ts-sidebar-content">
                    {sidebarContent || (
                      <>
                        <h3 className="ts-sidebar-heading">Quick Info</h3>
                        <p className="ts-sidebar-text">
                          This sidebar is available for advanced CSS customization.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: layeredCSS || '' }} />
      <div className="ts-profile-container" data-component="profile-layout">
        <Layout>
          <div className="ts-profile-content-wrapper">
            <div className="ts-profile-main-content">
              {children}
            </div>
            
            <div 
              className={`ts-profile-sidebar ${showSidebar ? 'profile-sidebar-visible' : 'profile-sidebar-hidden'}`}
              data-sidebar-visible={showSidebar}
            >
              <div className="ts-sidebar-content">
                {sidebarContent || (
                  <>
                    <h3 className="ts-sidebar-heading">Quick Info</h3>
                    <p className="ts-sidebar-text">
                      This sidebar is available for advanced CSS customization.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </Layout>
      </div>
    </>
  );
}