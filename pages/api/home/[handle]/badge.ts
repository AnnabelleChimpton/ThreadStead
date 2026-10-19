import { db } from "@/lib/config/database/connection";
import { apiHandler } from "@/lib/api/handler";
import { SITE_NAME } from "@/lib/config/site/constants";
import { residentAccess } from "@/lib/domain/users/profile-access";
import { houseCustomizationsFromConfig } from "@/lib/pixel-homes/home-scene";
import { houseNumbersOf } from "@/lib/pixel-homes/street";
import { houseBadgeSvg } from "@/lib/pixel-homes/house-badge";
import type { ColorPalette, HouseTemplate } from "@/components/pixel-homes/HouseSVG";

/**
 * GET /api/home/<handle>/badge: the resident's 88×31 house badge as SVG
 * (lib/pixel-homes/house-badge.ts). It shows the house, so it follows the
 * house's rules: a home this viewer may not see, or no home, is a 404.
 */
export default apiHandler({ methods: ["GET"], auth: "optional" }, async (req, res, { user: viewer }) => {
  const raw = typeof req.query.handle === "string" ? req.query.handle : "";
  const handle = raw.replace(/^@/, "").toLowerCase();
  if (!handle) return res.status(404).end();

  const row = await db.handle.findFirst({
    where: { handle, host: SITE_NAME },
    select: {
      handle: true,
      user: {
        select: {
          id: true,
          homeConfig: true,
          profile: { select: { displayName: true, visibility: true } },
        },
      },
    },
  });
  const config = row?.user.homeConfig;
  if (!row || !config) return res.status(404).end();

  const access = await residentAccess(viewer, row.user.id, row.user.profile?.visibility ?? null);
  if (!access.visible) return res.status(404).end();

  const numbers = await houseNumbersOf(db, [row.user.id], SITE_NAME);
  const svg = houseBadgeSvg({
    template: config.houseTemplate as HouseTemplate,
    palette: config.palette as ColorPalette,
    customizations: houseCustomizationsFromConfig(config),
    name: row.user.profile?.displayName || row.handle,
    number: numbers.get(row.user.id) ?? null,
  });

  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  // Who may see it depends on the viewer, so only their browser keeps a copy
  res.setHeader("Cache-Control", "private, max-age=300");
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Opened on its own, an SVG is a document: let it draw and nothing else
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  res.status(200).send(svg);
});
