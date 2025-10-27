import { useEffect, useState, useRef } from "react";

interface UseSiteCSSOptions {
  skipDOMInjection?: boolean; // For Visual Builder templates that manage their own CSS
  cssMode?: 'inherit' | 'override' | 'disable'; // Respect CSS mode
  initialCSS?: string; // Pre-fetched CSS from SSR to prevent hydration mismatches
}

export function useSiteCSS(options: UseSiteCSSOptions = {}) {
  // Use initialCSS if provided (from SSR), otherwise use loading placeholder
  // Use ?? instead of || to treat empty string as valid "no CSS" state
  const [css, setCSS] = useState(options.initialCSS ?? "/* Site CSS loading... */");
  const [loading, setLoading] = useState(options.initialCSS === undefined);
  const hasInitialized = useRef(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure we know when we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Skip fetching if initialCSS was provided (SSR case)
    if (options.initialCSS) {
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
            let styleElement = document.getElementById('site-wide-css');
            if (styleElement) {
              const layeredCSS = siteCSS ? `@layer threadstead-site {\n${siteCSS}\n}` : '';
              styleElement.innerHTML = layeredCSS;
            }
          } else if (options.cssMode === 'disable' && typeof document !== 'undefined') {
            // For 'disable' mode, clear any existing site CSS injection
            let styleElement = document.getElementById('site-wide-css');
            if (styleElement) {
              styleElement.innerHTML = '';
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
  }, [isClient, options.skipDOMInjection, options.cssMode, options.initialCSS]);

  return { css, loading };
}