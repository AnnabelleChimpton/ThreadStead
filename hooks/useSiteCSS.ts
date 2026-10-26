import { createContext, useEffect, useState, useRef } from "react";

/** The site's CSS as _app has it (sent once with the page): for ProfileLayout and the editor's preview */
export const SiteCssContext = createContext<string | undefined>(undefined);

interface UseSiteCSSOptions {
  skipDOMInjection?: boolean; // For Visual Builder templates that manage their own CSS
  cssMode?: 'inherit' | 'override' | 'disable'; // Respect CSS mode
  initialCSS?: string; // Pre-fetched CSS from SSR to prevent hydration mismatches
}

const PLACEHOLDER = "/* Site CSS loading... */";

export function useSiteCSS(options: UseSiteCSSOptions = {}) {
  // The placeholder read back from a server render that had no site CSS
  // isn't the site's CSS: fetch it
  const initialCSS = options.initialCSS === PLACEHOLDER ? undefined : options.initialCSS;
  // Use initialCSS if provided (from SSR), otherwise use loading placeholder
  // Use ?? instead of || to treat empty string as valid "no CSS" state
  const [css, setCSS] = useState(initialCSS ?? PLACEHOLDER);
  const [loading, setLoading] = useState(initialCSS === undefined);
  const hasInitialized = useRef(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure we know when we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Skip fetching if initialCSS was provided (SSR case)
    if (initialCSS) {
      setLoading(false);
      return;
    }

    // Only run on client side and prevent multiple initializations
    if (!isClient || hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;

    async function fetchSiteCSS() {
      try {
        const res = await fetch("/api/site-css");
        if (res.ok) {
          const data = await res.json();
          const siteCSS = data.css || "";
          // Store the raw CSS for use by other components that handle layering themselves
          setCSS(siteCSS);

          // Only inject into DOM if not skipped and CSS mode allows it
          const shouldInjectToDOM = !options.skipDOMInjection &&
                                  options.cssMode !== 'disable';

          if (shouldInjectToDOM && typeof document !== 'undefined') {
            const styleElement = document.getElementById('site-wide-css');
            if (styleElement) {
              // Raw, UNLAYERED — layered site CSS loses to unlayered Tailwind
              // utilities and visibly stops applying (must match what
              // _app.tsx renders for this element).
              // textContent, not innerHTML: CSS is text, never markup
              styleElement.textContent = siteCSS || '';
            }
          } else if (options.cssMode === 'disable' && typeof document !== 'undefined') {
            // For 'disable' mode, clear any existing site CSS injection
            const styleElement = document.getElementById('site-wide-css');
            if (styleElement) {
              styleElement.textContent = '';
            }
          }

        }
      } catch (error) {
        console.error("Failed to load site CSS:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSiteCSS();
  }, [isClient, options.skipDOMInjection, options.cssMode, initialCSS]);

  return { css, loading };
}