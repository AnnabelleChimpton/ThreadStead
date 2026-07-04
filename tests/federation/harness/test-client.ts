/**
 * Builds a real RingHubClient wired to the harness-booted hub.
 * This is the same class production uses — nothing is mocked.
 */
import { RingHubClient } from '@/lib/api/ringhub/ringhub-client'
import { readRuntime, FederationRuntime } from './runtime'

export function getRuntime(): FederationRuntime {
  return readRuntime()
}

export function makeTestClient(): RingHubClient {
  const rt = readRuntime()
  return new RingHubClient({
    baseUrl: rt.hubUrl,
    instanceDID: rt.testActorDid,
    privateKeyBase64Url: rt.privateKeyBase64Url,
    publicKeyMultibase: rt.publicKeyMultibase,
  })
}
