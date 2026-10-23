import { RingHubAuthError } from '@/lib/api/ringhub/ringhub-errors'

/**
 * A ring hub read signed as the viewer, so a private ring's members can see
 * it. With no viewer, or when the viewer's key is stale or can't be resolved
 * (the hub's X-RingHub-Auth-Error, a RingHubAuthError here), it's the
 * unsigned read instead: a key problem never hides a public ring.
 */
export async function readAsViewer<T>(asViewer: (() => Promise<T>) | null, asPublic: () => Promise<T>): Promise<T> {
  if (!asViewer) return asPublic()
  try {
    return await asViewer()
  } catch (error) {
    if (error instanceof RingHubAuthError) return asPublic()
    throw error
  }
}
