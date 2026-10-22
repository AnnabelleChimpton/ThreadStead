import type { NextApiResponse } from "next";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { scheduleHomeSnapshot } from "@/lib/pixel-homes/snapshot/service";
import { availableDecorationsWhere } from "@/lib/pixel-homes/decoration-availability";
import {
  TERRAIN_CELL,
  fieldErrors,
  isCustomAssetId,
  saveHomeSchema,
} from "@/lib/pixel-homes/decoration-save-rules";
import { customSlotOf } from "@/lib/pixel-homes/custom-art";
import { canHaveNote, cleanNote } from "@/lib/pixel-homes/decoration-note";

type FieldErrors = Record<string, string>;

/**
 * What's stored in a decoration's `data`. Custom art keeps only its slot
 * (never a file URL) and flip. An owner's note is cleaned the same way for
 * both, and dropped from decorations that already do something on click.
 */
function decorationData(decorationId: string, custom: boolean, data: Record<string, unknown> | null | undefined) {
  const { note: rawNote, ...rest } = data ?? {};
  const note = canHaveNote(decorationId) ? cleanNote(rawNote) : null;
  const base: Record<string, unknown> = custom
    ? { slot: customSlotOf(decorationId), ...(rest.flip === true && { flip: true }) }
    : rest;
  if (note) base.note = note;
  return Object.keys(base).length > 0 ? base : undefined;
}

function sendInvalid(res: NextApiResponse, fields: FieldErrors) {
  return res.status(400).json({ error: Object.values(fields)[0], fields });
}

export default apiHandler(
  { methods: ["POST"], auth: "user" },
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
      for (const [i, decoration] of decorations.entries()) {
        let problem: string | null = null;
        if (decoration.decorationType !== "custom") {
          if (!allowed.has(decoration.decorationId)) problem = "One of these decorations isn't available to you.";
        } else if (!isCustomAssetId(decoration.decorationId)) {
          // A resident's own art is named by its slot; the image comes from the slot when drawn
          problem = "Unknown decoration.";
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

      const decorationRecords = decorations.map((decoration) => {
        // On the grid, the cell decides the position; otherwise a free placement
        const onGrid = decoration.gridX != null && decoration.gridY != null;
        const custom = decoration.decorationType === "custom";
        return {
          userId: me.id,
          decorationType: decoration.decorationType,
          decorationId: decoration.decorationId,
          zone: decoration.zone,
          positionX: onGrid ? decoration.gridX! * TERRAIN_CELL : decoration.positionX,
          positionY: onGrid ? decoration.gridY! * TERRAIN_CELL : decoration.positionY,
          gridX: onGrid ? decoration.gridX! : null,
          gridY: onGrid ? decoration.gridY! : null,
          layer: decoration.layer || 1,
          layerBias: decoration.layerBias ?? 0,
          variant: decoration.variant || "default",
          size: decoration.size || "medium",
          data: decorationData(decoration.decorationId, custom, decoration.data) as Prisma.InputJsonValue | undefined,
        };
      });

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

      res.status(200).json({ ok: true, saved: decorations.length });
      // Redraw the share snapshot after answering; it logs its own failures.
      void scheduleHomeSnapshot(me.id);
      return;
    } catch (error) {
      console.error("Error saving decorations:", error);
      return res.status(500).json({ error: "The server hit a problem." });
    }
  }
);
