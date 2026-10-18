/**
 * Shapes shared by /api/search, /api/search/surprise and the /search page.
 */
import type { SearchResultType } from './relevance'

export type { SearchResultType }

/** A pixel house thumbnail (components/pixel-homes/HouseSVG). */
export interface HouseThumb {
  template: string;
  palette: string;
  customizations: Record<string, string>;
}

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  description?: string;
  url: string;
  meta?: string;
  /** 0–100 blended relevance; 100+ for an exact name/title match. */
  relevanceScore: number;
  // Card fields, one set per type — the old `meta` string stays for older callers.
  person?: { handle: string; avatarUrl: string | null; house: HouseThumb | null; postCount: number; followerCount: number };
  ring?: { slug: string; badgeImageUrl: string | null; memberCount: number; postCount: number };
  post?: { authorHandle: string; authorName: string; createdAt: string; ring: { name: string; slug: string } | null; commentCount: number };
  home?: { handle: string; ownerName: string; house: HouseThumb };
}

/** Grouped view: one section per requested type. */
export interface SearchSection {
  results: SearchResult[];
  /** How many matched (candidates read; see `capped`). */
  total: number;
  /** `total` hit the per-type candidate cap, so there may be more ("100+"). */
  capped: boolean;
}

export type HouseRow = {
  houseTemplate: string;
  palette: string;
} & Partial<Record<"wallColor" | "roofColor" | "trimColor" | "windowColor" | "detailColor" | "windowStyle" | "doorStyle" | "roofTrim", string | null>>;

export function houseThumb(h: HouseRow): HouseThumb {
  const { houseTemplate, palette, ...rest } = h;
  const customizations: Record<string, string> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === "string" && value && value !== "default") customizations[key] = value;
  }
  return { template: houseTemplate, palette, customizations };
}
