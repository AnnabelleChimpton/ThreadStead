/**
 * Pictures for a resident's own page (UploadContext "other", see
 * upload-context.ts): uploaded from the editor's image picker, or copied
 * from their own verified site so a page brought in from Neocities keeps
 * its pictures if the site goes away.
 *
 * They don't use the gallery's 50 photos a month or 5 uploads an hour
 * (a page can have dozens of small GIFs); they share one allowance of
 * bytes instead, counted from what was uploaded.
 */
import type { PrismaClient } from '@prisma/client'
import { FetchError, type Fetcher } from '@/lib/indie-index/http'
import { siteRefOf } from '@/lib/indie-index/site-key'
import { ImageValidationError } from './image'
import { PAGE_ASSET_CONTEXT } from './upload-context'

export const PAGE_PICTURE_BYTES = 50 * 1024 * 1024
/** One copied picture, at most (an upload's own cap is the media page's 25 MB) */
export const COPY_MAX_BYTES = 10 * 1024 * 1024
export { COPY_BATCH } from './upload-context'

const ACCEPT_IMAGE = 'image/gif, image/png, image/webp, image/jpeg;q=0.9, */*;q=0.1'

export function pagePicturesFull(): string {
  return `Your page pictures are full (${PAGE_PICTURE_BYTES / 1024 / 1024} MB). Delete some on your media page to make room.`
}

/** Bytes of page pictures the resident has */
export async function pagePictureBytes(db: Pick<PrismaClient, 'media'>, userId: string): Promise<number> {
  const { _sum } = await db.media.aggregate({ where: { userId, uploadContext: PAGE_ASSET_CONTEXT }, _sum: { fileSize: true } })
  return _sum.fileSize ?? 0
}

/** The picture's type from its bytes (never the server's Content-Type), or null */
export function pictureType(bytes: Uint8Array): 'image/gif' | 'image/png' | 'image/jpeg' | 'image/webp' | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to))
  if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') return 'image/gif'
  if (bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  return null
}

/** cat.gif from https://pat.neocities.org/img/cat.gif?v=2 */
export function fileNameOf(url: string): string {
  try {
    const last = new URL(url).pathname.split('/').pop() || 'picture'
    return decodeURIComponent(last).slice(0, 200)
  } catch {
    return 'picture'
  }
}

export interface CopyResult {
  /** Each copied address and where it's stored now */
  copied: Record<string, string>
  /** Addresses left where they were, and why */
  left: Array<{ url: string; reason: string }>
  /** The allowance ran out partway */
  full: boolean
}

/**
 * Copy pictures from the resident's own verified sites (`siteRefs`, their
 * site keys) into their page pictures. Anything not on one of those sites
 * is left alone; so is a redirect off it, as when the page was brought in.
 * `store` renders and records one picture and returns its address. Never
 * throws for one picture's trouble: it's listed in `left`.
 */
export async function copySitePictures({ urls, siteRefs, usedBytes, fetcher, store }: {
  urls: string[]
  siteRefs: Set<string>
  usedBytes: number
  fetcher: Fetcher
  store: (bytes: Buffer, type: string, name: string) => Promise<string>
}): Promise<CopyResult> {
  const result: CopyResult = { copied: {}, left: [], full: false }
  let used = usedBytes
  for (const url of [...new Set(urls)]) {
    const ref = siteRefOf(url)?.key
    if (!ref || !siteRefs.has(ref)) {
      result.left.push({ url, reason: "It isn't on one of your sites." })
      continue
    }
    if (result.full) {
      result.left.push({ url, reason: pagePicturesFull() })
      continue
    }
    try {
      const response = await fetcher({ url, accept: ACCEPT_IMAGE, maxBytes: COPY_MAX_BYTES, raw: true })
      if (response.status >= 400) {
        result.left.push({ url, reason: `Your site answered ${response.status}.` })
        continue
      }
      if (siteRefOf(response.url)?.key !== ref) {
        result.left.push({ url, reason: 'It sent me on to another site.' })
        continue
      }
      const bytes = Buffer.from(response.bytes ?? new Uint8Array())
      const type = pictureType(bytes)
      if (!type) {
        result.left.push({ url, reason: "It isn't a GIF, PNG, JPEG or WebP." })
        continue
      }
      if (used + bytes.length > PAGE_PICTURE_BYTES) {
        result.full = true
        result.left.push({ url, reason: pagePicturesFull() })
        continue
      }
      result.copied[url] = await store(bytes, type, fileNameOf(url))
      used += bytes.length
    } catch (error) {
      result.left.push({
        url,
        reason: error instanceof FetchError
          ? `I couldn't get it (${error.message}).`
          : error instanceof ImageValidationError ? error.message : "I couldn't copy it.",
      })
    }
  }
  return result
}
