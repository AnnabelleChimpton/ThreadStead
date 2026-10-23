import React, { createContext, useContext } from "react";

/**
 * Set while a resident's page renders on their own address
 * (alice.homepageagain.com, pages/site/[label].tsx). Nothing there is signed
 * in and nothing can be written, so the bits that would sign a guestbook or
 * follow someone link to the page on the main site instead, where the
 * visitor's session is.
 */
export interface ResidentHost {
  /** The main site, e.g. https://homepageagain.com (no trailing slash) */
  mainSiteUrl: string;
  /** Whose address this is */
  username: string;
}

const ResidentHostContext = createContext<ResidentHost | null>(null);

export function ResidentHostProvider({ value, children }: { value: ResidentHost | null; children: React.ReactNode }) {
  return <ResidentHostContext.Provider value={value}>{children}</ResidentHostContext.Provider>;
}

/** Null on the main site. */
export function useResidentHost(): ResidentHost | null {
  return useContext(ResidentHostContext);
}

/** Their profile on the main site, optionally at one tab. */
export function mainSiteProfileUrl(host: ResidentHost, tab?: string): string {
  const path = `/resident/${encodeURIComponent(host.username)}`;
  return `${host.mainSiteUrl}${path}${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`;
}
