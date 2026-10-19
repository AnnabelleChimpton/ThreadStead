/**
 * Handing a Ring Hub ring to another member.
 *
 * Ownership: Ring Hub owns it (Ring.ownerDid plus that member's `owner`
 * role; POST /trp/rings/:slug/transfer-ownership moves both). ThreadStead
 * keeps two mirrors that decide who may manage the ring here:
 * RingHubOwnership (settings, members and badge pages, member management)
 * and the local ThreadRing row's curatorId (empty for a mirror row until a
 * transfer names someone; SET NULL if that account is deleted). Both follow
 * the hub, after it answers.
 *
 * Who signs:
 *  - the owner, with their own key;
 *  - this site's DID, for rings the site itself owns on the hub (older rings
 *    the server created for a resident), when the resident is the local
 *    owner or an admin asks;
 *  - this site's DID as a hub admin (Actor.isAdmin on the hub), when an
 *    admin moves a ring whose owner can't sign, e.g. a banned account.
 *
 * The new owner has to be a resident here with a key the hub knows (an
 * ACTIVE member joins as their own DID), and not suspended or banned.
 */
import { db } from "@/lib/config/database/connection";
import { ApiError } from "@/lib/api/errors";
import {
  getPublicRingHubClient,
  getRingHubClient,
  RingHubClientError,
  shouldUseRingHub,
  type RingHubClient,
} from "@/lib/api/ringhub/ringhub-client";
import { RingHubAuthError, RingHubUnavailableError } from "@/lib/api/ringhub/ringhub-errors";
import { createAuthenticatedRingHubClient } from "@/lib/api/ringhub/ringhub-user-operations";
import { readAllRingMembers } from "@/lib/api/ringhub/ring-members";
import { HUB_TIMEOUT } from "@/lib/api/ringhub/ringhub-ssr";
import { activeUserWhere, isRestricted, MAX_REASON_LENGTH, MODERATION_SELECT } from "@/lib/domain/users/moderation";

export interface TransferActor {
  id: string;
  role: string;
}

/** owner: their own key. site: this site's DID owns the ring. admin: this site's DID as a hub admin. */
export type TransferSigner = "owner" | "site" | "admin";

export interface RingOwnershipTransfer {
  slug: string;
  previousOwnerDid: string;
  newOwnerDid: string;
  newOwner: { id: string; handle: string | null };
  signer: TransferSigner;
  /** False when the hub moved it but the local mirrors couldn't be updated. */
  localSynced: boolean;
}

export interface OwnershipCandidate {
  userId: string;
  handle: string | null;
  displayName: string | null;
  role: string;
}

type Transferrer = Pick<RingHubClient, "transferOwnership">;
type Signer = { signer: TransferSigner; client: Transferrer };

function hubReader(): RingHubClient {
  const reader = shouldUseRingHub() ? getPublicRingHubClient() : null;
  if (!reader) throw new ApiError(400, "Handing a ring over needs Ring Hub, and it's off here.");
  return reader;
}

async function hubRing(reader: RingHubClient, slug: string) {
  const ring = await reader.getRing(slug);
  if (!ring?.ownerDid) throw new ApiError(404, "Ring not found");
  return ring;
}

function siteClient(): Transferrer {
  const client = getRingHubClient();
  if (!client) throw new ApiError(503, "This site can't sign Ring Hub requests right now.");
  return client;
}

/** The signer for this actor and ring, or a 403 when they may not hand it over. */
async function signerFor(actor: TransferActor, slug: string, ownerDid: string): Promise<Signer> {
  const key = await db.userDID.findUnique({ where: { userId: actor.id }, select: { did: true } });
  if (key?.did === ownerDid) return { signer: "owner", client: createAuthenticatedRingHubClient(actor.id) };

  const isAdmin = actor.role === "admin";
  if (ownerDid === process.env.THREADSTEAD_DID) {
    const local = await db.ringHubOwnership.findUnique({ where: { ringSlug: slug }, select: { ownerUserId: true } });
    if (isAdmin || local?.ownerUserId === actor.id) return { signer: "site", client: siteClient() };
  }
  if (isAdmin) return { signer: "admin", client: siteClient() };
  throw new ApiError(403, "Only the ring's owner can hand it over.");
}

/** Who may manage the ring here, for the candidates list: its owner, or an admin. */
async function canManage(actor: TransferActor, slug: string, ownerDid: string): Promise<boolean> {
  if (actor.role === "admin") return true;
  const key = await db.userDID.findUnique({ where: { userId: actor.id }, select: { did: true } });
  if (key?.did === ownerDid) return true;
  const local = await db.ringHubOwnership.findUnique({ where: { ringSlug: slug }, select: { ownerUserId: true } });
  return local?.ownerUserId === actor.id;
}

/** The hub's refusal, in words for the person who asked. */
function hubRefusal(error: unknown, signer: TransferSigner): ApiError {
  if (error instanceof RingHubAuthError || error instanceof RingHubUnavailableError) {
    return new ApiError(503, "We can't reach Ring Hub right now. Try again in a minute.");
  }
  if (!(error instanceof RingHubClientError) || !error.status || error.status >= 500) {
    return new ApiError(502, "Ring Hub couldn't hand the ring over. Try again in a minute.");
  }
  const reason = typeof error.data?.error === "string" ? error.data.error : error.message;
  switch (error.status) {
    case 400:
      if (reason === "Not a member") return new ApiError(400, "They need to be a member of the ring first.");
      if (reason === "Blocked") return new ApiError(400, "They're blocked from this ring.");
      if (reason === "Already owner") return new ApiError(400, "They already own it.");
      return new ApiError(400, error.data?.message || reason);
    case 401:
      return new ApiError(503, "Ring Hub didn't accept this site's signature. Try again in a minute.");
    case 403:
      return signer === "admin"
        ? new ApiError(403, "Ring Hub doesn't treat this site as an admin, so only the owner can hand it over.")
        : new ApiError(403, "Ring Hub says you don't own this ring.");
    case 404:
      return new ApiError(404, "Ring not found");
    case 409:
      return new ApiError(409, "The ring changed while handing it over. Try again.");
    default:
      return new ApiError(error.status, error.data?.message || reason);
  }
}

/**
 * Hand `slug` to `newOwnerUserId`. Hub first; the local mirrors follow only
 * once the hub has moved it. Throws ApiError for anything refused.
 */
export async function transferRingOwnership({
  slug,
  actor,
  newOwnerUserId,
  reason,
}: {
  slug: string;
  actor: TransferActor;
  newOwnerUserId: string;
  reason?: string;
}): Promise<RingOwnershipTransfer> {
  const reader = hubReader();
  const ring = await hubRing(reader, slug);

  const newOwner = await db.user.findUnique({
    where: { id: newOwnerUserId },
    select: { id: true, primaryHandle: true, ...MODERATION_SELECT },
  });
  if (!newOwner) throw new ApiError(404, "User not found");
  if (isRestricted(newOwner)) throw new ApiError(400, "They're suspended or banned, so they can't take a ring over.");
  // Without a key here they never joined the ring as themselves.
  const newKey = await db.userDID.findUnique({ where: { userId: newOwner.id }, select: { did: true } });
  if (!newKey) throw new ApiError(400, "They need to be a member of the ring first.");
  if (newKey.did === ring.ownerDid) throw new ApiError(400, "They already own it.");

  const { signer, client } = await signerFor(actor, slug, ring.ownerDid);
  const note = reason?.trim().slice(0, MAX_REASON_LENGTH) || undefined;
  let moved;
  try {
    moved = await client.transferOwnership(slug, newKey.did, note);
  } catch (error) {
    console.error(`Ring Hub refused handing ${slug} to ${newKey.did}:`, error);
    throw hubRefusal(error, signer);
  }

  let localSynced = true;
  try {
    await db.$transaction([
      db.ringHubOwnership.upsert({
        where: { ringSlug: slug },
        update: { ownerUserId: newOwner.id, serverDID: moved.newOwnerDid },
        create: {
          ringSlug: slug,
          ringUri: ring.uri || `https://ringhub.io/rings/${slug}`,
          ownerUserId: newOwner.id,
          serverDID: moved.newOwnerDid,
        },
      }),
      db.threadRing.updateMany({ where: { slug }, data: { curatorId: newOwner.id } }),
      db.threadRingMember.updateMany({
        where: { threadRing: { slug }, role: "curator", userId: { not: newOwner.id } },
        data: { role: "member" },
      }),
      db.threadRingMember.updateMany({ where: { threadRing: { slug }, userId: newOwner.id }, data: { role: "curator" } }),
    ]);
  } catch (error) {
    localSynced = false;
    console.error(`Ring Hub handed ${slug} to ${newOwner.id}, but the local owner records didn't update:`, error);
  }

  return {
    slug,
    previousOwnerDid: moved.previousOwnerDid,
    newOwnerDid: moved.newOwnerDid,
    newOwner: { id: newOwner.id, handle: newOwner.primaryHandle },
    signer,
    localSynced,
  };
}

/**
 * The members who could take `slug` over: ACTIVE on the hub, residents here
 * with a key, not suspended or banned, and not the current owner. Only for
 * the ring's owner or an admin.
 */
export async function listOwnershipCandidates(slug: string, actor: TransferActor): Promise<OwnershipCandidate[]> {
  const reader = hubReader();
  const ring = await hubRing(reader, slug);
  if (!(await canManage(actor, slug, ring.ownerDid))) throw new ApiError(403, "Only the ring's owner can hand it over.");

  const read = await readAllRingMembers(reader, slug);
  if (read === HUB_TIMEOUT) throw new ApiError(503, "We can't reach Ring Hub right now. Try again in a minute.");
  const members = read.members.filter((m) => m.actorDid !== ring.ownerDid);
  if (members.length === 0) return [];

  const keys = await db.userDID.findMany({
    where: { did: { in: members.map((m) => m.actorDid) } },
    select: { did: true, userId: true },
  });
  const users = await db.user.findMany({
    where: { AND: [{ id: { in: keys.map((k) => k.userId) } }, activeUserWhere()] },
    select: { id: true, primaryHandle: true, profile: { select: { displayName: true } } },
  });
  const userByDid = new Map(
    keys.flatMap((k) => {
      const user = users.find((u) => u.id === k.userId);
      return user ? [[k.did, user] as const] : [];
    })
  );

  return members.flatMap((m) => {
    const user = userByDid.get(m.actorDid);
    if (!user) return [];
    return [{ userId: user.id, handle: user.primaryHandle, displayName: user.profile?.displayName ?? null, role: m.role }];
  });
}
