import { apiHandler } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { loadCatalogArt, loadDecorationRows, toSceneDecorations } from "@/lib/pixel-homes/home-scene";
import { residentAccess, sendPrivateProfile } from "@/lib/domain/users/profile-access";

export default apiHandler(
  { methods: ["GET"], auth: "optional" },
  async (req, res, { user: viewer }) => {
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

      const access = await residentAccess(viewer, user.id);
      if (!access.visible) return sendPrivateProfile(res, access.visibility);

      // Load decorations and home config for this user
      const [decorations, homeConfig] = await Promise.all([
        loadDecorationRows(user.id),
        db.userHomeConfig.findUnique({
          where: { userId: user.id }
        })
      ]);

      // Catalog art (renderSvg, pngUrl), with layers recomputed for y-sorting
      // (fixes legacy decorations with incorrect layer values)
      const catalog = await loadCatalogArt(decorations.map(d => d.decorationId));
      const decorationItems = toSceneDecorations(decorations, catalog);

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
);
