import { useEffect, useState, useRef } from "react";

export function useSiteCSS() {
  const [css, setCSS] = useState("/* Site CSS loading... */");
  const [loading, setLoading] = useState(true);
  const hasInitialized = useRef(false);
  const [isClient, setIsClient] = useState(false);

  // Ensure we know when we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
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
          
          // Also update the DOM directly to ensure immediate application
          // Wrap the site CSS in the proper layer to respect the cascade hierarchy
          if (typeof document !== 'undefined') {
            let styleElement = document.getElementById('site-wide-css');
            if (styleElement) {
              const layeredCSS = siteCSS ? `@layer threadstead-site {\n${siteCSS}\n}` : '';
              styleElement.innerHTML = layeredCSS;
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
  }, [isClient]);

  return { css, loading };
}