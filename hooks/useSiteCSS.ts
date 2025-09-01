import { useEffect, useState, useRef } from "react";

export function useSiteCSS() {
  const [css, setCSS] = useState("");
  const [loading, setLoading] = useState(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) {
      return;
    }
    
    hasInitialized.current = true;

    // Debug hook execution (only on first call)
    if (process.env.NODE_ENV === 'development') {
      console.log('🔥 useSiteCSS hook initialized', { 
        timestamp: new Date().toISOString().split('T')[1].slice(0, 8)
      });
    }
    
    async function fetchSiteCSS() {
      try {
        const res = await fetch("/api/site-css");
        if (res.ok) {
          const data = await res.json();
          const siteCSS = data.css || "";
          setCSS(siteCSS);
          
          // Also update the DOM directly to ensure immediate application
          if (typeof document !== 'undefined') {
            let styleElement = document.getElementById('site-wide-css');
            if (styleElement) {
              styleElement.innerHTML = siteCSS;
            }
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Site CSS loaded successfully', { cssLength: siteCSS.length });
          }
        }
      } catch (error) {
        console.error("Failed to load site CSS:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSiteCSS();
  }, []);

  return { css, loading };
}