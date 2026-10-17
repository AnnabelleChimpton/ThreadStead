import fs from "fs";
import path from "path";
import { db } from "@/lib/config/database/connection";

const SITE_CSS_KEY = "site_custom_css";
const DEFAULT_CSS_PATH = path.join(process.cwd(), "styles", "site-theme.default.css");
const CACHE_TTL_MS = 30_000;

let defaultCSS: string | null = null;
let cached: { css: string; isDefault: boolean; at: number } | null = null;

/** The bundled notebook theme, used when no site CSS has been saved. */
export function getDefaultSiteCSS(): string {
  if (defaultCSS === null) {
    try {
      defaultCSS = fs.readFileSync(DEFAULT_CSS_PATH, "utf8");
    } catch (error) {
      console.error("Bundled site theme missing:", error);
      defaultCSS = "";
    }
  }
  return defaultCSS;
}

/**
 * Site CSS as served to pages: the admin's saved CSS, or the bundled
 * default when nothing has been saved. An explicitly saved empty value
 * (Admin → Site CSS → Clear) means no site CSS.
 */
export async function getSiteCSSWithSource(): Promise<{ css: string; isDefault: boolean }> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { css: cached.css, isDefault: cached.isDefault };
  }
  try {
    const config = await db.siteConfig.findUnique({
      where: { key: SITE_CSS_KEY }
    });
    const result = config
      ? { css: config.value ?? "", isDefault: false }
      : { css: getDefaultSiteCSS(), isDefault: true };
    cached = { ...result, at: Date.now() };
    return result;
  } catch (error) {
    console.error("Error fetching site CSS server-side:", error);
    // Serve the last known value rather than flashing the unthemed site
    return cached ? { css: cached.css, isDefault: cached.isDefault } : { css: getDefaultSiteCSS(), isDefault: true };
  }
}

/**
 * Server-side utility to fetch site CSS.
 * Used in getServerSideProps / App.getInitialProps so pages render themed
 * on the first paint instead of after a client fetch.
 */
export async function getSiteCSS(): Promise<string> {
  return (await getSiteCSSWithSource()).css;
}

/** Call after the admin saves site CSS so the next request sees it. */
export function invalidateSiteCSSCache(): void {
  cached = null;
}
