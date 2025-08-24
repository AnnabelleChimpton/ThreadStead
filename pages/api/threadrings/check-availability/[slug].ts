import type { NextApiRequest, NextApiResponse } from "next";
import { featureFlags } from "@/lib/feature-flags";
import { getRingHubClient } from "@/lib/ringhub-client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

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

    // Check availability using Ring Hub API if enabled
    if (featureFlags.ringhub()) {
      const client = getRingHubClient();
      if (client) {
        try {
          // Try to get the ring - if it exists, it's taken
          const existingRing = await client.getRing(slug);
          if (existingRing) {
            return res.status(200).json({
              available: false,
              slug: slug,
              message: `Ring slug '${slug}' is already taken`
            });
          }
        } catch (error: any) {
          // If getRing throws an error, the ring likely doesn't exist
          // This is expected behavior for available slugs
          if (error.status === 404 || error.message?.includes('not found')) {
            return res.status(200).json({
              available: true,
              slug: slug,
              message: `Ring slug '${slug}' is available`
            });
          }
          // For other errors, we should still return them
          throw error;
        }
      }
    }

    // If Ring Hub is not enabled, assume available
    // (local database checking could be added here if needed)
    return res.status(200).json({
      available: true,
      slug: slug,
      message: `Ring slug '${slug}' is available`
    });

  } catch (error: any) {
    console.error("Error checking slug availability:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to check slug availability"
    });
  }
}