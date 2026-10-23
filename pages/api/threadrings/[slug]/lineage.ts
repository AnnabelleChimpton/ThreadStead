import { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '@/lib/auth/server';
import { createAuthenticatedRingHubClient } from '@/lib/api/ringhub/ringhub-user-operations';
import { featureFlags } from '@/lib/utils/features/feature-flags';
import { getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client';
import { RingHubUnavailableError } from '@/lib/api/ringhub/ringhub-errors';
import { cached } from '@/lib/api/ringhub/ringhub-cache';
import { readAsViewer } from '@/lib/rings/read-as-viewer';

const FRESH_MS = 30_000;
const STALE_MS = 5 * 60_000;

/** Every ring under these, however deep */
function countDescendants(nodes: any[]): number {
  return nodes.reduce((count, node) => count + 1 + countDescendants(Array.isArray(node.children) ? node.children : []), 0);
}

/**
 * A ring's family: where it branched from, what branched from it, and how
 * many siblings it has. Read signed as the viewer, so a private ring's
 * members see it, and cached per viewer: the hub walks the whole subtree for
 * this, and the Spool's subtree is every ring.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { slug } = req.query;
  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid slug parameter' });
  }

  const empty = { lineage: [], ancestors: [], descendants: [], parents: [], children: [], directChildrenCount: 0, totalDescendantsCount: 0, siblingsCount: 0, lineageDepth: 0, lineagePath: '' };
  if (!featureFlags.ringhub()) return res.status(200).json(empty);

  const viewer = await getSessionUser(req);
  const publicClient = getPublicRingHubClient();
  const asPublic = (ringSlug: string) => {
    if (!publicClient) throw new RingHubUnavailableError('Ring Hub client not available');
    return publicClient.getRingLineage(ringSlug);
  };

  try {
    const body = await cached(`ring-lineage:${viewer?.id ?? 'public'}:${slug}`, FRESH_MS, STALE_MS, async () => {
      const lineageData = await readAsViewer(
        viewer ? () => createAuthenticatedRingHubClient(viewer.id).getRingLineageAsMember(slug) : null,
        () => asPublic(slug)
      );
      const ring = lineageData?.ring;
      const ancestors = lineageData?.ancestors || [];
      const descendants = lineageData?.descendants || [];
      const parent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;

      // Siblings: the parent's direct children, less this ring. One ring read
      // (cached for everyone), not the parent's whole subtree.
      let siblingsCount = 0;
      if (parent?.slug && publicClient) {
        try {
          const parentRing = await cached(`ring:${parent.slug}`, FRESH_MS, STALE_MS, () => publicClient.getRing(parent.slug));
          siblingsCount = (parentRing?.children || []).filter((child) => child.slug !== slug).length;
        } catch {
          // Without it, the feed just doesn't offer "Sibling Rings"
        }
      }

      return {
        lineage: ancestors,
        ring,
        parents: parent ? [parent] : [],
        children: descendants,
        ancestors,
        descendants,
        directChildrenCount: descendants.length,
        totalDescendantsCount: countDescendants(descendants),
        siblingsCount,
        lineageDepth: ancestors.length,
        lineagePath: ancestors.map((r) => r.name).join(' → ') || ring?.name || 'Root',
      };
    });
    return res.json(body);
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (status === 404) return res.status(404).json({ error: 'Ring not found' });
    console.error('Ring Hub lineage fetch failed:', error);
    return res.status(503).json({ error: 'hub_unavailable', degraded: true });
  }
}
