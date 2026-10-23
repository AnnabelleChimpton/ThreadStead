// pages/api/account/claim-handle.ts
import { apiHandler, ApiError } from "@/lib/api/handler";
import { db } from "@/lib/config/database/connection";
import { validateUsername } from "@/lib/domain/validation";
import { SITE_NAME } from "@/lib/config/site/constants";
import {
  HANDLE_UNAVAILABLE_MESSAGES,
  handleUnavailableReason,
  isSubdomainLabelConflict,
} from "@/lib/domain/users/handle-availability";
import { subdomainLabelFor } from "@/lib/subdomains/host";


const HOST = SITE_NAME;

export const ALREADY_HAS_HANDLE = "You already have a username.";

/**
 * Claim the signed-in account's username, once. One handle per account: a
 * second claim used to add another Handle row and move primaryHandle, which
 * would let one account squat many names (and, later, many subdomains).
 */
export default apiHandler(
  { methods: ["POST"], auth: "user" },
  async (req, res, { user }) => {
    const { handle } = req.body || {};
    if (typeof handle !== "string") {
      return res.status(400).json({ error: "handle must be a string" });
    }

    const validation = validateUsername(handle);
    if (!validation.ok) {
      return res.status(400).json({ 
        error: validation.message, 
        code: validation.code 
      });
    }

    if (user.primaryHandle || (await db.handle.findFirst({ where: { userId: user.id }, select: { id: true } }))) {
      return res.status(409).json({ error: ALREADY_HAS_HANDLE });
    }

    // Free on this host, as a username and as an address (a_b vs a-b), and
    // not held by a deleted account's tombstone
    const unavailable = await handleUnavailableReason(handle);
    if (unavailable) return res.status(409).json({ error: HANDLE_UNAVAILABLE_MESSAGES[unavailable] });

    // Set primaryHandle and create Handle + starter Profile in a transaction
    try {
      await db.$transaction(async (tx) => {
        // Only while primaryHandle is still unset: of two claims racing, the
        // second waits on the row lock and then matches nothing
        const claimed = await tx.user.updateMany({
          where: { id: user.id, primaryHandle: null },
          data: { primaryHandle: `${handle}@${HOST}`, subdomainLabel: subdomainLabelFor(handle) },
        });
        if (claimed.count === 0) throw new ApiError(409, ALREADY_HAS_HANDLE);

        await tx.handle.create({
          data: {
            userId: user.id,
            handle,
            host: HOST,
            verifiedAt: new Date(),
          },
        });

        // Create profile if missing
        const hasProfile = await tx.profile.findUnique({ where: { userId: user.id } });
        if (!hasProfile) {
          await tx.profile.create({
            data: {
              userId: user.id,
              displayName: handle,
              // No placeholder bio: the owner writes their own (or leaves it blank)
              avatarUrl: "/assets/default-avatar.gif",
              visibility: "public",
            },
          });
        }

        // Optional: install hello plugin by default
        const hasHello = await tx.pluginInstall.findFirst({
          where: { ownerId: user.id, pluginId: "com.example.hello" },
        });
        if (!hasHello) {
          await tx.pluginInstall.create({
            data: { ownerId: user.id, pluginId: "com.example.hello", mode: "trusted", enabled: true },
          });
        }

      });
    } catch (error) {
      // a_b and a-b claimed at once: the unique label lets only one through
      if (isSubdomainLabelConflict(error)) {
        return res.status(409).json({ error: HANDLE_UNAVAILABLE_MESSAGES["same-address"] });
      }
      throw error;
    }

    return res.status(201).json({ ok: true });
  }
);
