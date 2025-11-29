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
import "../styles/visual-builder.module.css"; // Visual template builder styles
import { useSiteCSS } from "@/hooks/useSiteCSS";
import { useRouter } from "next/router";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { CSSModeProvider } from "@/contexts/CSSModeContext";
import { detectTemplateType } from "@/lib/utils/template-type-detector";

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

  // Detect template type for better handling
  const templateType = templateMode === 'advanced' && pageProps.customCSS
    ? detectTemplateType('', pageProps.customCSS)
    : 'legacy';

  // Visual Builder mode needs wrapper styles for patterns, but we need to be smarter about legacy templates
  const isVisualBuilder = templateMode === 'advanced' && cssMode === 'disable';
  const isLegacyTemplate = isVisualBuilder && templateType === 'legacy';

  // Conditionally load site CSS - skip for Visual Builder in disable mode
  const { css, loading } = useSiteCSS({
    skipDOMInjection: isVisualBuilder,
    cssMode: isVisualBuilder ? 'disable' : cssMode
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

  // Extract Visual Builder classes for body application (backup for patterns)
  const visualBuilderBodyClasses = React.useMemo(() => {
    if (!isProfilePage || !pageProps.customCSS || templateMode !== 'advanced') return '';

    // Simple extraction of Visual Builder classes from CSS
    const css = pageProps.customCSS;
    const classes = [];

    // Extract vb-pattern-* classes
    const patternMatch = css.match(/\.vb-pattern-([a-z0-9-]+)/);
    if (patternMatch) classes.push(`vb-pattern-${patternMatch[1]}`);

    // Extract vb-theme-* classes
    const themeMatch = css.match(/\.vb-theme-([a-z0-9-]+)/);
    if (themeMatch) classes.push(`vb-theme-${themeMatch[1]}`);

    return classes.join(' ');
  }, [isProfilePage, pageProps.customCSS, templateMode]);


  // For Visual Builder in disable mode, we need to completely isolate from global styles
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
              isVisualBuilder={isVisualBuilder}
            >
              <Head>
                {/* ... existing head content ... */}
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="color-scheme" content="light" />

                {/* Complete CSS reset for disable mode - neutralize ALL system styles */}
                {isVisualBuilder && (
                  <style dangerouslySetInnerHTML={{
                    __html: `
                      /* CSS Disable Mode - Complete Reset */
                      /* Neutralize ALL Tailwind and system CSS to give users total control */

                      html {
                        ${isLegacyTemplate ? '/* Legacy template: background handled by profile container */' :
                        'background-color: var(--global-bg-color, var(--vb-background-color, #FCFAF7)) !important;'}
                        color: var(--global-text-color, var(--vb-text-color, #2F2F2F)) !important;
                        font-family: var(--global-font-family, var(--vb-font-family, system-ui)) !important;
                        font-size: var(--global-font-size, var(--vb-font-size, 16px)) !important;
                      }

                      body {
                        ${isLegacyTemplate ? '/* Legacy template: background handled by profile container */' :
                        'background-color: var(--global-bg-color, var(--vb-background-color, #FCFAF7)) !important;'}
                        color: var(--global-text-color, var(--vb-text-color, #2F2F2F)) !important;
                        font-family: var(--global-font-family, var(--vb-font-family, system-ui)) !important;
                        font-size: var(--global-font-size, var(--vb-font-size, 16px)) !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        min-height: 100vh !important;
                      }

                      /* Strip system styles from wrapper only, not children */
                      #__next > .css-disable-mode {
                        all: unset;
                        display: block;
                        width: 100%;
                        min-height: 100vh;
                        box-sizing: border-box;
                      }

                      /* Ensure consistent box-sizing for children but allow user CSS to apply */
                      #__next > .css-disable-mode * {
                        box-sizing: border-box;
                      }

                      #__next {
                        min-height: 100vh !important;
                        background: inherit !important;
                      }
                    `
                  }} />
                )}

                {needsCSSResets && !isVisualBuilder && (
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

                {/* Advanced template CSS - inject with boosted specificity (only for legacy templates) */}
                {isProfilePage && hasCustomCSS && pageProps.templateMode === 'advanced' && (() => {
                  const customCSS = pageProps.customCSS || '';

                  // Visual Builder templates (non-legacy) don't need specificity boosting
                  // because they're in disable mode with no system CSS to compete with
                  if (isVisualBuilder && !isLegacyTemplate) {
                    return (
                      <style
                        id="advanced-template-css"
                        dangerouslySetInnerHTML={{ __html: customCSS }}
                      />
                    );
                  }

                  // Legacy templates need specificity boosting to beat Tailwind
                  // Add 'html body' prefix to all selectors (adds 2 to specificity)
                  const boostedCSS = customCSS.replace(/([^{}]+)\{/g, (match: string, selector: string) => {
                    // Skip @-rules like @media, @keyframes, @import
                    const trimmed = selector.trim();
                    if (trimmed.startsWith('@')) return match;

                    // Split comma-separated selectors and boost each one
                    const selectors = selector.split(',').map((s: string) => {
                      const sel = s.trim();
                      // Don't double-boost if already has html body prefix
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
                className={`${isVisualBuilder
                  ? 'css-disable-mode' // CSS disable mode: strip ALL system styles
                  : pageProps.templateMode === 'advanced'
                    ? 'min-h-screen font-body' // Advanced mode (non-Visual Builder): clean but structured
                    : 'min-h-screen font-body thread-surface text-thread-charcoal' // Normal styling for everything else
                  } ${isVisualBuilder && !isLegacyTemplate ? visualBuilderBodyClasses : ''}`}
                style={isVisualBuilder ? {
                  // Visual Builder disable mode: wrapper inherits from Visual Builder variables
                  // For legacy templates, omit background to let their body styles work
                  ...(isLegacyTemplate ? {} : {
                    backgroundColor: 'var(--global-bg-color, var(--vb-background-color, #FCFAF7))'
                  }),
                  color: 'var(--global-text-color, var(--vb-text-color, #2F2F2F))',
                  fontFamily: 'var(--global-font-family, var(--vb-font-family, system-ui))',
                  fontSize: 'var(--global-font-size, var(--vb-font-size, 16px))',
                  minHeight: '100vh',
                  margin: 0,
                  padding: 0
                } : undefined}
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
