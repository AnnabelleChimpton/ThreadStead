import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/config/database/connection";

interface DecorationItem {
  id: string;
  type: string;
  zone: string;
  position: { x: number; y: number; layer?: number };
  variant?: string;
  size?: string;
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

    // Transform to the format expected by the frontend
    const decorationItems: DecorationItem[] = decorations.map(decoration => ({
      id: `${decoration.decorationId}_${decoration.id}`,
      type: decoration.decorationType,
      zone: decoration.zone,
      position: {
        x: decoration.positionX,
        y: decoration.positionY,
        layer: decoration.layer
      },
      variant: decoration.variant || 'default',
      size: decoration.size || 'medium'
    }));

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

    return res.status(200).json({
      ok: true,
      decorations: decorationItems,
      atmosphere: atmosphere
    });

  } catch (error) {
    console.error('Error loading decorations:', error);
    return res.status(500).json({ error: "Failed to load decorations" });
  }
}