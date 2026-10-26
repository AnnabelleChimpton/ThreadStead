import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { badgeChoiceSchema, drawAndUploadRingBadge } from "@/lib/rings/badge";
import { AuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { RingHubAuthError, RingHubUnavailableError } from "@/lib/api/ringhub/ringhub-errors";
import { forgetRingReads } from "@/lib/api/ringhub/forget-ring-reads";
import { HUB_UNREACHABLE } from "@/lib/domain/threadrings/ring-access";

/** Ring Hub's rule for a ring's address (its fork route checks the same) */
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_RULE = "A ring's address is 3 to 25 lowercase letters, numbers and single hyphens.";

/**
 * What ForkThreadRingForm sends. Badge image addresses aren't taken from
 * here any more: the form never sent them, and they went to the hub as
 * they came, so a crafted request made any image the new ring's badge.
 * The badge is the one picked in the form, drawn here.
 */
const forkSchema = z.object({
  name: z.string().trim().min(1, "Give the ring a name.").max(100),
  slug: z.string().trim().max(25).optional(),
  description: z.string().max(500).nullable().optional(),
  joinType: z.enum(["open", "invite", "closed"]),
  visibility: z.enum(["public", "unlisted", "private"]),
  badge: z.unknown().optional(),
});

const JOIN_POLICY = { open: "OPEN", invite: "INVITATION", closed: "CLOSED" } as const;

/**
 * The hub's answer, as a plain sentence; the form shows `error` as it
 * comes, and it was the hub's own text plus `details`. A 429 passes through:
 * the form reads its `details` to say which limit it was.
 */
function forkFailure(error: unknown): [number, Record<string, unknown>] {
  if (error instanceof RingHubAuthError || error instanceof RingHubUnavailableError) {
    return [503, { error: HUB_UNREACHABLE, degraded: true }];
  }
  const { status, data } = (error ?? {}) as { status?: number; data?: { error?: unknown } & Record<string, unknown> };
  if (status === 429 && data) return [429, data];
  if (status === 404) return [404, { error: "We couldn't find the ring you're branching from." }];
  if (status === 400 && data?.error === "Slug unavailable") return [400, { error: "That address is taken. Try another." }];
  if (status === 400) return [400, { error: SLUG_RULE }];
  if (status === 403) return [403, { error: "Ring Hub says you can't branch this ring." }];
  if (status === 401) return [503, { error: HUB_UNREACHABLE, degraded: true }];
  return [502, { error: "Couldn't start the ring. Try again in a minute." }];
}

/** Start a ring branching from this one, signed as the resident, who hosts it */
export default apiHandler(
  { methods: ["POST"], auth: "user", rateLimit: "threadring_operations", schema: forkSchema },
  async (req, res, { user: viewer, body }) => {
    const { slug } = req.query;
    if (typeof slug !== "string") {
      return res.status(400).json({ error: "Invalid slug" });
    }

    const name = body.name;
    // The form sends one made from the name; without it, it's made here the same way
    const forkSlug = body.slug || name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (forkSlug.length < 3 || forkSlug.length > 25 || !SLUG.test(forkSlug)) {
      return res.status(400).json({ error: SLUG_RULE });
    }

    // The badge they picked, else the default; a new ring has no theme colour
    // yet, so its slug picks the palette. Without one it starts with none.
    let badgeUrls = {};
    try {
      const fallback = { template: "label", glyph: "rings" } as const;
      const picked = badgeChoiceSchema.safeParse({ ...fallback, ...(body.badge as object | undefined) });
      badgeUrls = await drawAndUploadRingBadge({ slug: forkSlug, name }, picked.success ? picked.data : fallback);
    } catch (uploadError) {
      console.error("Badge generation/upload failed for fork:", uploadError);
    }

    try {
      const forkedRing = await new AuthenticatedRingHubClient(viewer.id).forkRing(slug, {
        name,
        slug: forkSlug,
        description: body.description?.trim() || undefined,
        joinPolicy: JOIN_POLICY[body.joinType],
        visibility: body.visibility.toUpperCase() as "PUBLIC" | "UNLISTED" | "PRIVATE",
        // Members post; the hub's default lets anyone, member or not
        postPolicy: "MEMBERS",
        ...badgeUrls,
      });
      // The new ring in their lists and the directory, and in the parent's children
      forgetRingReads(forkedRing.slug, [viewer.id]);
      forgetRingReads(slug);

      return res.json({
        success: true,
        threadRing: {
          id: forkedRing.slug,
          name: forkedRing.name,
          slug: forkedRing.slug,
          description: forkedRing.description,
          joinType: forkedRing.joinPolicy?.toLowerCase() || "open",
          visibility: forkedRing.visibility?.toLowerCase() || "public",
          uri: forkedRing.uri,
        },
        message: `"${forkedRing.name}" is ready.`,
      });
    } catch (ringHubError) {
      console.error("Ring Hub fork error:", ringHubError);
      const [status, answer] = forkFailure(ringHubError);
      return res.status(status).json(answer);
    }
  }
);
