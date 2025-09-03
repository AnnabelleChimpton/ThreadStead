import React from "react";
import Layout from "../Layout";
import NavBar from "../NavBar";
import MinimalNavBar from "../MinimalNavBar";
import { generateOptimizedCSS, type CSSMode, type TemplateMode } from "@/lib/css-layers";
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
}

export default function ProfileLayout({ 
  children, 
  customCSS, 
  sidebarContent,
  showSidebar = false,
  hideNavigation = false,
  includeSiteCSS = true,
  templateMode = 'default',
  cssMode = 'inherit'
}: ProfileLayoutProps) {
  const { css: siteWideCSS } = useSiteCSS();
  
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
  
  // Generate layered CSS instead of direct injection
  const layeredCSS = generateOptimizedCSS({
    cssMode: actualCSSMode,
    templateMode,
    siteWideCSS: includeSiteCSS ? siteWideCSS : '',
    userCustomCSS: customCSS || '',
    profileId: `profile-layout-${Date.now()}`
  });
  
  console.log('🎨 ProfileLayout CSS Debug:', {
    templateMode,
    actualCSSMode,
    hasCustomCSS: !!(customCSS || '').trim(),
    customCSSLength: (customCSS || '').length,
    layeredCSSLength: layeredCSS?.length || 0,
    layeredCSSPreview: layeredCSS?.substring(0, 200) + '...'
  });
  // Advanced template mode: ONLY USER CSS - zero system interference
  if (templateMode === 'advanced') {
    // Clean user CSS - remove any system comments or layer declarations
    const cleanUserCSS = (customCSS || '')
      .replace(/\/\* CSS_MODE:\w+ \*\/\n?/g, '') // Remove mode comments
      .replace(/!important/g, ''); // Remove !important declarations
    
    // Handle navigation for advanced templates
    if (hideNavigation) {
      // Advanced template with hidden navigation - ONLY user CSS
      return (
        <>
          {/* ONLY raw user CSS - no layers, no system CSS, no processing */}
          {cleanUserCSS && <style dangerouslySetInnerHTML={{ __html: cleanUserCSS }} />}
          
          {/* Completely raw content - no containers, no classes, no styling */}
          {children}
        </>
      );
    } else {
      // Advanced template with navigation shown - minimal navigation + user CSS only
      return (
        <>
          {/* ONLY raw user CSS - no layers, no system CSS, no processing */}
          {cleanUserCSS && <style dangerouslySetInnerHTML={{ __html: cleanUserCSS }} />}
          
          {/* Completely unstyled minimal navigation */}
          <MinimalNavBar />
          
          {/* Completely raw content - no containers, no classes, no styling */}
          {children}
        </>
      );
    }
  }

  if (hideNavigation) {
    // Check if site CSS is disabled - if so, render without any styling
    if (actualCSSMode === 'disable') {
      return (
        <>
          {layeredCSS && <style dangerouslySetInnerHTML={{ __html: layeredCSS }} />}
          {/* No wrapper styling when CSS is disabled */}
          {children}
        </>
      );
    }
    
    // Render without Layout wrapper when hiding navigation but keeping site CSS (NON-advanced templates only)
    return (
      <>
        {layeredCSS && <style dangerouslySetInnerHTML={{ __html: layeredCSS }} />}
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
      {layeredCSS && <style dangerouslySetInnerHTML={{ __html: layeredCSS }} />}
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