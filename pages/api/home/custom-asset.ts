import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getSessionUser } from "@/lib/auth/server";
import {
  uploadCustomPixelArt,
  deleteCustomPixelArt,
  validateCustomAssetDataUrl
} from "@/lib/pixel-homes/custom-asset-uploader";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500kb', // Allow up to 500KB for base64 encoded images
    },
  },
};

const MAX_SLOTS = 5;

interface CustomAssetSlot {
  slot: number;
  url: string | null;
}

// Helper to get slots array from database, migrating legacy single URL if needed
async function getCustomAssetSlots(userId: string): Promise<CustomAssetSlot[]> {
  const homeConfig = await db.userHomeConfig.findUnique({
    where: { userId },
    select: { customAssets: true, customAssetUrl: true }
  });

  // Initialize empty slots
  const slots: CustomAssetSlot[] = Array.from({ length: MAX_SLOTS }, (_, i) => ({
    slot: i,
    url: null
  }));

  // If we have the new customAssets field, use it
  if (homeConfig?.customAssets) {
    const assets = homeConfig.customAssets as unknown as CustomAssetSlot[];
    for (const asset of assets) {
      if (asset.slot >= 0 && asset.slot < MAX_SLOTS && asset.url) {
        slots[asset.slot].url = asset.url;
      }
    }
  }
  // Migrate legacy single customAssetUrl to slot 0 if customAssets is empty
  else if (homeConfig?.customAssetUrl && !slots.some(s => s.url)) {
    slots[0].url = homeConfig.customAssetUrl;
    // Migrate to new field
    await db.userHomeConfig.update({
      where: { userId },
      data: {
        customAssets: slots.filter(s => s.url) as unknown as any,
        customAssetUrl: null // Clear legacy field
      }
    });
  }

  return slots;
}

// Helper to save slots to database
async function saveCustomAssetSlots(userId: string, slots: CustomAssetSlot[]): Promise<void> {
  // Only save slots that have URLs
  const slotsWithUrls = slots.filter(s => s.url) as unknown as any;

  await db.userHomeConfig.upsert({
    where: { userId },
    update: { customAssets: slotsWithUrls },
    create: {
      userId,
      houseTemplate: 'cottage_v1',
      palette: 'thread_sage',
      customAssets: slotsWithUrls
    }
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const me = await getSessionUser(req);
  if (!me) {
    return res.status(401).json({ error: "Not logged in" });
  }

  // GET - Retrieve all custom asset slots
  if (req.method === "GET") {
    try {
      const slots = await getCustomAssetSlots(me.id);
      return res.status(200).json({ slots });
    } catch (error) {
      console.error('Error fetching custom assets:', error);
      return res.status(500).json({ error: "Failed to fetch custom assets" });
    }
  }

  // POST - Upload to a specific slot
  if (req.method === "POST") {
    const { slot, imageDataUrl } = req.body as { slot: number; imageDataUrl: string };

    // Validate slot number
    if (typeof slot !== 'number' || slot < 0 || slot >= MAX_SLOTS) {
      return res.status(400).json({ error: `Invalid slot number. Must be 0-${MAX_SLOTS - 1}` });
    }

    if (!imageDataUrl) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // Validate the image data
    const validation = validateCustomAssetDataUrl(imageDataUrl);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      // Get current slots
      const slots = await getCustomAssetSlots(me.id);

      // Delete old asset in this slot if it exists
      if (slots[slot].url) {
        try {
          await deleteCustomPixelArt(slots[slot].url!);
        } catch (e) {
          console.error('Error deleting old asset:', e);
          // Continue anyway - the old file might already be gone
        }
      }

      // Upload new custom asset
      const { customAssetUrl } = await uploadCustomPixelArt(imageDataUrl, me.id);

      // Update the slot
      slots[slot].url = customAssetUrl;

      // Save to database
      await saveCustomAssetSlots(me.id, slots);

      return res.status(200).json({
        ok: true,
        slot,
        url: customAssetUrl,
        slots
      });
    } catch (error) {
      console.error('Error uploading custom asset:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to upload custom asset"
      });
    }
  }

  // DELETE - Remove from a specific slot
  if (req.method === "DELETE") {
    const { slot } = req.body as { slot: number };

    // Validate slot number
    if (typeof slot !== 'number' || slot < 0 || slot >= MAX_SLOTS) {
      return res.status(400).json({ error: `Invalid slot number. Must be 0-${MAX_SLOTS - 1}` });
    }

    try {
      // Get current slots
      const slots = await getCustomAssetSlots(me.id);

      // Delete asset from storage if it exists
      if (slots[slot].url) {
        try {
          await deleteCustomPixelArt(slots[slot].url!);
        } catch (e) {
          console.error('Error deleting asset from storage:', e);
          // Continue anyway
        }

        // Clear the slot
        slots[slot].url = null;

        // Save to database
        await saveCustomAssetSlots(me.id, slots);
      }

      return res.status(200).json({ ok: true, slot, slots });
    } catch (error) {
      console.error('Error deleting custom asset:', error);
      return res.status(500).json({ error: "Failed to delete custom asset" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
