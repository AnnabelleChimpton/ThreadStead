import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";
import { getDecorationDimensions } from "@/lib/pixel-homes/decoration-dimensions";

interface DecorationItem {
  id: string;
  decorationId: string;
  type: string;
  zone: string;
  position: { x: number; y: number; layer?: number };
  variant?: string;
  size?: string;
  data?: any;
  renderSvg?: string | null;
  pngUrl?: string | null;
  customAssetUrl?: string;
  slot?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { username } = req.query;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: "Username is required" });
  }

  try {
    // Find the user by username
    const user = await db.user.findFirst({
      where: {
        OR: [
          { primaryHandle: username },
          {
            handles: {
              some: {
                handle: username
              }
            }
          }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Load decorations and home config for this user
    const [decorations, homeConfig] = await Promise.all([
      db.userHomeDecoration.findMany({
        where: { userId: user.id },
        orderBy: [
          { layer: 'asc' },
          { createdAt: 'asc' }
        ]
      }),
      db.userHomeConfig.findUnique({
        where: { userId: user.id }
      })
    ]);

    // Fetch decoration items for renderSvg and pngUrl
    const allDecorationIds = new Set(decorations.map(d => d.decorationId));
    const decorationItemsFromCatalog = await db.decorationItem.findMany({
      where: {
        itemId: { in: Array.from(allDecorationIds) }
      },
      select: {
        itemId: true,
        renderSvg: true,
        pngUrl: true
      }
    });
    const decorationItemMap = new Map<string, { renderSvg: string | null; pngUrl: string | null }>(
      decorationItemsFromCatalog.map(item => [item.itemId, { renderSvg: item.renderSvg, pngUrl: item.pngUrl }])
    );

    // Transform to the format expected by the frontend
    // Recalculate layers for proper y-sorting (fixes legacy decorations with incorrect layer values)
    const decorationItems: DecorationItem[] = decorations.map(decoration => {
      // Calculate the correct layer based on actual decoration dimensions
      const decorationType = decoration.decorationType;
      const size = (decoration.size || 'medium') as 'small' | 'medium' | 'large';
      const dimensions = getDecorationDimensions(decoration.decorationId, decorationType, size);

      // Base layers separate categories:
      // Paths: 100000+ (Bottom)
      // Water: 200000+ (Middle)
      // Objects: 300000+ (Top)
      let baseLayer = 300000;
      if (decorationType === 'path') baseLayer = 100000;
      else if (decorationType === 'water') baseLayer = 200000;

      // Calculate bottom Y position for depth sorting
      const bottomY = Math.round(decoration.positionY + dimensions.height);
      const calculatedLayer = baseLayer + (bottomY * 1000) + Math.round(decoration.positionX);

      // Get catalog item data for renderSvg and pngUrl
      const catalogItem = decorationItemMap.get(decoration.decorationId);

      const baseItem: DecorationItem = {
        id: `${decoration.decorationId}_${decoration.id}`,
        decorationId: decoration.decorationId, // Base decoration ID for matching hardcoded SVGs
        type: decoration.decorationType,
        zone: decoration.zone,
        position: {
          x: decoration.positionX,
          y: decoration.positionY,
          layer: calculatedLayer
        },
        variant: decoration.variant || 'default',
        size: decoration.size || 'medium',
        data: decoration.data,
        ...(catalogItem?.renderSvg && { renderSvg: catalogItem.renderSvg }),
        ...(catalogItem?.pngUrl && { pngUrl: catalogItem.pngUrl })
      };

      // For custom type decorations, extract customAssetUrl and slot from data
      if (decoration.decorationType === 'custom' && decoration.data) {
        const data = decoration.data as { customAssetUrl?: string; slot?: number };
        if (data.customAssetUrl) {
          baseItem.customAssetUrl = data.customAssetUrl;
        }
        if (typeof data.slot === 'number') {
          baseItem.slot = data.slot;
        }
      }

      return baseItem;
    });

    // Extract atmosphere settings from home config
    const atmosphere = homeConfig ? {
      sky: homeConfig.atmosphereSky as 'sunny' | 'cloudy' | 'sunset' | 'night',
      weather: homeConfig.atmosphereWeather as 'clear' | 'light_rain' | 'light_snow',
      timeOfDay: homeConfig.atmosphereTimeOfDay as 'morning' | 'midday' | 'evening' | 'night'
    } : {
      sky: 'sunny' as const,
      weather: 'clear' as const,
      timeOfDay: 'midday' as const
    };

    const responseData = {
      ok: true,
      decorations: decorationItems,
      atmosphere: atmosphere,
      terrain: homeConfig?.terrain || {}
    };

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Error loading decorations:', error);
    return res.status(500).json({ error: "Failed to load decorations" });
  }
}