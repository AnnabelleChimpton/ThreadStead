import { useEffect, useState } from "react";
import { SITE_TITLE } from "@/lib/config/site/constants";

export type SiteConfig = {
  site_name: string;
  site_tagline: string;
  user_status_text: string;
  welcome_message: string;
  directory_title: string;
  directory_empty_message: string;
  feed_empty_message: string;
  footer_text: string;
  welcome_dialog_title: string;
  guestbook_prompt: string;
  site_description: string;
  disable_default_home: string;
  default_profile_css: string;
};

// Default values that match the API
const DEFAULT_CONFIG: SiteConfig = {
  site_name: SITE_TITLE,
  site_tagline: "",
  user_status_text: "resident",
  welcome_message: `Welcome to ${SITE_TITLE}`,
  directory_title: `${SITE_TITLE} Directory`,
  directory_empty_message: `No residents have joined ${SITE_TITLE} yet. Be the first!`,
  feed_empty_message: `Be the first to share something on ${SITE_TITLE}!`,
  footer_text: SITE_TITLE,
  welcome_dialog_title: `Welcome to ${SITE_TITLE}`,
  guestbook_prompt: "Share a friendly thought or memory…",
  site_description: "A pixel house on a street of real people. Decorate the yard, keep your page behind the front door, sign your neighbors' guestbooks.",
  disable_default_home: "false",
  default_profile_css: "",
};

export function useSiteConfig() {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    
    (async () => {
      try {
        const res = await fetch("/api/site-config");
        if (!res.ok) {
          throw new Error(`Failed to fetch config: ${res.status}`);
        }
        
        const data = await res.json();
        if (alive && data.config) {
          setConfig(data.config);
        }
      } catch (err) {
        if (alive) {
          setError((err as Error).message);
          // Keep using defaults on error
        }
      } finally {
        if (alive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { config, isLoading, error };
}