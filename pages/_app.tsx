import type { AppProps } from "next/app";
import Head from "next/head";
import React, { useEffect } from "react";
import 'highlight.js/styles/github.css'; // Restore highlight.js for non-profile pages
import "../styles/globals.css"; // Restore global CSS
import "../styles/components.css"; // Component-specific styles (including bottom sheets)
import "../styles/neighborhood.css"; // Neighborhood street view styles
import "../styles/neighborhood-card-view.css"; // Card view mobile experience styles
import "../styles/pixel-homes-interactive.css"; // Interactive elements for pixel homes
import "../styles/pixel-homes-animations.css"; // Visual polish and animations for pixel homes
import { useSiteCSS } from "@/hooks/useSiteCSS";
import { useRouter } from "next/router";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { CSSModeProvider } from "@/contexts/CSSModeContext";

// Import Layout to ensure CSS dependencies are always available
import Layout from "@/components/ui/layout/Layout";

// Import Global Audio Provider
import { GlobalAudioProvider } from "@/contexts/GlobalAudioContext";

// Import Cookie Consent Banner
import CookieConsentBanner from "@/components/ui/feedback/CookieConsentBanner";

// Import Toast Provider
import { ToastProvider } from "@/lib/templates/state/ToastProvider";

// Import Chat Provider and global chat components
import { ChatProvider } from "@/contexts/ChatContext";
import { ConversationsProvider } from "@/contexts/ConversationsContext";
import GlobalChatToggle from "@/components/chat/GlobalChatToggle";
import GlobalChatPopup from "@/components/chat/GlobalChatPopup";

// Initialize ThreadRing reconciliation scheduler (server-side only)
import "@/lib/domain/threadrings/reconciliation-bootstrap";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { user } = useCurrentUser();

  // Extract CSS mode information from pageProps
  const cssMode = pageProps.cssMode || 'inherit';
  const templateMode = pageProps.templateMode || 'default';

  // Conditionally load site CSS
  const { css, loading } = useSiteCSS({
    skipDOMInjection: false,
    cssMode: cssMode
  });

  // Ensure Layout component is bundled to include its CSS dependencies
  // This fixes CSS loading issues for dynamically imported components
  useEffect(() => {
    if (typeof Layout === 'function') {
      // Layout component and its dependencies are available
    }
  }, []);

  // Handle navigation state tracking - TEMPORARILY DISABLED FOR DEBUGGING
  // useEffect(() => {
  //   const handleRouteChangeStart = (url: string) => {
  //     // Store navigation timestamp to help with back/forward detection
  //     if (typeof window !== 'undefined') {
  //       window.sessionStorage.setItem('lastNavigationTimestamp', Date.now().toString());
  //     }
  //   };

  //   const handleRouteChangeComplete = (url: string) => {
  //     // Only force refresh in very specific cases where we know there are rendering issues
  //     // This is a more conservative approach than the previous implementation
  //     if (typeof window !== 'undefined') {
  //       const lastTimestamp = window.sessionStorage.getItem('lastNavigationTimestamp');
  //       const now = Date.now();

  //       // Only consider forcing refresh if navigation happened very quickly (likely browser back/forward)
  //       // and only for certain problematic routes that need full refresh
  //       if (lastTimestamp && (now - parseInt(lastTimestamp)) < 50) {
  //         const problematicRoutes = ['/preview-temp', '/resident/'];
  //         const needsRefresh = problematicRoutes.some(route => url.includes(route));

  //         if (needsRefresh) {
  //           // Only refresh for specific problematic routes, not all navigation
  //           setTimeout(() => {
  //             window.location.reload();
  //           }, 50);
  //         }
  //       }
  //     }
  //   };

  //   router.events.on('routeChangeStart', handleRouteChangeStart);
  //   router.events.on('routeChangeComplete', handleRouteChangeComplete);

  //   return () => {
  //     router.events.off('routeChangeStart', handleRouteChangeStart);
  //     router.events.off('routeChangeComplete', handleRouteChangeComplete);
  //   };
  // }, [router]);


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

  // Check if we're on a user profile page or preview page that might have custom CSS
  const isProfilePage = router.pathname === '/resident/[username]' ||
    router.pathname === '/resident/[username]/index' ||
    router.pathname === '/preview-temp';
  const hasCustomCSS = pageProps.customCSS && pageProps.customCSS.trim() !== '';

  const actualCSSMode = cssMode;
  const needsCSSResets = isProfilePage && pageProps.templateMode === 'advanced' && actualCSSMode !== 'inherit';
  const includeSiteCSS = pageProps.includeSiteCSS !== false; // Default to true if not specified


  return (
    <GlobalAudioProvider>
      <ToastProvider>
        <ChatProvider>
          <ConversationsProvider>
            <CSSModeProvider
              cssMode={actualCSSMode}
              templateMode={templateMode}
            >
              <Head>
                {/* ... existing head content ... */}
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="color-scheme" content="light" />

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

                {/* Advanced template CSS - inject with boosted specificity */}
                {isProfilePage && hasCustomCSS && pageProps.templateMode === 'advanced' && (() => {
                  const customCSS = pageProps.customCSS || '';

                  // Boost specificity to beat Tailwind by adding 'html body' prefix
                  const boostedCSS = customCSS.replace(/([^{}]+)\{/g, (match: string, selector: string) => {
                    const trimmed = selector.trim();
                    if (trimmed.startsWith('@')) return match;

                    const selectors = selector.split(',').map((s: string) => {
                      const sel = s.trim();
                      if (sel.startsWith('html body')) return sel;
                      return `html body ${sel}`;
                    }).join(', ');

                    return `${selectors} {`;
                  });

                  return (
                    <style
                      id="advanced-template-css"
                      dangerouslySetInnerHTML={{ __html: boostedCSS }}
                    />
                  );
                })()}

                {isProfilePage && hasCustomCSS && pageProps.templateMode !== 'advanced' && (
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
              <div
                className={`${pageProps.templateMode === 'advanced'
                  ? 'min-h-screen font-body'
                  : 'min-h-screen font-body thread-surface text-thread-charcoal'
                }`}
              >
                <Component {...pageProps} />

                {/* Cookie Consent Banner */}
                <CookieConsentBanner
                  userId={user?.id}
                  onConsentChange={(consents) => {
                    // Optional: Handle global consent changes
                    console.log('Global consent updated:', consents);
                  }}
                />

                {/* Global Chat - Only show for authenticated users */}
                {user && (
                  <>
                    <GlobalChatToggle />
                    <GlobalChatPopup />
                  </>
                )}
              </div>
            </CSSModeProvider>
          </ConversationsProvider>
        </ChatProvider>
      </ToastProvider>
    </GlobalAudioProvider>
  );
}
