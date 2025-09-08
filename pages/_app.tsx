import type { AppProps } from "next/app";
import Head from "next/head";
import 'highlight.js/styles/github.css'; // Restore highlight.js for non-profile pages
import "../styles/globals.css"; // Restore global CSS
import { useSiteCSS } from "@/hooks/useSiteCSS";
import { useRouter } from "next/router";
import { useEffect } from "react";

// Import Layout to ensure CSS dependencies are always available
import Layout from "@/components/ui/layout/Layout";

// Import Global Audio Provider
import { GlobalAudioProvider } from "@/contexts/GlobalAudioContext";

// Initialize ThreadRing reconciliation scheduler (server-side only)
import "@/lib/domain/threadrings/reconciliation-bootstrap";

export default function MyApp({ Component, pageProps }: AppProps) {
  const { css, loading } = useSiteCSS();
  const router = useRouter();

  // Ensure Layout component is bundled to include its CSS dependencies
  // This fixes CSS loading issues for dynamically imported components
  useEffect(() => {
    if (typeof Layout === 'function') {
      // Layout component and its dependencies are available
    }
  }, []);

  // Handle browser back/forward navigation to ensure proper page refresh
  useEffect(() => {
    const handleRouteChangeComplete = () => {
      // Check if this was a back/forward navigation using the Navigation API
      if (typeof window !== 'undefined' && window.performance) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation && navigation.type === 'back_forward') {
          // Small delay to ensure the page has loaded before refreshing
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      }
    };

    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [router]);

  // Handle tab routing for pages with tabs
  useEffect(() => {
    const { tab } = router.query;
    if (tab && typeof tab === 'string') {
      // Scroll to tab section or trigger tab activation
      setTimeout(() => {
        const tabElement = document.getElementById(`tab-${tab}`) || 
                          document.querySelector(`[data-tab="${tab}"]`) ||
                          document.querySelector(`.tab-${tab}`);
        
        if (tabElement) {
          tabElement.scrollIntoView({ behavior: 'smooth' });
          // Trigger click if it's a clickable tab
          if (tabElement.tagName === 'BUTTON' || tabElement.onclick) {
            tabElement.click();
          }
        }
      }, 100);
    }
     
    // We intentionally only want to respond to tab and pathname changes, not all query changes
  }, [router.query.tab, router.pathname]);
  
  // Check if we're on a user profile page that might have custom CSS
  const isProfilePage = router.pathname === '/resident/[username]' || router.pathname === '/resident/[username]/index';
  const hasCustomCSS = pageProps.customCSS && pageProps.customCSS.trim() !== '';
  
  // Extract CSS mode from custom CSS to determine if resets are needed
  const extractCSSMode = (css: string | undefined): 'inherit' | 'override' | 'disable' => {
    if (!css) return 'inherit';
    const modeMatch = css.match(/\/\* CSS_MODE:(\w+) \*\//);
    if (modeMatch && ['inherit', 'override', 'disable'].includes(modeMatch[1])) {
      return modeMatch[1] as 'inherit' | 'override' | 'disable';
    }
    // Default based on includeSiteCSS
    return pageProps.includeSiteCSS === false ? 'disable' : 'inherit';
  };
  
  const cssMode = extractCSSMode(pageProps.customCSS);
  const needsCSSResets = isProfilePage && pageProps.templateMode === 'advanced' && cssMode !== 'inherit';
  const includeSiteCSS = pageProps.includeSiteCSS !== false; // Default to true if not specified
  

  return (
    <GlobalAudioProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Only apply targeted CSS resets for advanced templates that need override/disable control */}
        {needsCSSResets && (
          <style dangerouslySetInnerHTML={{
            __html: `
              /* Advanced template mode - complete CSS control */
              /* Only reset classes that advanced templates commonly override */
              
              /* Reset thread module styling for complete control */
              .thread-module.p-6 { padding: unset; }
              .thread-module.mb-6 { margin-bottom: unset; }
              .thread-module.p-0 { padding: unset; }
              
              /* Reset ThreadStead colors for complete control */  
              .bg-thread-cream { background-color: unset; }
              .bg-thread-paper { background-color: unset; }
              .text-thread-pine { color: unset; }
              .text-thread-sage { color: unset; }
              .border-thread-sage { border-color: unset; }
            `
          }} />
        )}
        
        {/* Load site-wide CSS based on page type and user preference */}
        {(!isProfilePage || includeSiteCSS) && (
          <style 
            id="site-wide-css"
            key="site-css"
            dangerouslySetInnerHTML={{ __html: css || '/* Site CSS loading... */' }} 
          />
        )}
        
        {isProfilePage && hasCustomCSS && (
          <style 
            id="profile-page-styles"
            dangerouslySetInnerHTML={{ 
              __html: `/* Profile page - Clean canvas for user customization */
.profile-container {
  margin-top: 0;
  padding-top: 0;
}

${pageProps.templateMode === 'advanced' ? `
/* Advanced Template Mode - CSS Override Helper */
/* Users can target these classes to completely override defaults */

/* Reset global color inheritance for advanced templates */
body, body * {
  color: inherit;
}

/* Make component classes easy to override */
.ts-profile-display-name,
.ts-bio-heading, 
.ts-profile-bio,
.ts-blog-posts,
.ts-blog-posts h3,
.ts-blog-post-content,
.ts-blog-post-meta {
  /* Reduced specificity - user CSS can override easily */
}

/* Helper comment for users */
/*
  TARGET THESE CLASSES IN YOUR <style> SECTION:
  
  .ts-profile-display-name { color: red !important; }
  .ts-bio-heading { color: blue !important; }  
  .ts-profile-bio { color: green !important; }
  .ts-blog-posts { color: purple !important; }
  
  Use !important to override defaults completely.
*/
` : ''}

/* Custom CSS - User or Admin Default */
${pageProps.customCSS}`
            }} 
          />
        )}
      </Head>
      <div className={`min-h-screen font-body ${
        pageProps.templateMode === 'advanced'
          ? '' // No default classes for advanced templates - completely clean
          : 'thread-surface text-thread-charcoal' // Normal styling for everything else
      }`}>
        <Component {...pageProps} />
      </div>
    </GlobalAudioProvider>
  );
}
