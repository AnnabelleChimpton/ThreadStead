// Test helpers: resolve a URL the way the running site would — next.config
// redirects first (with Next's own matcher), then the pages/ file routes.
import fs from "fs";
import path from "path";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { prepareDestination } from "next/dist/shared/lib/router/utils/prepare-destination";
import nextConfig from "@/next.config";

interface Redirect {
  source: string;
  destination: string;
  permanent?: boolean;
  has?: { type: string; key: string; value?: string }[];
}

// Only query conditions are used in next.config today
function hasMatches(redirect: Redirect, query: Record<string, string>): boolean {
  return (redirect.has ?? []).every((cond) => {
    if (cond.type !== "query") throw new Error(`routeTable: unsupported has type ${cond.type}`);
    if (!(cond.key in query)) return false;
    return cond.value === undefined || new RegExp(`^${cond.value}$`).test(query[cond.key]);
  });
}

let redirectsCache: Redirect[] | null = null;

export async function loadRedirects(): Promise<Redirect[]> {
  if (!redirectsCache) {
    redirectsCache = ((await nextConfig.redirects?.()) ?? []) as Redirect[];
  }
  return redirectsCache;
}

/** The first redirect that matches `url`, as Next applies it, or null. */
export async function applyRedirect(url: string): Promise<{ destination: string; permanent: boolean } | null> {
  const [pathname, search = ""] = url.split("?");
  const query = Object.fromEntries(new URLSearchParams(search));
  for (const redirect of await loadRedirects()) {
    const params = getPathMatch(redirect.source, { removeUnnamedParams: true, strict: true })(pathname);
    if (!params || !hasMatches(redirect, query)) continue;
    // Next merges the request's query into the destination's
    const { parsedDestination } = prepareDestination({
      appendParamsToQuery: false,
      destination: redirect.destination,
      params,
      query,
    });
    const merged = new URLSearchParams(parsedDestination.query as Record<string, string>).toString();
    return {
      destination: `${parsedDestination.pathname}${merged ? `?${merged}` : ""}`,
      permanent: !!redirect.permanent,
    };
  }
  return null;
}

const PAGES_DIR = path.join(__dirname, "../../../../pages");

function listPageRoutes(dir = PAGES_DIR, prefix = ""): string[] {
  const routes: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (prefix === "" && entry.name === "api") continue;
      routes.push(...listPageRoutes(path.join(dir, entry.name), `${prefix}/${entry.name}`));
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.startsWith("_")) {
      const name = entry.name.replace(/\.tsx?$/, "");
      routes.push(name === "index" ? prefix || "/" : `${prefix}/${name}`);
    }
  }
  return routes;
}

const routeMatchers = listPageRoutes().map((route) => {
  const pattern = route
    .split("/")
    .map((segment) => {
      if (/^\[\[\.\.\..+\]\]$/.test(segment)) return "(?:/.*)?";
      if (/^\[\.\.\..+\]$/.test(segment)) return "/.+";
      if (/^\[.+\]$/.test(segment)) return "/[^/]+";
      return segment ? `/${segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` : "";
    })
    .join("");
  return { route, regex: new RegExp(`^${pattern || "/"}$`) };
});

/** The pages/ route file that serves `pathname`, or null. */
export function pageFor(pathname: string): string | null {
  const clean = pathname.split(/[?#]/)[0];
  // Static routes win over dynamic ones, as in Next
  const matches = routeMatchers.filter((m) => m.regex.test(clean));
  const staticMatch = matches.find((m) => !m.route.includes("["));
  return (staticMatch ?? matches[0])?.route ?? null;
}

/** Follow redirects (max 5) and return the final URL plus the page serving it. */
export async function resolve(url: string): Promise<{ finalUrl: string; hops: string[]; page: string | null }> {
  const hops: string[] = [];
  let current = url;
  for (let i = 0; i < 5; i++) {
    const next = await applyRedirect(current);
    if (!next) break;
    hops.push(next.destination);
    current = next.destination;
  }
  return { finalUrl: current, hops, page: pageFor(current) };
}
