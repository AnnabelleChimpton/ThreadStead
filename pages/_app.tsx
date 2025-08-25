import type { AppProps } from "next/app";
import Head from "next/head";
import 'highlight.js/styles/github.css'; // Restore highlight.js for non-profile pages
import "../styles/globals.css"; // Restore global CSS
import { useSiteCSS } from "@/hooks/useSiteCSS";
import { useRouter } from "next/router";
import { useEffect } from "react";

// Initialize ThreadRing reconciliation scheduler (server-side only)
import "@/lib/threadring-reconciliation-bootstrap";

export default function MyApp({ Component, pageProps }: AppProps) {
  const { css } = useSiteCSS();
  const router = useRouter();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // We intentionally only want to respond to tab and pathname changes, not all query changes
  }, [router.query.tab, router.pathname]);
  
  // Check if we're on a user profile page that might have custom CSS
  const isProfilePage = router.pathname === '/resident/[username]' || router.pathname === '/resident/[username]/index';
  const hasCustomCSS = pageProps.customCSS && pageProps.customCSS.trim() !== '';
  const needsCSSResets = isProfilePage && (pageProps.templateMode === 'enhanced' || pageProps.templateMode === 'advanced');
  const includeSiteCSS = pageProps.includeSiteCSS !== false; // Default to true if not specified

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Override global styles only for profile pages with custom CSS */}
        {needsCSSResets && (
          <style dangerouslySetInnerHTML={{
            __html: `
              /* Reset Tailwind classes that interfere with custom CSS on profile pages */
              .profile-tab-button.px-4 { padding-left: unset; padding-right: unset; }
              .profile-tab-button.py-3 { padding-top: unset; padding-bottom: unset; }
              .profile-tab-button.border-r { border-right: unset; }
              .profile-tab-list.flex { display: unset; }
              .profile-tab-list.flex-wrap { flex-wrap: unset; }
              .profile-tab-list.border-b { border-bottom: unset; }
              .profile-tab-panel.p-6 { padding: unset; }
              .ts-profile-tabs-wrapper .p-0 { padding: unset; }
              .ts-profile-tabs-wrapper .overflow-hidden { overflow: unset; }
              
              /* Let user custom CSS take full control */
              .thread-module.p-6 { padding: unset; }
              .thread-module.mb-6 { margin-bottom: unset; }
              .thread-module.p-0 { padding: unset; }
              
              /* Reset any Tailwind colors */
              .bg-thread-cream { background-color: unset; }
              .bg-thread-paper { background-color: unset; }
              .text-thread-pine { color: unset; }
              .text-thread-sage { color: unset; }
              .border-thread-sage { border-color: unset; }
            `
          }} />
        )}
        
        {/* Load site-wide CSS based on page type and user preference */}
        {css && (!isProfilePage || includeSiteCSS) && (
          <style 
            id="site-wide-css"
            dangerouslySetInnerHTML={{ __html: css }} 
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
    </>
  );
}
