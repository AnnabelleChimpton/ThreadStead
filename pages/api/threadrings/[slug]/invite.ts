import { z } from "zod";
import { apiHandler, ApiError } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { SITE_NAME } from "@/lib/config/site/constants";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { hubWriteError, requireRingAs } from "@/lib/domain/threadrings/ring-access";
import { activeUserWhere } from "@/lib/domain/users/moderation";

const schema = z.object({ username: z.string().trim().min(1, "Type their username") });

/**
 * Invite a resident to a Ring Hub ring, signed as the viewer: the hub lets
 * the Host and moderators invite, whatever the ring's join rule (a removed
 * member can only come back this way). The hub knows people by their
 * federation DID (UserDID), which differs from User.did.
 *
 * The hub has no way to list someone's invitations, so the notification is
 * how the invitee finds out. Accepting is joining the ring: the hub's /join
 * uses up the invitation.
 */
export default apiHandler(
  { methods: ["POST"], auth: "user", rateLimit: "threadring_operations" },
  async (req, res, { user }) => {
    const slug = req.query.slug;
    if (typeof slug !== "string") throw new ApiError(400, "Invalid slug");
    const { username } = schema.parse(req.body ?? {});

    const access = await requireRingAs(user, slug);
    if (!access.isSteward) throw new ApiError(403, "Only the Host and moderators can invite people.");

    // Someone on either side of a block, or a suspended or banned account,
    // looks the same as no account at all.
    const handle = await db.handle.findFirst({
      where: {
        handle: username.toLowerCase().replace(/^@/, ""),
        host: SITE_NAME,
        user: {
          AND: [
            activeUserWhere(),
            { blocksCreated: { none: { blockedUserId: user.id } } },
            { blocksReceived: { none: { blockerId: user.id } } },
          ],
        },
      },
      include: { user: { select: { id: true, did: true, userDID: { select: { did: true } } } } },
    });
    if (!handle) throw new ApiError(404, "User not found");

    const inviteeDid = handle.user.userDID?.did ?? handle.user.did;
    let invitation;
    try {
      ({ invitation } = await createAuthenticatedRingHubClient(user.id).inviteMember(slug, inviteeDid));
    } catch (error) {
      throw hubWriteError(error);
    }

    try {
      await db.notification.create({
        data: {
          recipientId: handle.user.id,
          actorId: user.id,
          type: "threadring_invite",
          data: {
            source: "ringhub",
            threadRingSlug: slug,
            threadRingName: access.ring.name,
            invitationId: invitation.id,
            expiresAt: invitation.expiresAt,
          },
        },
      });
    } catch (notifyError) {
      // The hub invite stands, and joining still works; they just won't hear about it.
      console.error("Hub invite sent but the notification failed:", notifyError);
    }

    res.json({ success: true, message: `Invite sent to @${username.replace(/^@/, "")}` });
  }
);
