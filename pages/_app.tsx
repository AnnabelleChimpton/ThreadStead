import App, { type AppContext, type AppProps } from "next/app";
import dynamic from "next/dynamic";
import Head from "next/head";
import React, { useEffect, useMemo, useRef } from "react";
import 'highlight.js/styles/github.css'; // Restore highlight.js for non-profile pages
import "../styles/globals.css"; // Restore global CSS
import "../styles/components.css"; // Component-specific styles (including bottom sheets)
// After it: components.css comes again here, and its rules on component parts
// (.profile-photo-frame) would beat the parts' token rules by coming later
import "../styles/component-parts.css";
import "../styles/neighborhood.css"; // Neighborhood street view styles
import "../styles/neighborhood-card-view.css"; // Card view mobile experience styles
import "../styles/pixel-homes-interactive.css"; // Interactive elements for pixel homes
import "../styles/pixel-homes-animations.css"; // Visual polish and animations for pixel homes
import { useSiteCSS, SiteCssContext } from "@/hooks/useSiteCSS";
import { putServerOnly, readServerOnly } from "@/lib/utils/server-only";
import { useRouter } from "next/router";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { advancedPageStyles, standardPageStyles } from "@/lib/templates/rendering/page-css";
import PageFonts from "@/components/ui/layout/PageFonts";
import { escapeCssForStyleTag } from "@/lib/utils/sanitization/css";
import { siteStylesOn } from "@/lib/domain/profile/layout";

// Import Layout to ensure CSS dependencies are always available
import Layout from "@/components/ui/layout/Layout";

// Import Global Audio Provider
import { GlobalAudioProvider } from "@/contexts/GlobalAudioContext";

// Import Cookie Consent Banner

// Toasts and confirm dialogs for the whole app
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmProvider } from "@/contexts/ConfirmContext";

// Import Chat Provider and global chat components
import { ChatProvider } from "@/contexts/ChatContext";
import { ConversationsProvider } from "@/contexts/ConversationsContext";
// Only someone signed in sees chat, so its code loads only for them: it was
// in every visitor's JavaScript (the panels, their socket client and sounds)
const GlobalChatToggle = dynamic(() => import("@/components/chat/GlobalChatToggle"), { ssr: false });
const GlobalChatPopup = dynamic(() => import("@/components/chat/GlobalChatPopup"), { ssr: false });
import { ResidentHostProvider, type ResidentHost } from "@/contexts/ResidentHostContext";
import { getSiteBaseUrl } from "@/lib/config/site-url";
import { SITE_TITLE } from "@/lib/config/site/constants";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { user } = useCurrentUser();

  // Extract CSS mode information from pageProps
  const cssMode = pageProps.cssMode || 'inherit';

  // The site's CSS, from the first load's server render (getInitialProps):
  // on the server from the props, in the browser read back from the
  // #site-wide-css it wrote, so the page data doesn't carry it too
  // (lib/utils/server-only.ts). Kept across client navigations.
  const serverSiteCSS = useRef(readServerOnly(pageProps, 'site-wide-css'));
  const { css, loading } = useSiteCSS({
    skipDOMInjection: false,
    cssMode: cssMode,
    initialCSS: serverSiteCSS.current
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
  //         const problematicRoutes = ['/template-preview', '/resident/'];
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
          // A #fragment (e.g. one guestbook entry) picks its own scroll target.
          // A tab already on screen (Settings' tab row) stays put.
          const { top, bottom } = tabElement.getBoundingClientRect();
          const onScreen = top >= 0 && bottom <= window.innerHeight;
          if (!window.location.hash && !onScreen) tabElement.scrollIntoView({ behavior: 'smooth' });
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
    router.pathname === '/site/[label]' ||
    router.pathname === '/template-preview';
  // On a resident's own address (pages/site/[label].tsx): signed out, read-only
  const residentHost: ResidentHost | null = pageProps.residentHost ?? null;

  const actualCSSMode = cssMode;
  // Site styles on a profile page follow its cssMode (lib/domain/profile/layout.ts).
  // The editor's preview page turns them off for itself (siteStyles: false).
  const siteStyles = pageProps.siteStyles !== false && siteStylesOn(actualCSSMode);


  // Site-wide CSS (admin panel): the ONE delivery point. DELIBERATELY
  // UNLAYERED and in <body>: the admin CSS shares specificity with rules in
  // the compiled stylesheet (globals.css also styles .thread-surface etc.),
  // so document ORDER decides the winner. In <head> this tag sat BEFORE the
  // compiled CSS <link> and lost every tie: the admin panel's CSS was in the
  // DOM but visually absent (live-diagnosed via the cascade on
  // homepageagain.com). Never wrap it in @layer: layered normal declarations
  // lose to Tailwind's unlayered utilities. SSR-primed via initialSiteCSS on
  // profile pages; the useSiteCSS hook updates it by id on client fetches.
  //
  // Each <style> below keeps the same {__html} object until its CSS changes:
  // React rewrites a <style> whose object is new, and the browser re-parses
  // all of it. A new one on every render did that twice after each page's
  // hydration, and transformed the page's CSS again each time (half the
  // main-thread blocking on a big page, on a phone).
  const siteCssHtml = useMemo(() => ({ __html: escapeCssForStyleTag(css) || '/* Site CSS loading... */' }), [css]);
  const siteCssStyle = (!isProfilePage || siteStyles) && (
    <style id="site-wide-css" key="site-css" dangerouslySetInnerHTML={siteCssHtml} />
  );

  // The profile's own CSS, built as the editor's preview builds it
  // (lib/templates/rendering/page-css.ts)
  const advancedPage = pageProps.templateMode === 'advanced';
  const customCSS: string = pageProps.customCSS || '';
  const pageStyles = useMemo(() => {
    if (!isProfilePage) return null;
    if (!advancedPage) return customCSS.trim() ? standardPageStyles(customCSS) : null;
    // A page of your own HTML: transformed on the server, sent once
    // (getServerSideProps puts it with putServerOnly, or as pageCss on a
    // client-side navigation), its fonts as pageFonts
    const sent = pageProps.pageCss ?? readServerOnly(pageProps, 'advanced-template-css', pageProps.ownerUserId);
    return sent !== undefined ? { css: sent, fonts: pageProps.pageFonts ?? [] } : advancedPageStyles(customCSS, pageProps.compiledTemplate);
  }, [isProfilePage, advancedPage, customCSS, pageProps]);
  const pageCssHtml = useMemo(() => {
    return pageStyles?.css ? { __html: escapeCssForStyleTag(pageStyles.css) } : null;
  }, [pageStyles]);

  return (
    <SiteCssContext.Provider value={loading ? undefined : css}>
    <ResidentHostProvider value={residentHost}>
    <GlobalAudioProvider>
      <ToastProvider>
       <ConfirmProvider>
        <ChatProvider>
          <ConversationsProvider>
            <Head>
              {/* ... existing head content ... */}
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              {/* A page of someone's own HTML picks its own colour scheme
                  (light-dark(), dark backgrounds); the site is light */}
              {!(isProfilePage && pageProps.templateMode === 'advanced') && (
                <meta name="color-scheme" content="light" />
              )}
              {/* Link-preview defaults, keyed so a page's own (PageMeta, same
                  keys) replaces each one instead of sending a second copy.
                  Absolute, as previews need. Size hints stay off: they'd be
                  wrong for a page that brings its own image without them. */}
              <meta key="og:site_name" property="og:site_name" content={SITE_TITLE} />
              <meta key="og:image" property="og:image" content={`${getSiteBaseUrl()}/og-image.png?v=2`} />
              <meta key="og:image:alt" property="og:image:alt" content="HomePageAgain: The internet doesn't have to suck. A pixel-art house with a pink roof and door." />
              <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
              <meta key="twitter:image" name="twitter:image" content={`${getSiteBaseUrl()}/og-image.png?v=2`} />



            </Head>
            {pageStyles && <PageFonts hrefs={pageStyles.fonts} />}
            <div
              className={`${pageProps.templateMode === 'advanced'
                // No font-body here: it re-set the font under <body>, so a
                // page's own body { font-family } and font: pickers did nothing
                ? 'min-h-screen'
                : 'min-h-screen font-body thread-surface text-thread-charcoal'
              }`}
            >
              {/* A profile's own CSS: after the site's, so where the two tie
                  (unlayered rules of the same weight, @keyframes named spin,
                  pulse or bounce, which Tailwind defines too) the profile's
                  wins, as it did inside the @scope block it used to be in.
                  Before the page, so nothing paints unstyled. The editor's
                  preview (pages/template-preview.tsx) uses the same order
                  and the same transforms. */}
              {isProfilePage && siteCssStyle}
              {pageCssHtml && (
                <style id={advancedPage ? 'advanced-template-css' : 'profile-page-styles'} dangerouslySetInnerHTML={pageCssHtml} />
              )}
              <Component {...pageProps} />

              {!isProfilePage && siteCssStyle}

              {/* Site chrome: profile CSS is scoped away from data-site-chrome */}
              <div data-site-chrome style={{ display: 'contents' }}>
                {/* No cookie banner: the only cookies are the ones that keep
                    you logged in, which need no notice, and the banner was the
                    last thing to paint on a first visit. The footer says it
                    (SiteFooter). CookieConsentBanner is kept, unused. */}

                {/* Global Chat - Only show for authenticated users */}
                {user && (
                  <>
                    <GlobalChatToggle />
                    <GlobalChatPopup />
                  </>
                )}
              </div>
            </div>
          </ConversationsProvider>
        </ChatProvider>
       </ConfirmProvider>
      </ToastProvider>
    </GlobalAudioProvider>
    </ResidentHostProvider>
    </SiteCssContext.Provider>
  );
}

// Render the site CSS into the first HTML response so pages paint themed
// instead of flashing the unthemed base styles until a client fetch lands.
MyApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);
  if (typeof window === "undefined") {
    // Server-only: Next replaces `typeof window` at build time, so this
    // import (and Prisma) never reaches the client bundle.
    const { getSiteCSS, getDefaultSiteCSS } = await import("@/lib/utils/css/site-css-server");
    // A page pre-rendered at build time (no request) would keep whatever CSS
    // the build saw until the next deploy, so it gets the bundled theme and
    // the browser loads the current site CSS. It also keeps the build off the
    // database.
    // Rendered into #site-wide-css; not in the page data (lib/utils/server-only.ts)
    putServerOnly(appProps.pageProps, 'site-wide-css', appContext.ctx.req ? await getSiteCSS() : getDefaultSiteCSS());
  }
  return appProps;
};
