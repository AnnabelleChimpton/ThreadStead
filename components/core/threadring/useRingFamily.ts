import { useEffect, useState } from "react";
import type { FeedScope } from "./useRingFeed";

/** A ring in /api/threadrings/[slug]/lineage: the hub's ring descriptor, the parts used here. */
export interface RelativeRing {
  id: string;
  slug: string;
  name: string;
  postCount?: number;
  themeColor?: string | null;
  badgeImageUrl?: string | null;
}

interface LineageBody {
  parents?: RelativeRing[];
  children?: RelativeRing[];
  siblingsCount?: number;
}

/** Every ring starts from the Spool, so it isn't family: only rings started from each other are. */
const ROOT_SLUG = "spool";

/**
 * A ring's real relatives, from one lineage read: the ring it started from
 * (never the Spool) and the rings started from it. `feed` is the "With …"
 * choice for the posts, when any relative has posts: its label, and the
 * scopes it reads. With a real parent that's the hub's family (parent,
 * siblings, branches); without one, this ring and its branches, since the
 * Spool's other rings aren't family.
 */
export function useRingFamily(slug: string) {
  const [lineage, setLineage] = useState<LineageBody | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/threadrings/${encodeURIComponent(slug)}/lineage`)
      .then((response) => (response.ok ? response.json() : {}))
      .catch(() => ({}))
      .then((data) => {
        if (!cancelled) setLineage(data);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const parent = lineage?.parents?.find((ring) => ring.slug !== ROOT_SLUG) ?? null;
  const branches = lineage?.children ?? [];
  const siblings = parent ? lineage?.siblingsCount ?? 0 : 0;

  // Relatives with posts; a sibling's posts aren't known, so each counts
  const withPosts = [parent, ...branches].filter((ring): ring is RelativeRing => !!ring && (ring.postCount ?? 0) > 0);
  const relativesWithPosts = withPosts.length + siblings;
  const feed: { label: string; scopes: FeedScope[] } | null =
    relativesWithPosts === 0
      ? null
      : {
          label: relativesWithPosts === 1 && withPosts[0] ? `With ${withPosts[0].name}` : "Whole family",
          scopes: parent ? ["family"] : ["current", "children"],
        };

  return { loaded: lineage !== null, parent, branches, feed };
}

export type RingFamily = ReturnType<typeof useRingFamily>;
