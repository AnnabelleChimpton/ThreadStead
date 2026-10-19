/**
 * A resident's yard as the canvas draws it: the house, sky, terrain and the
 * placed decorations, in the shape EnhancedHouseCanvas takes.
 *
 * Shared by GET /api/home/decorations/load (the live canvas) and the share
 * snapshot (lib/pixel-homes/snapshot), so the picture and the page agree on
 * what's in the yard and in what order it's stacked.
 */
import type { Prisma, UserHomeConfig, UserHomeDecoration } from "@prisma/client";
import { db } from "@/lib/config/database/connection";
import { getDecorationDimensions } from "@/lib/pixel-homes/decoration-dimensions";
import type { ColorPalette, HouseCustomizations, HouseTemplate } from "@/components/pixel-homes/HouseSVG";
import type { SkyType } from "@/components/pixel-homes/DitherPatternDefs";

export interface SceneDecoration {
  id: string;
  decorationId: string;
  type: string;
  zone: string;
  position: { x: number; y: number; layer?: number };
  variant?: string;
  size?: string;
  data?: Prisma.JsonValue;
  renderSvg?: string | null;
  pngUrl?: string | null;
  customAssetUrl?: string;
  slot?: number;
}

export interface HomeScene {
  template: HouseTemplate;
  palette: ColorPalette;
  houseCustomizations: HouseCustomizations;
  sky: SkyType;
  terrain: Record<string, string>;
  decorations: SceneDecoration[];
}

type CatalogArt = { renderSvg: string | null; pngUrl: string | null };

/**
 * Stacking order for a placed decoration: paths under water under
 * everything else, then by where its bottom edge sits (further down the
 * yard is nearer the viewer), then left to right. Recomputed on load, so
 * legacy rows with stale `layer` values still stack right.
 */
export function decorationLayer(row: Pick<UserHomeDecoration, "decorationId" | "decorationType" | "size" | "positionX" | "positionY">): number {
  const size = (row.size || "medium") as "small" | "medium" | "large";
  const dimensions = getDecorationDimensions(row.decorationId, row.decorationType, size);
  let baseLayer = 300000;
  if (row.decorationType === "path") baseLayer = 100000;
  else if (row.decorationType === "water") baseLayer = 200000;
  const bottomY = Math.round(row.positionY + dimensions.height);
  return baseLayer + bottomY * 1000 + Math.round(row.positionX);
}

/** A sign's text, kept in the decoration's data. */
export function decorationText(item: Pick<SceneDecoration, "data">): string | undefined {
  const text = (item.data as { text?: unknown } | null | undefined)?.text;
  return typeof text === "string" ? text : undefined;
}

/** Stored decoration rows → the items the canvas renders. */
export function toSceneDecorations(
  rows: UserHomeDecoration[],
  catalog: Map<string, CatalogArt>
): SceneDecoration[] {
  return rows.map((decoration) => {
    const catalogItem = catalog.get(decoration.decorationId);
    const item: SceneDecoration = {
      id: `${decoration.decorationId}_${decoration.id}`,
      decorationId: decoration.decorationId, // base id, for matching the code-drawn SVGs
      type: decoration.decorationType,
      zone: decoration.zone,
      position: { x: decoration.positionX, y: decoration.positionY, layer: decorationLayer(decoration) },
      variant: decoration.variant || "default",
      size: decoration.size || "medium",
      data: decoration.data,
      ...(catalogItem?.renderSvg && { renderSvg: catalogItem.renderSvg }),
      ...(catalogItem?.pngUrl && { pngUrl: catalogItem.pngUrl }),
    };
    if (decoration.decorationType === "custom" && decoration.data) {
      const data = decoration.data as { customAssetUrl?: string; slot?: number };
      if (data.customAssetUrl) item.customAssetUrl = data.customAssetUrl;
      if (typeof data.slot === "number") item.slot = data.slot;
    }
    return item;
  });
}

/** Catalog art (code SVG override and PNG) for the decorations in a yard. */
export async function loadCatalogArt(decorationIds: Iterable<string>): Promise<Map<string, CatalogArt>> {
  const ids = [...new Set(decorationIds)];
  if (ids.length === 0) return new Map();
  const items = await db.decorationItem.findMany({
    where: { itemId: { in: ids } },
    select: { itemId: true, renderSvg: true, pngUrl: true },
  });
  return new Map(items.map((item) => [item.itemId, { renderSvg: item.renderSvg, pngUrl: item.pngUrl }]));
}

/** The decoration rows in the order the canvas has always received them. */
export function loadDecorationRows(userId: string): Promise<UserHomeDecoration[]> {
  return db.userHomeDecoration.findMany({
    where: { userId },
    orderBy: [{ layer: "asc" }, { createdAt: "asc" }],
  });
}

/** The house's style, colour and text settings, as HouseSVG takes them. */
export function houseCustomizationsFromConfig(config: UserHomeConfig): HouseCustomizations {
  const c: Record<string, unknown> = {
    windowStyle: config.windowStyle,
    doorStyle: config.doorStyle,
    roofTrim: config.roofTrim,
    wallColor: config.wallColor,
    roofColor: config.roofColor,
    trimColor: config.trimColor,
    windowColor: config.windowColor,
    detailColor: config.detailColor,
    houseTitle: config.houseTitle,
    houseDescription: config.houseDescription,
    houseBoardText: config.houseBoardText,
    houseNumber: config.houseNumber,
    houseNumberStyle: config.houseNumberStyle,
    welcomeMat: config.welcomeMat,
    welcomeMatText: config.welcomeMatText,
    welcomeMatColor: config.welcomeMatColor,
    chimneyStyle: config.chimneyStyle,
    exteriorLights: config.exteriorLights,
    windowTreatments: config.windowTreatments,
  };
  // null columns mean "not set"; HouseSVG reads undefined as "use the default"
  for (const key of Object.keys(c)) if (c[key] === null) delete c[key];
  return c as HouseCustomizations;
}

/** Everything the snapshot needs to draw `userId`'s yard; null if they have no home yet. */
export async function loadHomeScene(userId: string): Promise<HomeScene | null> {
  const [config, rows] = await Promise.all([
    db.userHomeConfig.findUnique({ where: { userId } }),
    loadDecorationRows(userId),
  ]);
  if (!config) return null;
  const catalog = await loadCatalogArt(rows.map((r) => r.decorationId));
  return {
    template: config.houseTemplate as HouseTemplate,
    palette: config.palette as ColorPalette,
    houseCustomizations: houseCustomizationsFromConfig(config),
    sky: config.atmosphereSky as SkyType,
    terrain: (config.terrain as Record<string, string> | null) || {},
    decorations: toSceneDecorations(rows, catalog),
  };
}
