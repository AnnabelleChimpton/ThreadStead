/**
 * Keeps each pixel home's share snapshot (render.tsx) up to date in R2.
 *
 *   scheduleHomeSnapshot(userId)        // after a save; never throws, never blocks
 *   await refreshHomeSnapshot(userId)   // render now if the yard changed
 *
 * Only homes anyone can see get a snapshot: the check is the profile rules
 * for a signed-out visitor (lib/domain/users/profile-access.ts). A home that
 * has gone private loses its stored snapshot the next time it's refreshed.
 *
 * Objects are `pixel-homes/snapshots/<userId>.<hash>.png` (and `.card.png`),
 * where the hash covers everything drawn, so a URL never changes content and
 * can be cached forever. The previous pair is deleted after a new one is stored.
 */
import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { db } from '@/lib/config/database/connection'
import { residentAccess } from '@/lib/domain/users/profile-access'
import { deleteObjects, keyFromPublicUrl, putObject } from '@/lib/storage/r2'
import { decorationText, loadHomeScene, type HomeScene } from '@/lib/pixel-homes/home-scene'
import { renderHomeSnapshot, SNAPSHOT_RENDERER_VERSION, type ImageLoader } from './render'

const KEY_PREFIX = 'pixel-homes/snapshots'
const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const FETCH_TIMEOUT_MS = 5000

export type SnapshotResult =
  | { status: 'rendered'; url: string; cardUrl: string }
  | { status: 'unchanged'; url: string; cardUrl: string | null }
  | { status: 'hidden' }
  | { status: 'no-home' }

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

/**
 * A short hash of everything the snapshot draws. Equal hashes draw equal
 * pictures (with the same art at the same URLs), so a save that changed
 * only text off the canvas doesn't redraw anything.
 */
export function snapshotHash(scene: HomeScene): string {
  // The title and description are page text; HouseSVG doesn't draw them.
  const { houseTitle: _title, houseDescription: _description, ...house } = scene.houseCustomizations
  const drawn = {
    v: SNAPSHOT_RENDERER_VERSION,
    template: scene.template,
    palette: scene.palette,
    house,
    sky: scene.sky,
    terrain: scene.terrain,
    decorations: scene.decorations.map((d) => ({
      id: d.decorationId,
      type: d.type,
      x: d.position?.x,
      y: d.position?.y,
      layer: d.position?.layer,
      variant: d.variant,
      size: d.size,
      text: decorationText(d),
      png: d.pngUrl ?? null,
      custom: d.customAssetUrl ?? null,
    })),
  }
  return createHash('sha256').update(stableStringify(drawn)).digest('hex').slice(0, 16)
}

/** Catalog PNGs are shared by many yards, so keep the recent ones around. */
const imageCache = new Map<string, Buffer>()
const IMAGE_CACHE_SIZE = 200

/**
 * Loads art from our own CDN, or from /public for a site-relative path.
 * Anything else is refused: the server doesn't fetch arbitrary URLs.
 */
export const loadSnapshotImage: ImageLoader = async (url) => {
  const cached = imageCache.get(url)
  if (cached) return cached

  let bytes: Buffer | null = null
  if (url.startsWith('/') && !url.startsWith('//')) {
    const publicDir = path.join(process.cwd(), 'public')
    const file = path.normalize(path.join(publicDir, decodeURIComponent(url.split(/[?#]/)[0])))
    if (!file.startsWith(publicDir + path.sep)) return null
    bytes = await fs.readFile(file).catch(() => null)
  } else if (keyFromPublicUrl(url) !== null) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
      const type = response.headers.get('content-type') ?? ''
      if (response.ok && type.startsWith('image/')) {
        const body = Buffer.from(await response.arrayBuffer())
        if (body.length <= MAX_IMAGE_BYTES) bytes = body
      }
    } catch (error) {
      console.warn(`[home-snapshot] Couldn't fetch ${url}:`, error instanceof Error ? error.message : error)
    }
  }
  if (!bytes || bytes.length > MAX_IMAGE_BYTES) return null

  if (imageCache.size >= IMAGE_CACHE_SIZE) imageCache.delete(imageCache.keys().next().value as string)
  imageCache.set(url, bytes)
  return bytes
}

async function forgetSnapshot(userId: string, urls: Array<string | null>) {
  await db.userHomeConfig.update({
    where: { userId },
    data: { snapshotUrl: null, snapshotCardUrl: null, snapshotHash: null, snapshotAt: null },
  })
  const keys = urls.map((u) => (u ? keyFromPublicUrl(u) : null)).filter((k): k is string => !!k)
  await deleteObjects(keys, { context: `home-snapshot:${userId}` })
}

export type SnapshotPlan =
  | { action: 'no-home' }
  | { action: 'hidden'; storedUrls: Array<string | null> }
  | { action: 'up-to-date'; hash: string; url: string; cardUrl: string | null }
  | { action: 'draw'; hash: string; scene: HomeScene; storedUrls: Array<string | null> }

/** What a refresh would do for `userId`, without drawing or writing anything. */
export async function planHomeSnapshot(userId: string, { force = false }: { force?: boolean } = {}): Promise<SnapshotPlan> {
  const stored = await db.userHomeConfig.findUnique({
    where: { userId },
    select: { snapshotUrl: true, snapshotCardUrl: true, snapshotHash: true },
  })
  if (!stored) return { action: 'no-home' }
  const storedUrls = [stored.snapshotUrl, stored.snapshotCardUrl]

  // What a signed-out visitor may see, since that's who a shared link reaches.
  const access = await residentAccess(null, userId)
  if (!access.visible) return { action: 'hidden', storedUrls }

  const scene = await loadHomeScene(userId)
  if (!scene) return { action: 'no-home' }

  const hash = snapshotHash(scene)
  if (!force && stored.snapshotUrl && stored.snapshotHash === hash) {
    return { action: 'up-to-date', hash, url: stored.snapshotUrl, cardUrl: stored.snapshotCardUrl }
  }
  return { action: 'draw', hash, scene, storedUrls }
}

/**
 * Render and store `userId`'s snapshot if their yard changed since the last
 * one (or always, with `force`). Throws if rendering or the upload fails.
 */
export async function refreshHomeSnapshot(
  userId: string,
  { force = false, loadImage = loadSnapshotImage }: { force?: boolean; loadImage?: ImageLoader } = {}
): Promise<SnapshotResult> {
  const plan = await planHomeSnapshot(userId, { force })
  if (plan.action === 'no-home') return { status: 'no-home' }
  if (plan.action === 'hidden') {
    if (plan.storedUrls.some(Boolean)) await forgetSnapshot(userId, plan.storedUrls)
    return { status: 'hidden' }
  }
  if (plan.action === 'up-to-date') return { status: 'unchanged', url: plan.url, cardUrl: plan.cardUrl }

  const { hash, scene } = plan
  const { og, card } = await renderHomeSnapshot(scene, { loadImage })
  const [url, cardUrl] = await Promise.all([
    putObject({ key: `${KEY_PREFIX}/${userId}.${hash}.png`, body: og, contentType: 'image/png' }),
    putObject({ key: `${KEY_PREFIX}/${userId}.${hash}.card.png`, body: card, contentType: 'image/png' }),
  ])
  await db.userHomeConfig.update({
    where: { userId },
    data: { snapshotUrl: url, snapshotCardUrl: cardUrl, snapshotHash: hash, snapshotAt: new Date() },
  })

  const replaced = plan.storedUrls
    .filter((u): u is string => !!u && u !== url && u !== cardUrl)
    .map((u) => keyFromPublicUrl(u))
    .filter((k): k is string => !!k)
  if (replaced.length) await deleteObjects(replaced, { context: `home-snapshot:${userId}` })

  return { status: 'rendered', url, cardUrl }
}

/**
 * One refresh at a time per home. A request that arrives while one is
 * running queues exactly one more (which reads the yard fresh), so a burst
 * of saves ends with the last yard drawn and at most two renders.
 */
const inFlight = new Map<string, { run: Promise<SnapshotResult | null>; again: boolean }>()

async function runQueued(userId: string): Promise<SnapshotResult | null> {
  let result: SnapshotResult | null = null
  try {
    do {
      inFlight.get(userId)!.again = false
      try {
        result = await refreshHomeSnapshot(userId)
      } catch (error) {
        result = null
        console.error(`[home-snapshot] Couldn't draw the snapshot for ${userId}:`, error)
      }
    } while (inFlight.get(userId)?.again)
  } finally {
    inFlight.delete(userId)
  }
  return result
}

/**
 * Refresh `userId`'s snapshot in the background. Never throws: failures are
 * logged. The returned promise settles when this home's queue is idle,
 * with the last result (null if it failed); callers may ignore it.
 */
export function scheduleHomeSnapshot(userId: string): Promise<SnapshotResult | null> {
  const running = inFlight.get(userId)
  if (running) {
    running.again = true
    return running.run
  }
  const entry = { run: Promise.resolve<SnapshotResult | null>(null), again: false }
  inFlight.set(userId, entry)
  entry.run = runQueued(userId)
  return entry.run
}
