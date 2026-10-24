import React, { useLayoutEffect, useRef } from "react";
import NavigationPreview from "@/components/features/templates/NavigationPreview";

/**
 * The site nav's surface on your-own-HTML pages. The bar used to be see-through
 * and take the page's text colour, so it only stayed readable while the
 * page's `body {}` rules were dead; once they worked, a dark page made it
 * dark-on-dark. This is the colour it always showed (a 10% shade over the
 * site's cream), now solid, with the site's own ink (data-site-chrome).
 */
export const ADVANCED_NAV_SURFACE = "#E3E1DE";

interface AdvancedNavFrameProps {
  showNavigation: boolean;
  /** The page has its own <main>: the frame isn't marked as one too */
  pageHasMain?: boolean;
  /** Site chrome under the nav, e.g. "Step back outside" */
  afterNav?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The bar's height in px, measured and rounded up as the measurement below
 * rounds. The server renders it signed out (it learns who's signed in in
 * the browser), and narrower than about 1133px its "Sign Up" wraps to two
 * lines. That width depends on the site's name and sections; the
 * measurement covers a site where it comes out elsewhere. Below 1024px the
 * links fold into the phone menu (NavBar's MobileNavMenu).
 */
const NAV_HEIGHT = { wide: 90, narrow: 101, narrowBelow: 1133, phone: 89, phoneBelow: 1024 };

// Advanced templates get the site nav as a position: fixed bar, so the page
// has to leave room under it. The room comes from CSS (NAV_HEIGHT), so it's
// right in the server's HTML; a flat 70px used to sit under the taller bar
// until hydration measured it, a ~19px jump. The measurement stays, for a
// bar that comes out another height (a long site name, the signed-in bar).
// Both go in --ts-nav-height on html, which a page can use too (a sticky
// header at top: var(--ts-nav-height)), and which the room under the bar
// and the scroll padding follow. The margin is !important because a pasted
// page's `* { margin: 0 }` would otherwise take it away.
export default function AdvancedNavFrame({ showNavigation, pageHasMain = false, afterNav, children }: AdvancedNavFrameProps) {
  const navRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const bar = navRef.current?.firstElementChild as HTMLElement | null;
    if (!showNavigation || !bar) return;
    const root = document.documentElement;
    const measure = () => {
      const height = Math.ceil(bar.getBoundingClientRect().height);
      if (height) root.style.setProperty("--ts-nav-height", `${height}px`);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(bar);
    return () => {
      observer?.disconnect();
      root.style.removeProperty("--ts-nav-height");
    };
  }, [showNavigation]);

  return (
    <>
      {/* Past the nav's links to the page, for keyboards and screen readers,
          as on every other page (template audit 14 #1) */}
      {showNavigation && (
        <div data-site-chrome style={{ display: "contents" }}>
          <a href="#main-content" className="skip-link">Skip to main content</a>
        </div>
      )}
      {/* The wrapper takes no space: its only child is position: fixed */}
      {/* data-site-chrome: the page's CSS can't reach or restyle the nav */}
      {showNavigation && (
        <div ref={navRef} data-site-chrome="true" className="ts-nav-holder">
          <NavigationPreview navBackgroundColor={ADVANCED_NAV_SURFACE} />
        </div>
      )}
      <div className={showNavigation ? "ts-under-nav" : undefined}>
        {afterNav}
        {/* Absolute template children position from here, below afterNav */}
        {/* The page's landmark, unless it has its own <main> (a role, so the
            page's own main {} rules still only match its own <main>) */}
        <div
          id="main-content"
          role={pageHasMain ? undefined : "main"}
          tabIndex={-1}
          className="ts-page-frame"
          style={{ position: "relative" }}
        >
          {children}
        </div>
      </div>
      <style jsx>{`
        /* The bar's height before it's measured (inline on html after) */
        :global(html:has(.ts-under-nav)) {
          --ts-nav-height: ${NAV_HEIGHT.wide}px;
        }
        @media (max-width: ${NAV_HEIGHT.narrowBelow - 1}px) {
          :global(html:has(.ts-under-nav)) {
            --ts-nav-height: ${NAV_HEIGHT.narrow}px;
          }
        }
        @media (max-width: ${NAV_HEIGHT.phoneBelow - 1}px) {
          :global(html:has(.ts-under-nav)) {
            --ts-nav-height: ${NAV_HEIGHT.phone}px;
          }
        }
        .ts-under-nav {
          margin-top: var(--ts-nav-height) !important;
        }
        /* A page wider than a phone (an 800px table from 2003) pans inside
           this box. Clipped by body, its right side was out of reach on
           iPhones; let out, it widened Android's layout viewport and pushed
           the fixed nav and its menu button off the screen. (Inside the box,
           the page's own position: sticky sticks to the box, so this stays
           off where pages fit: below the site's phone breakpoint only.) */
        /* Focus and #anchor jumps stop below the fixed nav, not under it
           (WCAG focus not obscured: template audit 14 #2) */
        :global(html:has(.ts-under-nav)) {
          scroll-padding-top: calc(var(--ts-nav-height) + 8px);
        }
        /* A short window (zoomed to 400%, a phone on its side): the bar
           scrolls away with the page instead of covering most of it
           (WCAG reflow: template audit 14 #2c). Relative, so its menus still
           drop down from it. */
        @media (max-height: 500px) {
          .ts-nav-holder > :global(*) {
            position: relative !important;
          }
          .ts-under-nav {
            margin-top: 0 !important;
          }
          :global(html:has(.ts-under-nav)) {
            scroll-padding-top: 8px;
          }
        }
        .ts-page-frame:focus {
          outline: none;
        }
        @media (max-width: ${NAV_HEIGHT.phoneBelow - 1}px) {
          .ts-page-frame {
            overflow-x: auto;
          }
        }
      `}</style>
    </>
  );
}
