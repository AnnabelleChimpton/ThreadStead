import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
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
const SLOT_PROBLEM = `Pick a slot from 0 to ${MAX_SLOTS - 1}.`;

/**
 * A whole slot number. 1.5 passed the old typeof check, so the upload went
 * to storage and then slots[1.5] threw: a 500 and a file nothing pointed at.
 */
function isSlot(slot: unknown): slot is number {
  return Number.isInteger(slot) && (slot as number) >= 0 && (slot as number) < MAX_SLOTS;
}

interface CustomAssetSlot {
  slot: number;
  url: string | null;
}

// Helper to get slots array from database
async function getCustomAssetSlots(userId: string): Promise<CustomAssetSlot[]> {
  const homeConfig = await db.userHomeConfig.findUnique({
    where: { userId },
    select: { customAssets: true }
  });

  // Initialize empty slots
  const slots: CustomAssetSlot[] = Array.from({ length: MAX_SLOTS }, (_, i) => ({
    slot: i,
    url: null
  }));

  // If we have customAssets field, use it
  if (homeConfig?.customAssets) {
    const assets = homeConfig.customAssets as unknown as CustomAssetSlot[];
    for (const asset of assets) {
      if (asset.slot >= 0 && asset.slot < MAX_SLOTS && asset.url) {
        slots[asset.slot].url = asset.url;
      }
    }
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

export default apiHandler(
  { methods: ["GET", "POST", "DELETE"], auth: "user" },
  async (req, res, { user: me }) => {
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
      const { slot, imageDataUrl } = (req.body ?? {}) as { slot: unknown; imageDataUrl: unknown };

      if (!isSlot(slot)) return res.status(400).json({ error: SLOT_PROBLEM });

      if (!imageDataUrl || typeof imageDataUrl !== "string") {
        return res.status(400).json({ error: "No image data provided" });
      }

      // Validate the image data
      const validation = validateCustomAssetDataUrl(imageDataUrl);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      try {
        // Upload first: if it fails, the slot keeps its old image
        const { customAssetUrl } = await uploadCustomPixelArt(imageDataUrl, me.id);

        // Then point the slot at it (placed copies follow the slot)
        const slots = await getCustomAssetSlots(me.id);
        const oldUrl = slots[slot].url;
        slots[slot].url = customAssetUrl;
        await saveCustomAssetSlots(me.id, slots);

        // Only now is the old file unused
        if (oldUrl && oldUrl !== customAssetUrl) {
          await deleteCustomPixelArt(oldUrl).catch((e) => console.error('Error deleting old asset:', e));
        }

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
      const { slot } = (req.body ?? {}) as { slot: unknown };

      if (!isSlot(slot)) return res.status(400).json({ error: SLOT_PROBLEM });

      try {
        // Get current slots
        const slots = await getCustomAssetSlots(me.id);

        // Clear the slot first, then delete the file nothing points at
        const oldUrl = slots[slot].url;
        if (oldUrl) {
          slots[slot].url = null;
          await saveCustomAssetSlots(me.id, slots);
          await deleteCustomPixelArt(oldUrl).catch((e) => console.error('Error deleting asset from storage:', e));
        }

        return res.status(200).json({ ok: true, slot, slots });
      } catch (error) {
        console.error('Error deleting custom asset:', error);
        return res.status(500).json({ error: "Failed to delete custom asset" });
      }
    }
  }
);
