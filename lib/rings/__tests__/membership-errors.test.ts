/**
 * Join and leave answers, from the hub's labels (ThreadRingHub
 * apps/hub-api/src/routes/membership.ts) to the sentence the ring page shows.
 */
import { joinFailure, leaveFailure } from '../membership-errors'
import { RingHubClientError } from '@/lib/api/ringhub/ringhub-client'
import { RingHubUnavailableError } from '@/lib/api/ringhub/ringhub-errors'

const hub = (status: number, error: string, message = 'the hub’s own sentence') => new RingHubClientError(error, status, undefined, { error, message })

test.each([
  [hub(404, 'Not found'), 404, "We couldn't find that ring."],
  [hub(409, 'Already member'), 409, "You're already in this ring."],
  [hub(409, 'Application pending'), 409, "You've asked to join. The ring's host hasn't answered yet."],
  [hub(403, 'Invitation required'), 403, "This ring needs an invite, and there isn't an open one for you. Invites last a week, so ask the ring host for a new one."],
  [hub(403, 'Removed'), 403, 'You were taken out of this ring. You can come back if its host or a moderator invites you.'],
  [hub(403, 'Ring closed'), 403, "This ring isn't taking new members."],
  [hub(400, 'Invalid DID'), 502, "Couldn't join. Try again in a minute."],
  [hub(500, 'Internal error'), 502, "Couldn't join. Try again in a minute."],
])('join: %s → %i', (error, status, sentence) => {
  expect(joinFailure(error).slice(0, 2)).toEqual([status, sentence])
})

test.each([
  [hub(404, 'Not a member'), 404, "You're not in this ring."],
  [hub(404, 'Not found'), 404, "We couldn't find that ring."],
  [hub(400, 'Transfer ownership required'), 400, 'As its host, hand the ring to another member before you leave.'],
  [hub(500, 'Internal error'), 502, "Couldn't leave. Try again in a minute."],
])('leave: %s → %i', (error, status, sentence) => {
  expect(leaveFailure(error).slice(0, 2)).toEqual([status, sentence])
})

test.each([[new RingHubUnavailableError('down')], [hub(401, 'Unauthorized')]])("a hub that can't be reached or won't take the key is a 503, marked degraded", (error) => {
  expect(joinFailure(error)).toEqual([503, "We can't reach Ring Hub right now. Try again in a minute.", { degraded: true }])
  expect(leaveFailure(error)).toEqual([503, "We can't reach Ring Hub right now. Try again in a minute.", { degraded: true }])
})
