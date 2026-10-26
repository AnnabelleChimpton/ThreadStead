import { apiHandler } from "@/lib/api/handler";
import { getRingHubClient } from "@/lib/api/ringhub/ringhub-client";
import { transformRingDescriptorToThreadRing } from "@/lib/api/ringhub/ringhub-transformers";
import { cached } from "@/lib/api/ringhub/ringhub-cache";
import { RingHubAuthError, RingHubUnavailableError } from "@/lib/api/ringhub/ringhub-errors";

export default apiHandler({ methods: ["GET"], auth: "none" }, async (req, res) => {
  const { slug } = req.query;

  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  try {
    const client = getRingHubClient();

    let ringDescriptor;
    try {
      ringDescriptor = await cached(
        `ring:${slug}`,
        30_000,
        5 * 60_000,
        () => client.getRing(slug)
      );
    } catch (error) {
      if (error instanceof RingHubAuthError || error instanceof RingHubUnavailableError) {
        console.error('Ring Hub unavailable for ring fetch:', error.name, error.message);
        return res.status(503).json({ error: 'hub_unavailable', degraded: true });
      }
      throw error;
    }

    if (!ringDescriptor) {
      return res.status(404).json({ error: "ThreadRing not found" });
    }

    // Transform Ring Hub descriptor to ThreadRing format
    // Note: We'll need to fetch members separately if needed
    const ring = transformRingDescriptorToThreadRing(ringDescriptor);
    
    // For now, return a simplified response matching the expected format
    // Members will be fetched separately via the members endpoint
    return res.status(200).json({ 
      ring: {
        ...ring,
        curator: null, // Will be populated from members with role=curator
        members: [] // Members fetched separately via /api/threadrings/[slug]/members
      }
    });
  } catch (error: any) {
    console.error("ThreadRing fetch error:", error);
    res.status(500).json({ error: "Failed to fetch ThreadRing" });
  }
});
