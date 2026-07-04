/**
 * RingHub wire contract (A2).
 *
 * These zod schemas describe what the hub ACTUALLY sends — they are derived
 * from the hub's handler code (ThreadRingHub apps/hub-api/src/routes/*.ts),
 * not from this client's declared TypeScript types, which have drifted from
 * the wire before. The 2026-07 posting incident happened because the hub
 * silently returned `{}` for ten months and nothing at this boundary noticed:
 * every hub response was an untyped handshake.
 *
 * Validation runs inside RingHubClient at the response boundary. A mismatch
 * is a contract violation and should never be papered over — update the hub
 * or this schema deliberately, never by loosening a field to `any` to make an
 * error go away.
 *
 * Validation semantics:
 *  - Schemas check that required fields exist with the right types. Unknown
 *    extra fields are always allowed (the hub may add fields any time).
 *  - The ORIGINAL response object is returned untouched — validation never
 *    strips or coerces, so adopting it cannot change runtime behavior.
 *  - Mode is controlled by RINGHUB_CONTRACT_MODE (enforce | warn | off).
 *    Default: enforce outside production (tests fail loudly), warn in
 *    production (structured log, response still returned) so a benign drift
 *    degrades to observability instead of an outage. Flip production to
 *    enforce once the warn channel has stayed quiet.
 */
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Error + validation plumbing
// ---------------------------------------------------------------------------

export class RingHubContractError extends Error {
  constructor(
    public endpoint: string,
    public issues: z.core.$ZodIssue[],
    public received: unknown
  ) {
    const detail = issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ')
    super(`RingHub contract violation on ${endpoint}: ${detail}`)
    this.name = 'RingHubContractError'
  }
}

type ContractMode = 'enforce' | 'warn' | 'off'

function contractMode(): ContractMode {
  const explicit = process.env.RINGHUB_CONTRACT_MODE
  if (explicit === 'enforce' || explicit === 'warn' || explicit === 'off') {
    return explicit
  }
  return process.env.NODE_ENV === 'production' ? 'warn' : 'enforce'
}

/** Truncated JSON snippet for logs — enough to diagnose, small enough to log. */
function snippet(data: unknown): string {
  try {
    const s = JSON.stringify(data)
    return s.length > 500 ? s.slice(0, 500) + '…' : s
  } catch {
    return String(data)
  }
}

/**
 * Validate a hub response against its contract schema.
 * Returns the ORIGINAL data unchanged; typing is unaffected.
 */
export function validateRingHubResponse<T>(
  endpoint: string,
  schema: z.ZodType,
  data: T
): T {
  const mode = contractMode()
  if (mode === 'off') return data

  const result = schema.safeParse(data)
  if (result.success) return data

  if (mode === 'enforce') {
    throw new RingHubContractError(endpoint, result.error.issues, data)
  }

  console.error('[ringhub-contract] response shape mismatch', {
    endpoint,
    issues: result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    })),
    received: snippet(data),
  })
  return data
}

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

/** PostRef as built by the hub's buildPostResponse() (content.ts). */
export const PostRefSchema = z.object({
  id: z.string(),
  ringSlug: z.string(),
  uri: z.string(),
  digest: z.string(),
  actorDid: z.string(),
  submittedAt: z.string(),
  submittedBy: z.string(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'REMOVED']),
  moderatedAt: z.string().nullish(),
  moderatedBy: z.string().nullish(),
  moderationNote: z.string().nullish(),
  pinned: z.boolean(),
  metadata: z.unknown(),
})

/** Ring descriptor as built by the hub's buildRingResponse() (rings.ts). */
export const RingDescriptorSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  shortCode: z.string().nullish(),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']),
  joinPolicy: z.enum(['OPEN', 'APPLICATION', 'INVITATION', 'CLOSED']),
  postPolicy: z.enum(['OPEN', 'MEMBERS', 'CURATED', 'CLOSED']),
  ownerDid: z.string(),
  parentId: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  curatorNote: z.string().nullish(),
  bannerUrl: z.string().nullish(),
  themeColor: z.string().nullish(),
  badgeImageUrl: z.string().nullish(),
  badgeImageHighResUrl: z.string().nullish(),
  metadata: z.unknown(),
  policies: z.unknown(),
  memberCount: z.number(),
  postCount: z.number(),
  // Conditionally attached by the hub (lineage/children query flags, auth):
  lineage: z.array(z.object({ id: z.string(), slug: z.string(), name: z.string() })).optional(),
  children: z
    .array(z.object({ id: z.string(), slug: z.string(), name: z.string(), memberCount: z.number() }))
    .optional(),
  currentUserMembership: z
    .object({
      status: z.string(),
      role: z.string().nullish(),
      joinedAt: z.string().nullish(),
      badgeId: z.string().nullish(),
    })
    .optional(),
})

// ---------------------------------------------------------------------------
// Endpoint response contracts (core federation flows)
// ---------------------------------------------------------------------------

/** POST /trp/submit → 201. The PostRef arrives WRAPPED under `post`. */
export const SubmitPostResponseSchema = z.object({
  post: PostRefSchema,
  message: z.string(),
  requiresApproval: z.boolean(),
})

/** POST /trp/join → 201 (membership.ts). NOT a flat RingMember. */
export const JoinRingResponseSchema = z.object({
  membership: z.object({
    id: z.string(),
    status: z.enum(['ACTIVE', 'PENDING']),
    role: z.string(),
    joinedAt: z.string().nullish(),
    requiresApproval: z.boolean(),
  }),
  badge: z.object({ id: z.string(), url: z.string() }).nullable(),
  message: z.string(),
})

/** POST /trp/leave → 200 (membership.ts). */
export const LeaveRingResponseSchema = z.object({
  message: z.string(),
  leftAt: z.string(),
})

/** GET /trp/my/memberships → 200 (rings.ts; shape enforced by hub Fastify schema). */
export const MyMembershipsResponseSchema = z.object({
  memberships: z.array(
    z.object({
      ringSlug: z.string(),
      ringName: z.string(),
      ringDescription: z.string().nullish(),
      ringVisibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']),
      status: z.string(),
      role: z.string().nullish(),
      joinedAt: z.string().nullish(),
      badgeId: z.string().nullish(),
    })
  ),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean(),
})

/** GET /trp/rings/:slug/feed → 200 (content.ts PostsListResponse). */
export const RingFeedResponseSchema = z.object({
  posts: z.array(PostRefSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean(),
})

/** POST /trp/curate → 200 (content.ts; author and moderator paths share this core). */
export const CuratePostResponseSchema = z.object({
  post: PostRefSchema,
  action: z.string(),
  moderator: z.string(),
  moderatedAt: z.string(),
})

/**
 * GET /trp/actors/:did/badges → 200 (membership.ts).
 * `badge` must be a NON-EMPTY object: the hub once declared it as a bare
 * `type: 'object'` Fastify schema, which serialized every badge to `{}`.
 * This refinement is the regression tripwire for that bug class.
 */
export const ActorBadgesResponseSchema = z.object({
  badges: z.array(
    z.object({
      badge: z
        .record(z.string(), z.unknown())
        .refine((o) => Object.keys(o).length > 0, {
          message: 'badge JSON-LD is empty — hub response-schema stripping regression',
        }),
      ring: z.object({
        slug: z.string(),
        name: z.string(),
        visibility: z.string(),
      }),
      membership: z.object({
        role: z.string().nullish(),
        joinedAt: z.string().nullish(),
        status: z.string(),
      }),
      issuedAt: z.string(),
      isRevoked: z.boolean(),
      revokedAt: z.string().nullish(),
      revocationReason: z.string().nullish(),
    })
  ),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean(),
})
