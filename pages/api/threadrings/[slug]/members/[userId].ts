import { z } from "zod";
import { apiHandler, ApiError } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { forgetRingReads } from "@/lib/api/ringhub/forget-ring-reads";
import { hubWriteError, requireRingAs, ringManager } from "@/lib/domain/threadrings/ring-access";

const roleSchema = z.object({ role: z.enum(["member", "moderator"], { message: "Pick member or moderator" }) });

/**
 * One member of a Ring Hub ring. `userId` is a resident's id here, or the DID
 * of a member from another instance (the members list shows them by DID).
 *   PUT    { role }: the Host, or a site admin signing as this site.
 *   DELETE removes them, signed as the viewer: the hub lets the Host remove
 *          anyone and a moderator plain members. Removed means invite-only.
 */
export default apiHandler(
  { methods: ["PUT", "DELETE"], auth: "user", rateLimit: "threadring_operations" },
  async (req, res, { user }) => {
    const { slug, userId } = req.query;
    if (typeof slug !== "string" || typeof userId !== "string") throw new ApiError(400, "Invalid parameters");

    const access = await requireRingAs(user, slug);
    const target = await memberFor(userId);
    if (target.did === access.ring.ownerDid) {
      throw new ApiError(400, "That's the Host. To change who runs the ring, hand it over.");
    }

    if (req.method === "PUT") {
      const { role } = roleSchema.parse(req.body ?? {});
      const manager = ringManager(access, user.id);
      try {
        await manager.updateMemberRole(slug, target.did, role);
      } catch (error) {
        throw hubWriteError(error, access.manageAs);
      }
      forgetRingReads(slug, target.userId ? [target.userId] : []);
      return res.json({
        message: role === "moderator" ? `${target.name} moderates the ring now.` : `${target.name} is a member again.`,
        newRole: role,
      });
    }

    if (!access.isSteward) throw new ApiError(403, "Only the Host and moderators can remove members.");
    try {
      await createAuthenticatedRingHubClient(user.id).removeMember(slug, target.did);
    } catch (error) {
      throw hubWriteError(error);
    }
    forgetRingReads(slug, target.userId ? [target.userId] : []);
    res.json({ message: `${target.name} is out of the ring. Only an invite brings them back.` });
  }
);

/** The member's DID on the hub, their account here if any, and what to call them. */
async function memberFor(userId: string): Promise<{ did: string; userId: string | null; name: string }> {
  // From another instance: the hub knows them by this DID, and nobody here holds it
  if (userId.startsWith("did:")) {
    const key = await db.userDID.findUnique({ where: { did: userId }, select: { userId: true } });
    return { did: userId, userId: key?.userId ?? null, name: "They" };
  }
  const resident = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, did: true, primaryHandle: true, userDID: { select: { did: true } } },
  });
  if (!resident) throw new ApiError(404, "We couldn't find them.");
  // The hub knows residents by their federation DID (UserDID), which can differ from User.did
  const handle = resident.primaryHandle?.split("@")[0];
  return { did: resident.userDID?.did ?? resident.did, userId: resident.id, name: handle ? `@${handle}` : "They" };
}
