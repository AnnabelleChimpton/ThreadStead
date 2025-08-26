import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/lib/auth-server";
import { uploadBadgeImage } from "@/lib/badge-uploader";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Verify user is authenticated
    const viewer = await getSessionUser(req);
    if (!viewer) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { imageDataUrl, ringSlug } = req.body;

    // Validate input
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: "Invalid image data URL" });
    }

    if (!ringSlug || typeof ringSlug !== 'string') {
      return res.status(400).json({ error: "Ring slug is required" });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(ringSlug)) {
      return res.status(400).json({ error: "Invalid ring slug format" });
    }

    // Upload badge image
    const badgeUrls = await uploadBadgeImage(imageDataUrl, ringSlug);

    return res.json({
      success: true,
      badgeImageUrl: badgeUrls.badgeImageUrl,
      badgeImageHighResUrl: badgeUrls.badgeImageHighResUrl
    });

  } catch (error) {
    console.error("Badge upload error:", error);
    return res.status(500).json({ 
      error: "Failed to upload badge image",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}