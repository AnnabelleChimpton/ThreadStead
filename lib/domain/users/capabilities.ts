import { SignJWT, jwtVerify } from "jose";

// Capability tokens are HMAC-signed with CAP_JWT_SECRET. If this secret is the
// well-known dev fallback in production, anyone can forge capability tokens
// (e.g. write:comment) for any user. Refuse to run with a weak/missing secret
// in production; keep the convenient fallback for local dev and tests only.
function resolveCapSecret(): string {
  const configured = process.env.CAP_JWT_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && (!configured || configured.trim() === "" || configured === "devsecret")) {
    throw new Error(
      "CAP_JWT_SECRET is unset, empty, or the insecure 'devsecret' default in production. " +
        "Set CAP_JWT_SECRET to a strong random value so capability tokens cannot be forged."
    );
  }

  return configured && configured.trim() !== "" ? configured : "devsecret";
}

const aud = process.env.CAP_AUDIENCE || "retro.local";

// Resolve the secret lazily on first mint/verify — NOT at module load — so the
// production guard fails fast at runtime use rather than breaking the build
// (next build runs under NODE_ENV=production) or any incidental import.
let cachedSecret: Uint8Array | null = null;
function getSecret(): Uint8Array {
  if (cachedSecret === null) {
    cachedSecret = new TextEncoder().encode(resolveCapSecret());
  }
  return cachedSecret;
}

export type CapPayload = { act: string[]; res: string };

export async function mintCapability(subUserId: string, act: string[], res: string, ttlSec = 900) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ act, res } as CapPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("retro.server")
    .setAudience(aud)
    .setSubject(subUserId) // who the token speaks for
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSec)
    .sign(getSecret());
}

export async function verifyCapability(token: string) {
  const { payload } = await jwtVerify(token, getSecret(), { audience: aud });
  return {
    sub: String(payload.sub || ""),
    act: (payload as any).act as string[],
    res: (payload as any).res as string,
    exp: (payload as any).exp as number,
  };
}

/**
 * Classify a comment target postId.
 *
 * Legitimate external (RingHub) posts reach the comment endpoints only via the
 * feed UI, which sends `ringhub-<PostRefId>` ids (see RingHubFeed.convertToPostItem).
 * The old heuristic also trusted any id containing ':' or looking UUID-ish, which
 * let an authenticated user mint a capability and upsert a shadow Post row with an
 * arbitrary attacker-chosen primary key (e.g. 'did:plc:victim:post:x').
 *
 * We can't verify a bare PostRef id against the hub (the client exposes no
 * get-post-by-id endpoint and the id carries no ring slug), so instead we:
 *  - only accept the single prefix the real UI emits (`ringhub-`),
 *  - require the PostRef portion to be a safe token, and
 *  - always derive the DB key server-side from that namespace, so the client can
 *    never dictate the raw primary key or smuggle in ':'/path characters.
 */
const RINGHUB_POST_PREFIX = "ringhub-";
// RingHub PostRef ids are opaque tokens (UUIDs / slugs). Restrict to a safe set
// so the client can't inject ':' or other characters into the surrogate key.
const SAFE_POSTREF_ID = /^[A-Za-z0-9_-]{1,128}$/;

export type ClassifiedPost =
  | { kind: "invalid" }
  | { kind: "external"; dbId: string };

export function classifyExternalPostId(rawPostId: string): ClassifiedPost {
  if (!rawPostId.startsWith(RINGHUB_POST_PREFIX)) return { kind: "invalid" };
  const refId = rawPostId.slice(RINGHUB_POST_PREFIX.length);
  if (!SAFE_POSTREF_ID.test(refId)) return { kind: "invalid" };
  // Server-controlled namespaced surrogate key: the `ringhub-` prefix is fixed
  // here, never taken verbatim from arbitrary client input.
  return { kind: "external", dbId: `${RINGHUB_POST_PREFIX}${refId}` };
}

export function requireAction(action: string, resourceOk: (res: string) => boolean) {
  return async (token: string) => {
    const cap = await verifyCapability(token);
    if (!cap.sub) throw new Error("cap: no subject");
    if (!Array.isArray(cap.act) || !cap.act.includes(action)) throw new Error("cap: missing action");
    if (!resourceOk(cap.res)) throw new Error("cap: bad resource");
    return cap; // includes cap.sub (userId)
  };
}
