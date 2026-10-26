import { apiHandler } from "@/lib/api/handler";
import { ringHubUrl } from "@/lib/api/ringhub/ringhub-client";

export default apiHandler({ methods: ["GET"], auth: "none" }, async (req, res) => {
  const { slug } = req.query;

  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug parameter" });
  }

  try {
    // Validate slug format according to Ring Hub standards
    if (slug.length === 0 || slug.length < 3 || slug.length > 25) {
      return res.status(400).json({
        error: "Invalid slug",
        message: "Slug must be 3-25 characters long"
      });
    }

    // Pattern check: ^[a-z0-9-]+$
    const pattern = /^[a-z0-9-]+$/;
    if (!pattern.test(slug)) {
      return res.status(400).json({
        error: "Invalid slug",
        message: "Slug can only contain lowercase letters, numbers, and hyphens"
      });
    }

    // Cannot start or end with hyphen
    if (slug.startsWith('-') || slug.endsWith('-')) {
      return res.status(400).json({
        error: "Invalid slug",
        message: "Slug cannot start or end with a hyphen"
      });
    }

    // Cannot contain consecutive hyphens
    if (slug.includes('--')) {
      return res.status(400).json({
        error: "Invalid slug",
        message: "Slug cannot contain consecutive hyphens"
      });
    }

    // Ask the hub's own check: it sees every ring, private ones too, where
    // reading the ring (getRing) 404s for a private ring and called it free.
    const hubUrl = ringHubUrl().replace(/\/$/, '');
    const response = await fetch(`${hubUrl}/trp/rings/check-availability/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Ring Hub check-availability: HTTP ${response.status}`);
    const { available } = (await response.json()) as { available?: boolean };
    return res.status(200).json({
      available: available === true,
      slug,
      message: available === true ? `Ring slug '${slug}' is available` : `Ring slug '${slug}' is already taken`
    });

  } catch (error: any) {
    console.error("Error checking slug availability:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to check slug availability"
    });
  }
});
