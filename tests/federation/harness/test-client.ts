/**
 * Builds a real RingHubClient wired to the harness-booted hub.
 * This is the same class production uses — nothing is mocked.
 */
import { RingHubClient, getPublicRingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { readRuntime, FederationRuntime } from './runtime'

export function getRuntime(): FederationRuntime {
  return readRuntime()
}

/**
 * main: the seeded test actor. second: another seeded actor (a member the
 * main actor manages). admin: a seeded hub admin. unresolvable: a signer the
 * hub can't resolve.
 */
export function makeTestClient(as: 'main' | 'second' | 'admin' | 'unresolvable' = 'main'): RingHubClient {
  const rt = readRuntime()
  const signer = {
    main: { did: rt.testActorDid, key: rt.privateKeyBase64Url },
    second: { did: rt.secondActorDid, key: rt.secondPrivateKeyBase64Url },
    admin: { did: rt.adminActorDid, key: rt.adminPrivateKeyBase64Url },
    unresolvable: { did: rt.unresolvableActorDid, key: rt.unresolvablePrivateKeyBase64Url },
  }[as]
  return new RingHubClient({
    baseUrl: rt.hubUrl,
    instanceDID: signer.did,
    privateKeyBase64Url: signer.key,
    publicKeyMultibase: rt.publicKeyMultibase,
  })
}

/** The real unsigned public client (getPublicRingHubClient), pointed at the harness hub. */
export function makePublicTestClient(): RingHubClient {
  const rt = readRuntime()
  process.env.NEXT_PUBLIC_USE_RING_HUB = 'true'
  process.env.RING_HUB_URL = rt.hubUrl
  const client = getPublicRingHubClient()
  if (!client) throw new Error('getPublicRingHubClient() returned null')
  return client
}
