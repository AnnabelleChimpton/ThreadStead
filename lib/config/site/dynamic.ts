import { db } from "../database/connection";
import { DEFAULT_POLICIES } from "./policies";
import { SITE_TITLE } from "./constants";

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
  disable_default_landing: string;
  default_profile_css: string;
  terms_simple: string;
  terms_full: string;
  privacy_simple: string;
  privacy_full: string;
  site_custom_css: string;
  founders_note: string;
};

// Default site configuration values
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
  disable_default_landing: "false",
  default_profile_css: "",
  ...DEFAULT_POLICIES,
  site_custom_css: "",
  founders_note: "",
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