import { db } from "@/lib/config/database/connection";

const SITE_CSS_KEY = "site_custom_css";

/**
 * Server-side utility to fetch site CSS directly from database
 * Used in getServerSideProps to prevent hydration mismatches
 */
export async function getSiteCSS(): Promise<string> {
  try {
    const config = await db.siteConfig.findUnique({
      where: { key: SITE_CSS_KEY }
    });

    return config?.value || "";
  } catch (error) {
    console.error("Error fetching site CSS server-side:", error);
    return "";
  }
}
