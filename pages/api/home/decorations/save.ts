import type { NextApiResponse } from "next";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { keyFromPublicUrl } from "@/lib/storage/r2";
import { availableDecorationsWhere } from "@/lib/pixel-homes/decoration-availability";
import {
  fieldErrors,
  isCustomAssetId,
  saveHomeSchema,
} from "@/lib/pixel-homes/decoration-save-rules";

type FieldErrors = Record<string, string>;

function sendInvalid(res: NextApiResponse, fields: FieldErrors) {
  return res.status(400).json({ error: Object.values(fields)[0], fields });
}

/** Own uploads live at `pixel-homes/custom/<userId>-…` in our bucket. */
function isOwnUpload(url: string, userId: string): boolean {
  return !!keyFromPublicUrl(url)?.startsWith(`pixel-homes/custom/${userId}-`);
}

/**
 * URLs of art this resident already uses: their current slots and placed
 * copies. Those stay valid if the CDN origin has changed since upload.
 */
async function knownCustomArtUrls(userId: string): Promise<Set<string>> {
  const [config, placed] = await Promise.all([
    db.userHomeConfig.findUnique({ where: { userId }, select: { customAssets: true } }),
    db.userHomeDecoration.findMany({ where: { userId, decorationType: "custom" }, select: { data: true } }),
  ]);
  const urls = new Set<string>();
  const add = (value: unknown) => {
    const url = (value as { url?: unknown; customAssetUrl?: unknown } | null);
    for (const v of [url?.url, url?.customAssetUrl]) if (typeof v === "string") urls.add(v);
  };
  if (Array.isArray(config?.customAssets)) config.customAssets.forEach(add);
  placed.forEach((d) => add(d.data));
  return urls;
}

export default apiHandler(
  // no CSRF today: pages/home/[handle]/decorate.tsx POSTs with plain fetch
  { methods: ["POST"], auth: "user", csrf: false },
  async (req, res, { user: me }) => {
    const parsed = saveHomeSchema.safeParse(req.body);
    if (!parsed.success) return sendInvalid(res, fieldErrors(parsed.error));
    const { decorations, atmosphere, houseCustomizations, template, palette, terrain } = parsed.data;

    try {
      // Every catalog item must be one this resident can use now, or one
      // already in their yard (a limited release that has ended stays put).
      const catalogIds = [
        ...new Set(decorations.filter((d) => d.decorationType !== "custom").map((d) => d.decorationId)),
      ];
      const [available, alreadyPlaced] = catalogIds.length
        ? await Promise.all([
            db.decorationItem.findMany({
              where: { AND: [{ itemId: { in: catalogIds } }, availableDecorationsWhere(me)] },
              select: { itemId: true },
            }),
            db.userHomeDecoration.findMany({
              where: { userId: me.id, decorationId: { in: catalogIds } },
              select: { decorationId: true },
              distinct: ["decorationId"],
            }),
          ])
        : [[], []];
      const allowed = new Set([...available.map((d) => d.itemId), ...alreadyPlaced.map((d) => d.decorationId)]);

      const problems: FieldErrors = {};
      let knownArt: Set<string> | null = null;
      for (const [i, decoration] of decorations.entries()) {
        let problem: string | null = null;
        if (decoration.decorationType !== "custom") {
          if (!allowed.has(decoration.decorationId)) problem = "One of these decorations isn't available to you.";
        } else if (!isCustomAssetId(decoration.decorationId)) {
          problem = "Unknown decoration.";
        } else {
          const url = decoration.data?.customAssetUrl;
          if (url !== undefined && url !== null) {
            if (typeof url !== "string") {
              problem = "That pixel art isn't one of your uploads.";
            } else if (!isOwnUpload(url, me.id)) {
              knownArt ??= await knownCustomArtUrls(me.id);
              if (!knownArt.has(url)) problem = "That pixel art isn't one of your uploads.";
            }
          }
        }
        if (problem) problems[`decorations.${i}.decorationId`] = problem;
      }
      if (Object.keys(problems).length) return sendInvalid(res, problems);

      const configUpdate: Record<string, unknown> = {};
      if (atmosphere) {
        configUpdate.atmosphereSky = atmosphere.sky;
        configUpdate.atmosphereWeather = atmosphere.weather;
        configUpdate.atmosphereTimeOfDay = atmosphere.timeOfDay;
      }
      if (template) configUpdate.houseTemplate = template;
      if (palette) configUpdate.palette = palette;
      if (houseCustomizations) {
        // undefined leaves a column alone; null clears it
        Object.assign(configUpdate, houseCustomizations);
      }
      if (terrain) configUpdate.terrain = terrain;

      const decorationRecords = decorations.map((decoration) => ({
        userId: me.id,
        decorationType: decoration.decorationType,
        decorationId: decoration.decorationId,
        zone: decoration.zone,
        positionX: decoration.positionX,
        positionY: decoration.positionY,
        layer: decoration.layer || 1,
        variant: decoration.variant || "default",
        size: decoration.size || "medium",
        data: (decoration.data ?? undefined) as Prisma.InputJsonValue | undefined,
      }));

      // One transaction for the config and the decorations, so a failure
      // can't leave a new house with the old yard (or no yard: the replace
      // is a delete then a create).
      await db.$transaction(async (tx) => {
        await tx.userHomeConfig.upsert({
          where: { userId: me.id },
          update: configUpdate,
          create: {
            seasonalOptIn: false,
            preferPixelHome: true,
            houseTemplate: template || "cottage_v1",
            palette: palette || "thread_sage",
            atmosphereSky: atmosphere?.sky || "sunny",
            atmosphereWeather: atmosphere?.weather || "clear",
            atmosphereTimeOfDay: atmosphere?.timeOfDay || "midday",
            ...houseCustomizations,
            windowStyle: houseCustomizations?.windowStyle || "default",
            doorStyle: houseCustomizations?.doorStyle || "default",
            roofTrim: houseCustomizations?.roofTrim || "default",
            terrain: terrain || {},
            userId: me.id,
          },
        });
        await tx.userHomeDecoration.deleteMany({ where: { userId: me.id } });
        if (decorationRecords.length > 0) {
          await tx.userHomeDecoration.createMany({ data: decorationRecords });
        }
      });

      return res.status(200).json({ ok: true, saved: decorations.length });
    } catch (error) {
      console.error("Error saving decorations:", error);
      return res.status(500).json({ error: "The server hit a problem." });
    }
  }
);
