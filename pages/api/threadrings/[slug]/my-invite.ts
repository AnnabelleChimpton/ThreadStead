import { db } from "@/lib/config/database/connection";
import { apiHandler, ApiError } from "@/lib/api/handler";
import { visibleNotificationsWhere } from "@/lib/domain/notifications";

/**
 * Has the viewer been invited to this hub ring? The hub can't list someone's
 * invitations, so this reads the invite notification ThreadStead sent
 * (pages/api/threadrings/[slug]/invite.ts). It only decides whether the ring
 * page shows an Accept button: the hub checks the real invitation on join.
 */
export default apiHandler(
  { methods: ["GET"], auth: "user" },
  async (req, res, { user }) => {
    const { slug } = req.query;
    if (typeof slug !== "string") throw new ApiError(400, "Invalid slug");

    const notification = await db.notification.findFirst({
      where: {
        // Not from someone now hidden, like the notification itself
        ...(await visibleNotificationsWhere(user.id)),
        type: "threadring_invite",
        data: { path: ["threadRingSlug"], equals: slug },
      },
      orderBy: { createdAt: "desc" },
      select: {
        data: true,
        actor: {
          select: {
            primaryHandle: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });

    const data = (notification?.data ?? {}) as { source?: unknown; expiresAt?: unknown };
    const expiresAt = typeof data.expiresAt === "string" ? data.expiresAt : null;
    // Local-ring invites are accepted elsewhere, and an expired one can't be used.
    const usable =
      notification &&
      data.source === "ringhub" &&
      expiresAt !== null &&
      new Date(expiresAt).getTime() > Date.now();

    if (!usable) return res.json({ invite: null });

    return res.json({
      invite: {
        expiresAt,
        inviter: {
          handle: notification.actor.primaryHandle,
          displayName: notification.actor.profile?.displayName ?? null,
        },
      },
    });
  }
);
