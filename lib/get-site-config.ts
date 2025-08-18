import { db } from "./db";

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

// Default site configuration values
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
  disable_default_home: "false",
  default_profile_css: "",
};

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    // Get all site config values
    const configs = await db.siteConfig.findMany({
      select: {
        key: true,
        value: true,
      },
    });

    // Convert to key-value object and merge with defaults
    const configObj = configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {} as Record<string, string>);

    // Merge with defaults for any missing values
    return { ...DEFAULT_CONFIG, ...configObj };
  } catch (error) {
    console.error("Error fetching site config:", error);
    // Return defaults on error
    return DEFAULT_CONFIG;
  }
}