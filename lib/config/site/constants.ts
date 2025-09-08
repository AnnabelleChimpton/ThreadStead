// Site configuration - these map to the descriptive env vars
export const SITE_TITLE = process.env.NEXT_PUBLIC_SITE_TITLE || "YourSiteHere";
export const SITE_HANDLE_DOMAIN = process.env.SITE_HANDLE_DOMAIN || "YourSiteHere"; 

// Backwards compatibility aliases (used by API endpoints)
export const SITE_NAME = SITE_HANDLE_DOMAIN;
export const LOCAL_HOST = SITE_HANDLE_DOMAIN;