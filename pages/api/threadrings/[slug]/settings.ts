import { z } from "zod";
import { apiHandler, ApiError } from "@/lib/api/handler";
import { getRingHubClient, type RingDescriptor } from "@/lib/api/ringhub/ringhub-client";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { forgetRingReads } from "@/lib/api/ringhub/forget-ring-reads";
import { mapJoinTypeToJoinPolicy, ringSettingsFromHub } from "@/lib/api/ringhub/ringhub-transformers";
import { deleteEmptyRing } from "@/lib/domain/threadrings/empty-rings";
import { hubWriteError, requireRingAs, ringManager } from "@/lib/domain/threadrings/ring-access";
import { ringThemeHex } from "@/lib/rings/theme";
import { redrawRingBadge } from "@/lib/rings/badge";

/** Text a host may empty: "" or null clears it on the hub (an omitted field stays as it is). */
const clearable = (max: number, label: string) =>
  z.string().max(max, `${label} must be ${max} characters or less`).nullable()
    .transform((value) => value?.trim() || null);

/**
 * Only the fields the form changed. Application joining and curated posting
 * aren't offered (nothing could approve either), and new posting rules are
 * members or nobody.
 */
const schema = z.object({
  name: z.string().trim().min(1, "Give the ring a name").max(100, "The name must be 100 characters or less").optional(),
  description: clearable(500, "The description").optional(),
  curatorNote: clearable(1000, "The host's note").optional(),
  bannerUrl: z.string().trim().max(500).nullable()
    .refine((url) => !url || /^https?:\/\/\S+$/i.test(url), "The banner needs to be a web address, like https://example.com/banner.png")
    .transform((url) => url || null)
    .optional(),
  themeColor: z.string().nullable()
    .refine((color) => color === null || ringThemeHex(color) !== null, "The theme colour must be a colour like #2e4b3f")
    .transform((color) => (color === null ? null : ringThemeHex(color)))
    .optional(),
  joinType: z.enum(["open", "invite", "closed"]).optional(),
  visibility: z.enum(["public", "unlisted", "private"]).optional(),
  postPolicy: z.enum(["members", "closed"]).optional(),
}).strict();

/**
 * A ring's settings, on Ring Hub.
 *   PUT    the changed fields; signed as the Host (or as this site for a site
 *          admin, which the hub lets change a ring).
 *   DELETE the ring, when its Host is its only member. Anyone else in it
 *          means handing it over first.
 */
export default apiHandler(
  { methods: ["PUT", "DELETE"], auth: "user", rateLimit: "threadring_operations" },
  async (req, res, { user }) => {
    const slug = req.query.slug;
    if (typeof slug !== "string") throw new ApiError(400, "Invalid slug");
    const access = await requireRingAs(user, slug);

    if (req.method === "DELETE") {
      if (!access.isHost) throw new ApiError(403, "Only the ring's Host can delete it.");
      if ((access.ring.memberCount ?? 2) > 1) {
        throw new ApiError(409, "Others are still in this ring, so hand it to one of them instead.");
      }
      const deleter = access.manageAs === "site" ? getRingHubClient() : createAuthenticatedRingHubClient(user.id);
      if (!deleter) throw new ApiError(503, "We can't reach Ring Hub right now. Try again in a minute.");
      let outcome;
      try {
        outcome = await deleteEmptyRing(
          {
            slug,
            visibility: access.ring.visibility,
            ownerDid: access.ring.ownerDid,
            activeMemberDids: [access.ring.ownerDid],
          },
          deleter,
          // Read again just before it goes, as the Host sees it
          { getRing: () => createAuthenticatedRingHubClient(user.id).getRingAsMember(slug) }
        );
      } catch (error) {
        throw hubWriteError(error, access.manageAs);
      }
      if (outcome === "changed") {
        throw new ApiError(409, "Someone joined just now, so hand the ring to them instead.");
      }
      forgetRingReads(slug, [user.id]);
      return res.json({ deleted: true });
    }

    const body = schema.parse(req.body ?? {});
    const updates: Partial<RingDescriptor> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.curatorNote !== undefined) updates.curatorNote = body.curatorNote;
    if (body.bannerUrl !== undefined) updates.bannerUrl = body.bannerUrl;
    if (body.themeColor !== undefined) updates.themeColor = body.themeColor;
    if (body.joinType !== undefined) updates.joinPolicy = mapJoinTypeToJoinPolicy(body.joinType);
    if (body.visibility !== undefined) updates.visibility = body.visibility.toUpperCase() as RingDescriptor["visibility"];
    if (body.postPolicy !== undefined) updates.postPolicy = body.postPolicy === "members" ? "MEMBERS" : "CLOSED";
    if (Object.keys(updates).length === 0) return res.json({ settings: ringSettingsFromHub(access.ring) });

    const manager = ringManager(access, user.id);
    let updated: RingDescriptor;
    try {
      updated = await manager.updateRing(slug, updates);
    } catch (error) {
      throw hubWriteError(error, access.manageAs);
    }
    // A badge we drew is in the ring's colour, so it's redrawn in the new one
    // (an uploaded image stays). The colour is saved either way.
    if (updates.themeColor !== undefined && updates.themeColor !== ringThemeHex(access.ring.themeColor)) {
      try {
        const badge = await redrawRingBadge({ ...access.ring, ...updated, themeColor: updates.themeColor });
        if (badge) await manager.updateRingBadge(slug, { ...badge, updateExistingBadges: true });
      } catch (error) {
        console.error("Badge redraw after a colour change failed:", error);
      }
    }
    forgetRingReads(slug);
    res.json({ settings: ringSettingsFromHub({ ...access.ring, ...updated }) });
  }
);
