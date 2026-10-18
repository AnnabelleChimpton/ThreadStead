/**
 * HTTP for the Indie Index bot (SEARCH_PLAN.md §3.5).
 *
 * Everything the refresher fetches goes through a Fetcher, so tests swap in
 * fixtures and never touch the network. The real one checks every redirect
 * hop with the SSRF guard, sends conditional GETs, caps the body, decodes
 * the charset, and identifies itself with a User-Agent that has a contact
 * URL. politeFetcher() adds the per-host gap on top.
 */
import { assertPublicUrl } from '@/lib/utils/security/ssrf'

export { BOT_NAME, botUserAgent } from './public'

export interface FetchRequest {
  url: string
  accept: string
  /** Body cap in bytes. */
  maxBytes: number
  /** Keep the first maxBytes instead of failing (homepages: only the start matters). */
  truncate?: boolean
  etag?: string | null
  lastModified?: string | null
}

export interface FetchResponse {
  status: number
  /** Final URL after redirects. */
  url: string
  headers: { get(name: string): string | null }
  /** Decoded text; '' for 304 and HEAD-like empty bodies. */
  body: string
}

export type Fetcher = (req: FetchRequest) => Promise<FetchResponse>

export class FetchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FetchError'
  }
}

export const ACCEPT_FEED = 'application/rss+xml, application/atom+xml, application/feed+json, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5'
export const ACCEPT_HTML = 'text/html, application/xhtml+xml;q=0.9, */*;q=0.5'
export const ACCEPT_TEXT = 'text/plain, */*;q=0.5'

const CHARSET_IN_TYPE = /charset\s*=\s*["']?([\w.:-]+)/i
const XML_ENCODING = /^\s*<\?xml[^>]*encoding\s*=\s*["']([\w.:-]+)["']/i
const META_CHARSET = /<meta[^>]+charset\s*=\s*["']?([\w.:-]+)/i

/**
 * Bytes → text. Charset from the Content-Type header, then a BOM, then the
 * XML prolog or a <meta charset> in the first 1 KB, else UTF-8. Unknown
 * labels fall back to UTF-8; bad bytes become U+FFFD.
 */
export function decodeBody(bytes: Uint8Array, contentType: string | null): string {
  let label = contentType?.match(CHARSET_IN_TYPE)?.[1]
  if (!label) {
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) label = 'utf-8'
    else if (bytes[0] === 0xff && bytes[1] === 0xfe) label = 'utf-16le'
    else if (bytes[0] === 0xfe && bytes[1] === 0xff) label = 'utf-16be'
  }
  if (!label) {
    const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024))
    label = head.match(XML_ENCODING)?.[1] ?? head.match(META_CHARSET)?.[1]
  }
  let decoder: TextDecoder
  try {
    decoder = new TextDecoder(label ?? 'utf-8')
  } catch {
    decoder = new TextDecoder('utf-8')
  }
  return decoder.decode(bytes)
}

async function readBody(response: Response, maxBytes: number, truncate: boolean): Promise<Uint8Array> {
  const declared = Number(response.headers.get('content-length'))
  if (!truncate && Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel().catch(() => {})
    throw new FetchError(`too large (${declared} bytes)`)
  }
  if (!response.body) return new Uint8Array()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel().catch(() => {})
      if (!truncate) throw new FetchError(`too large (over ${maxBytes} bytes)`)
      break
    }
  }
  const out = new Uint8Array(Math.min(size, maxBytes))
  let offset = 0
  for (const chunk of chunks) {
    const take = Math.min(chunk.byteLength, out.byteLength - offset)
    out.set(chunk.subarray(0, take), offset)
    offset += take
    if (offset >= out.byteLength) break
  }
  return out
}

export interface HttpFetcherOptions {
  userAgent: string
  timeoutMs?: number
  maxRedirects?: number
  /** DNS lookup override (tests). */
  resolve?: Parameters<typeof assertPublicUrl>[1]
}

/** The real Fetcher: SSRF-checked, conditional, capped, decoded. */
export function createHttpFetcher({ userAgent, timeoutMs = 15_000, maxRedirects = 5, resolve }: HttpFetcherOptions): Fetcher {
  return async (req) => {
    const signal = AbortSignal.timeout(timeoutMs)
    const headers: Record<string, string> = { 'User-Agent': userAgent, Accept: req.accept }
    if (req.etag) headers['If-None-Match'] = req.etag
    if (req.lastModified) headers['If-Modified-Since'] = req.lastModified

    let current = req.url
    try {
      for (let hop = 0; ; hop++) {
        try {
          await assertPublicUrl(current, resolve)
        } catch (error) {
          throw new FetchError(error instanceof Error ? error.message : 'unsafe url')
        }
        const response = await fetch(current, { headers, redirect: 'manual', signal })
        const location = response.headers.get('location')
        if (response.status >= 300 && response.status < 400 && response.status !== 304 && location) {
          await response.body?.cancel().catch(() => {})
          if (hop >= maxRedirects) throw new FetchError('too many redirects')
          current = new URL(location, current).toString()
          continue
        }
        if (response.status === 304 || response.status >= 400) {
          await response.body?.cancel().catch(() => {})
          return { status: response.status, url: current, headers: response.headers, body: '' }
        }
        const bytes = await readBody(response, req.maxBytes, req.truncate ?? false)
        return { status: response.status, url: current, headers: response.headers, body: decodeBody(bytes, response.headers.get('content-type')) }
      }
    } catch (error) {
      if (error instanceof FetchError) throw error
      if (signal.aborted) throw new FetchError(`timed out after ${timeoutMs / 1000}s`)
      const cause = (error as { cause?: { code?: string } })?.cause?.code
      throw new FetchError(cause ? `network error (${cause})` : error instanceof Error ? error.message : 'network error')
    }
  }
}

export interface PoliteOptions {
  /** Minimum time between two requests to the same host. */
  gapMs: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Wrap a Fetcher so each host gets one request at a time, at least `gapMs`
 * apart, however many callers share it.
 */
export function politeFetcher(inner: Fetcher, { gapMs, now = Date.now, sleep = realSleep }: PoliteOptions): Fetcher {
  const queues = new Map<string, Promise<unknown>>()
  const lastAt = new Map<string, number>()

  return (req) => {
    let host: string
    try {
      host = new URL(req.url).host.toLowerCase()
    } catch {
      return inner(req)
    }
    const run = async () => {
      const wait = (lastAt.get(host) ?? -Infinity) + gapMs - now()
      if (wait > 0) await sleep(wait)
      try {
        return await inner(req)
      } finally {
        lastAt.set(host, now())
      }
    }
    const result = (queues.get(host) ?? Promise.resolve()).then(run, run)
    queues.set(host, result.catch(() => {}))
    return result
  }
}
