import { useEffect, useState } from "react";

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
};

// Default values that match the API
const DEFAULT_CONFIG: SiteConfig = {
  site_name: "ThreadStead",
  site_tagline: "@ ThreadStead",
  user_status_text: "threadstead resident",
  welcome_message: "Welcome to ThreadStead",
  directory_title: "ThreadStead Directory",
  directory_empty_message: "No residents have joined ThreadStead yet. Be the first!",
  feed_empty_message: "Be the first to share something on ThreadStead!",
  footer_text: "ThreadStead",
  welcome_dialog_title: "🎉 Welcome to Retro Social!",
  guestbook_prompt: "Share a friendly thought or memory…",
  site_description: "A cozy corner of the internet for thoughtful conversations and creative expression.",
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