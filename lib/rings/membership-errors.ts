import { RingHubAuthError, RingHubUnavailableError } from '@/lib/api/ringhub/ringhub-errors'
import { HUB_UNREACHABLE } from '@/lib/domain/threadrings/ring-access'

/** A refused join or leave: the status, the sentence the ring page shows, and anything else to send */
export type MembershipFailure = [number, string, Record<string, unknown>?]

/**
 * The hub's answer to a join or leave, as a plain sentence. The routes
 * passed on the hub's own text, which was its short label ("Transfer
 * ownership required") or its developer sentence, plus `details`; the ring
 * page shows `error` as it comes. Keyed on the hub's labels
 * (ThreadRingHub apps/hub-api/src/routes/membership.ts).
 */
function hubAnswer(error: unknown): { status?: number; label?: string } | null {
  if (error instanceof RingHubAuthError || error instanceof RingHubUnavailableError) return null
  const { status, data } = (error ?? {}) as { status?: number; data?: { error?: unknown } }
  return { status, label: typeof data?.error === 'string' ? data.error : undefined }
}

const UNREACHABLE: MembershipFailure = [503, HUB_UNREACHABLE, { degraded: true }]

export function joinFailure(error: unknown): MembershipFailure {
  const answer = hubAnswer(error)
  if (!answer) return UNREACHABLE
  const { status, label } = answer
  if (status === 404) return [404, "We couldn't find that ring."]
  if (status === 409 && label === 'Application pending') return [409, "You've asked to join. The ring's host hasn't answered yet."]
  if (status === 409) return [409, "You're already in this ring."]
  if (status === 403 && label === 'Invitation required') {
    return [403, "This ring needs an invite, and there isn't an open one for you. Invites last a week, so ask the ring host for a new one."]
  }
  if (status === 403 && label === 'Removed') {
    return [403, 'You were taken out of this ring. You can come back if its host or a moderator invites you.']
  }
  if (status === 403 && label === 'Ring closed') return [403, "This ring isn't taking new members."]
  if (status === 403) return [403, "Ring Hub says you can't join this ring."]
  if (status === 401) return UNREACHABLE
  // Including 400: the hub couldn't read this site's key for them, not the resident's doing
  return [502, "Couldn't join. Try again in a minute."]
}

export function leaveFailure(error: unknown): MembershipFailure {
  const answer = hubAnswer(error)
  if (!answer) return UNREACHABLE
  const { status, label } = answer
  if (status === 404 && label === 'Not a member') return [404, "You're not in this ring."]
  if (status === 404) return [404, "We couldn't find that ring."]
  if (status === 400 && label === 'Transfer ownership required') {
    return [400, 'As its host, hand the ring to another member before you leave.']
  }
  if (status === 403) return [403, "Ring Hub says you can't leave this ring."]
  if (status === 401) return UNREACHABLE
  return [502, "Couldn't leave. Try again in a minute."]
}
