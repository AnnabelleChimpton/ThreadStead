import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { decodeImageDataUrl } from "@/lib/media/image";
import { publishSprite, SpriteError } from "@/lib/pixel-homes/decoration-art";

const RELEASES = ["ADMIN_ONLY", "PUBLIC", "LIMITED_TIME", "CLAIM_CODE", "DEFAULT", "BETA_USERS"] as const;

const Body = z.object({
  filename: z.string().min(1),
  imageData: z.string().min(1),
  allowOffPalette: z.boolean().optional(),
  name: z.string().max(80).optional(),
  releaseType: z.enum(RELEASES).optional(),
  releaseStartAt: z.iso.datetime({ offset: true }).nullish(),
  releaseEndAt: z.iso.datetime({ offset: true }).nullish(),
  collection: z.string().max(60).nullish(),
  description: z.string().max(500).nullish(),
});

/**
 * POST /api/admin/decorations/sprites — "New from PNG", step 2.
 * Stores the PNG as the item's next version ({itemId}.v{n}.png) and points
 * the item at it, creating the item when the itemId is new. Release fields
 * only apply to a new item; an existing one keeps its release.
 */
export default apiHandler(
  { methods: ["POST"], auth: "admin", rateLimit: "admin" },
  async (req, res, { user }) => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Some of the details aren't right." });
    const body = parsed.data;
    const decoded = decodeImageDataUrl(body.imageData);
    if (!decoded) return res.status(400).json({ error: "That isn't a PNG." });

    try {
      const { item, version, created } = await publishSprite({
        filename: body.filename,
        input: decoded.buffer,
        allowOffPalette: body.allowOffPalette,
        adminId: user.id,
        fields: {
          name: body.name,
          releaseType: body.releaseType,
          releaseStartAt: body.releaseStartAt ? new Date(body.releaseStartAt) : null,
          releaseEndAt: body.releaseEndAt ? new Date(body.releaseEndAt) : null,
          collection: body.collection,
          description: body.description,
        },
      });
      return res.status(created ? 201 : 200).json({ item, version, created });
    } catch (error) {
      if (error instanceof SpriteError) return res.status(400).json({ error: error.message });
      throw error;
    }
  }
);

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };
