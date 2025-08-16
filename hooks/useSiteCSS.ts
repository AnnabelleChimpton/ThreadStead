import { useEffect, useState } from "react";

export function useSiteCSS() {
  const [css, setCSS] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSiteCSS() {
      try {
        const res = await fetch("/api/site-css");
        if (res.ok) {
          const data = await res.json();
          setCSS(data.css || "");
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