import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import type { ReleaseType } from '@prisma/client'
import { getSessionUser } from '@/lib/auth/server'
import { db } from '@/lib/config/database/connection'
import { csrfFetch } from '@/lib/api/client/csrf-fetch'
import Layout from '@/components/ui/layout/Layout'
import AdminHeader from '@/components/ui/navigation/AdminHeader'
import Button from '@/components/ui/Button'
import { PixelIcon } from '@/components/ui/PixelIcon'
import { useToast } from '@/contexts/ToastContext'
import EnhancedHouseCanvas from '@/components/pixel-homes/EnhancedHouseCanvas'
import type { DecorationItem } from '@/lib/pixel-homes/decoration-data'
import { isPaletteColour } from '@/lib/pixel-homes/palette'
import type { SpriteCheck } from '@/lib/pixel-homes/sprite-checks'
import type { ParsedSpriteName } from '@/lib/pixel-homes/sprite-filename'
import { HOUSE_SORT_Y } from '@/lib/pixel-homes/depth'
import { getDecorationDimensions } from '@/lib/pixel-homes/decoration-dimensions'

interface SampleSprite {
  itemId: string
  type: string
  pngUrl: string
  width: number | null
  height: number | null
  frames: number
}

interface Props {
  samples: SampleSprite[]
}

interface ArtVersion {
  version: number
  url: string
  width: number
  height: number
  frames: number
  colours: number
  createdAt: string
}

interface ExistingItem {
  id: string
  itemId: string
  name: string
  type: string
  releaseType: ReleaseType
  releaseStartAt: string | null
  releaseEndAt: string | null
  collection: string | null
  isActive: boolean
  pngUrl: string | null
  pngVersion: number | null
  artVersions: ArtVersion[]
}

interface Review {
  name: Extract<ParsedSpriteName, { kind: 'decoration' }>
  checks: SpriteCheck[]
  frameWidth: number
  height: number
  frames: number
  trimBottom: number
  gridWidth: number
  gridHeight: number
  colourCount: number
  offPalette: { hex: string; count: number }[]
  blocked: boolean
  needsOverride: boolean
  existing: ExistingItem | null
}

interface Entry {
  key: string
  filename: string
  dataUrl: string
  /** The picture as it will be stored (empty rows under it trimmed), for previews. */
  previewUrl: string | null
  review: Review | null
  error: string | null
  busy: boolean
  allowOffPalette: boolean
  name: string
  collection: string
  description: string
}

const RELEASE_LABELS: Record<ReleaseType, string> = {
  ADMIN_ONLY: 'Only you',
  PUBLIC: 'Everyone',
  LIMITED_TIME: 'Limited time',
  CLAIM_CODE: 'Claim code',
  DEFAULT: 'Everyone (default)',
  BETA_USERS: 'Beta users',
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** The PNG with `rows` empty rows cut off the bottom, as an object URL. 1:1 canvas copies are exact. */
async function trimmedUrl(dataUrl: string, rows: number): Promise<string> {
  const img = await loadImage(dataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = Math.max(1, img.naturalHeight - rows)
  canvas.getContext('2d')!.drawImage(img, 0, 0)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  return blob ? URL.createObjectURL(blob) : dataUrl
}

async function jsonOrError<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error((data as { error?: string }).error || 'Something went wrong.')
  return data as T
}

export default function DecorationsFromPng({ samples }: Props) {
  const { showSuccess, showError } = useToast()
  const [entries, setEntries] = useState<Entry[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const update = useCallback((key: string, patch: Partial<Entry>) => {
    setEntries((list) => list.map((e) => (e.key === key ? { ...e, ...patch } : e)))
  }, [])

  const runCheck = useCallback(async (key: string, filename: string, dataUrl: string) => {
    update(key, { busy: true, error: null })
    try {
      const review = await jsonOrError<Review>(
        await csrfFetch('/api/admin/decorations/sprites/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, imageData: dataUrl }),
        })
      )
      const previewUrl = await trimmedUrl(dataUrl, review.trimBottom)
      update(key, { review, previewUrl, busy: false })
    } catch (error) {
      update(key, { review: null, error: (error as Error).message, busy: false })
    }
  }, [update])

  const addFiles = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const key = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const dataUrl = await readDataUrl(file)
      setEntries((list) => [
        {
          key, filename: file.name, dataUrl, previewUrl: null, review: null, error: null, busy: true,
          allowOffPalette: false, name: '', collection: '', description: '',
        },
        ...list,
      ])
      void runCheck(key, file.name, dataUrl)
    }
  }, [runCheck])

  const publish = async (entry: Entry) => {
    update(entry.key, { busy: true })
    try {
      const { item, version } = await jsonOrError<{ item: ExistingItem; version: number }>(
        await csrfFetch('/api/admin/decorations/sprites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: entry.filename,
            imageData: entry.dataUrl,
            allowOffPalette: entry.allowOffPalette,
            name: entry.name || undefined,
            collection: entry.collection || null,
            description: entry.description || null,
          }),
        })
      )
      showSuccess(`Saved ${item.itemId}, version ${version}.`)
      await runCheck(entry.key, entry.filename, entry.dataUrl)
    } catch (error) {
      showError((error as Error).message)
      update(entry.key, { busy: false })
    }
  }

  const pointAt = async (entry: Entry, item: ExistingItem, version: number) => {
    update(entry.key, { busy: true })
    try {
      await jsonOrError<unknown>(
        await csrfFetch(`/api/admin/decorations/${item.id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version }),
        })
      )
      showSuccess(`${item.itemId} now shows version ${version}.`)
      await runCheck(entry.key, entry.filename, entry.dataUrl)
    } catch (error) {
      showError((error as Error).message)
      update(entry.key, { busy: false })
    }
  }

  const release = async (entry: Entry, item: ExistingItem, change: ReleaseChange) => {
    update(entry.key, { busy: true })
    try {
      const data = change.kind === 'put'
        ? await jsonOrError<{ claimUrl?: string | null }>(await csrfFetch(`/api/admin/decorations/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(change.body),
          }))
        : await jsonOrError<{ claimUrl?: string | null }>(await csrfFetch(`/api/admin/decorations/${item.id}/release`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(change.body),
          }))
      showSuccess(data.claimUrl ? `Claim link: ${data.claimUrl}` : 'Saved.')
      await runCheck(entry.key, entry.filename, entry.dataUrl)
    } catch (error) {
      showError((error as Error).message)
      update(entry.key, { busy: false })
    }
  }

  return (
    <Layout fullWidth>
      <div className="p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <AdminHeader current="decorations">
            <p>
              New from PNG. Name files like <code>plant_roses_red.png</code>, or <code>water_fountain@4f.png</code> for a
              4-frame strip. A new item starts out visible only to you.
            </p>
          </AdminHeader>
          <p className="mb-4 flex flex-wrap gap-4 text-sm">
            <Link href="/admin/decorations">All decorations</Link>
            <Link href="/admin/decorations/sheet">Contact sheet</Link>
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              void addFiles(e.dataTransfer.files)
            }}
            className={`thread-module mb-6 flex flex-col items-center gap-3 border-2 border-dashed p-8 text-center ${dragging ? 'border-nb-ink' : 'border-nb-ink-mid/40'}`}
          >
            <PixelIcon name="upload" size={24} />
            <p className="mb-0">Drop PNGs here</p>
            <Button variant="secondary" onClick={() => inputRef.current?.click()}>Choose files</Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/png"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          {entries.map((entry) => (
            <SpriteCard
              key={entry.key}
              entry={entry}
              samples={samples}
              onChange={(patch) => update(entry.key, patch)}
              onPublish={() => publish(entry)}
              onPointAt={(item, version) => pointAt(entry, item, version)}
              onRelease={(item, change) => release(entry, item, change)}
              onRemove={() => setEntries((list) => list.filter((e) => e.key !== entry.key))}
            />
          ))}
        </div>
      </div>
    </Layout>
  )
}

type ReleaseChange =
  | { kind: 'put'; body: { releaseType?: ReleaseType; collection?: string | null; releaseStartAt?: null; releaseEndAt?: null } }
  | { kind: 'release'; body: { releaseType: 'LIMITED_TIME' | 'CLAIM_CODE'; releaseStartAt?: string; releaseEndAt?: string; generateCode?: boolean } }

function SpriteCard({
  entry, samples, onChange, onPublish, onPointAt, onRelease, onRemove,
}: {
  entry: Entry
  samples: SampleSprite[]
  onChange: (patch: Partial<Entry>) => void
  onPublish: () => void
  onPointAt: (item: ExistingItem, version: number) => void
  onRelease: (item: ExistingItem, change: ReleaseChange) => void
  onRemove: () => void
}) {
  const { review, error } = entry
  const existing = review?.existing ?? null
  const nextVersion = (existing?.artVersions[0]?.version ?? 0) + 1
  const canPublish = !!review && !review.blocked && (!review.needsOverride || entry.allowOffPalette) && !entry.busy

  return (
    <section className="thread-module mb-6" aria-busy={entry.busy}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="thread-headline text-lg font-bold mb-0">
          <code>{entry.filename}</code>
        </h2>
        <Button variant="secondary" size="sm" onClick={onRemove}>Remove</Button>
      </div>

      {error && <p className="text-red-700 mb-0" role="alert"><PixelIcon name="alert" size={14} /> {error}</p>}
      {!review && !error && <p className="text-nb-ink-mid mb-0">Checking…</p>}

      {review && (
        <>
          <p className="text-sm text-nb-ink-mid">
            {existing
              ? <>Updates <strong>{existing.name}</strong> ({existing.type}).{' '}
                  {existing.pngVersion
                    ? `It shows version ${existing.pngVersion} now.`
                    : existing.pngUrl ? 'Its current PNG is from before versions were kept.' : "It's code-drawn right now."}</>
              : <>New item <strong>{review.name.itemId}</strong>, a {review.name.type}, in {review.name.category}.</>}
            {' '}{review.frameWidth}×{review.height}
            {review.frames > 1 && <>, {review.frames} frames</>}
            {' '}· {review.gridWidth}×{review.gridHeight} grid cells
          </p>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div>
              <ArtWithMarks dataUrl={entry.dataUrl} offPalette={review.offPalette.length > 0} />
              <ul className="mt-3 space-y-1 text-sm list-none p-0">
                {review.checks.map((check) => (
                  <li key={check.id} className="flex items-start gap-2">
                    <PixelIcon
                      name={check.status === 'pass' ? 'check' : check.status === 'warn' ? 'warning-box' : 'close'}
                      size={14}
                      className={check.status === 'fail' ? 'text-red-700' : check.status === 'warn' ? 'text-amber-700' : 'text-green-800'}
                    />
                    <span>{check.message}</span>
                  </li>
                ))}
              </ul>
              {review.offPalette.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm mb-1">Not in threadstead-44:</p>
                  <ul className="flex flex-wrap gap-2 list-none p-0 text-xs">
                    {review.offPalette.map((c) => (
                      <li key={c.hex} className="flex items-center gap-1">
                        <span className="inline-block h-4 w-4 border border-nb-ink-mid/40" style={{ background: c.hex }} />
                        <code>{c.hex}</code> ×{c.count}
                      </li>
                    ))}
                  </ul>
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={entry.allowOffPalette}
                      onChange={(e) => onChange({ allowOffPalette: e.target.checked })}
                    />
                    Upload anyway
                  </label>
                </div>
              )}
            </div>

            <div className="min-w-0">
              {entry.previewUrl && <YardPreview review={review} previewUrl={entry.previewUrl} samples={samples} />}
            </div>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              {!existing && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    Name
                    <input className="mt-1 w-full border border-nb-ink-mid/40 px-2 py-1" value={entry.name}
                      placeholder={review.name.itemId.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')}
                      onChange={(e) => onChange({ name: e.target.value })} />
                  </label>
                  <label className="text-sm">
                    Collection
                    <input className="mt-1 w-full border border-nb-ink-mid/40 px-2 py-1" value={entry.collection}
                      placeholder="Autumn 2026" onChange={(e) => onChange({ collection: e.target.value })} />
                  </label>
                  <label className="text-sm sm:col-span-2">
                    Description
                    <input className="mt-1 w-full border border-nb-ink-mid/40 px-2 py-1" value={entry.description}
                      onChange={(e) => onChange({ description: e.target.value })} />
                  </label>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button onClick={onPublish} disabled={!canPublish}>
                  {existing ? `Upload as version ${nextVersion}` : 'Add to the catalog'}
                </Button>
                {review.blocked && <span className="text-sm text-nb-ink-mid">Fix the problems above first.</span>}
                {!review.blocked && review.needsOverride && !entry.allowOffPalette && (
                  <span className="text-sm text-nb-ink-mid">Some colours aren&rsquo;t in the palette.</span>
                )}
              </div>
            </div>

            {existing && (
              <div className="space-y-4">
                <ReleasePanel item={existing} busy={entry.busy} onRelease={(change) => onRelease(existing, change)} />
                <VersionList item={existing} busy={entry.busy} onPointAt={(v) => onPointAt(existing, v)} />
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

/** The sprite at 4×, optionally with every off-palette pixel boxed. */
function ArtWithMarks({ dataUrl, offPalette }: { dataUrl: string; offPalette: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mark, setMark] = useState(false)
  const SCALE = 4

  useEffect(() => {
    let cancelled = false
    loadImage(dataUrl).then((img) => {
      const canvas = canvasRef.current
      if (cancelled || !canvas) return
      const w = img.naturalWidth
      const h = img.naturalHeight
      canvas.width = w * SCALE
      canvas.height = h * SCALE
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, w * SCALE, h * SCALE)
      if (!mark) return
      const source = document.createElement('canvas')
      source.width = w
      source.height = h
      const sctx = source.getContext('2d')!
      sctx.drawImage(img, 0, 0)
      const { data } = sctx.getImageData(0, 0, w, h)
      ctx.strokeStyle = '#ff00ff'
      ctx.lineWidth = 1
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          if (data[i + 3] !== 255) continue
          const hex = '#' + [data[i], data[i + 1], data[i + 2]].map((n) => n.toString(16).padStart(2, '0')).join('')
          if (!isPaletteColour(hex)) ctx.strokeRect(x * SCALE + 0.5, y * SCALE + 0.5, SCALE - 1, SCALE - 1)
        }
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [dataUrl, mark])

  return (
    <div>
      <div className="overflow-auto bg-[repeating-conic-gradient(#e8e0d4_0%_25%,#fffaf5_0%_50%)] bg-[length:16px_16px] p-2">
        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', display: 'block' }} />
      </div>
      {offPalette && (
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={mark} onChange={(e) => setMark(e.target.checked)} />
          Box the colours that aren&rsquo;t in the palette
        </label>
      )}
    </div>
  )
}

/** Where the new sprite stands in the preview yard: left of the house, on the lawn. */
const PREVIEW_FEET = { x: 104, y: HOUSE_SORT_Y + 48 }
const SAMPLE_SPOTS = [
  { x: 392, y: HOUSE_SORT_Y + 40 },
  { x: 440, y: HOUSE_SORT_Y + 96 },
  { x: 40, y: HOUSE_SORT_Y + 104 },
]

/** The sprite in a real yard at 1× and 2×, next to the house and three existing sprites. */
function YardPreview({ review, previewUrl, samples }: { review: Review; previewUrl: string; samples: SampleSprite[] }) {
  const decorations = useMemo<DecorationItem[]>(() => {
    const sprite: DecorationItem = {
      id: `preview_${review.name.itemId}`,
      decorationId: review.name.itemId,
      name: review.name.itemId,
      type: review.name.type,
      position: {
        x: PREVIEW_FEET.x - Math.round(review.frameWidth / 2),
        y: PREVIEW_FEET.y - review.height,
      },
      pngUrl: previewUrl,
      pngWidth: review.frameWidth,
      pngHeight: review.height,
      pngFrames: review.frames,
    }
    const others: DecorationItem[] = samples.slice(0, 3).map((s, i) => {
      const { width, height } = getDecorationDimensions(s.itemId, s.type, 'medium', { pngUrl: s.pngUrl, pngWidth: s.width, pngHeight: s.height })
      return {
        id: `sample_${s.itemId}`,
        decorationId: s.itemId,
        name: s.itemId,
        type: s.type as DecorationItem['type'],
        position: { x: SAMPLE_SPOTS[i].x - Math.round(width / 2), y: SAMPLE_SPOTS[i].y - height },
        pngUrl: s.pngUrl,
        ...(s.width && s.height && { pngWidth: s.width, pngHeight: s.height }),
        pngFrames: s.frames,
      }
    })
    return [sprite, ...others]
  }, [review, previewUrl, samples])

  return (
    <div className="space-y-4">
      <figure className="m-0">
        <figcaption className="text-sm mb-1">1×</figcaption>
        <div className="overflow-x-auto">
          <EnhancedHouseCanvas template="cabin_v1" palette="thread_sage" decorations={decorations} pixelPerfect fixedScale={1} className="w-[512px]" />
        </div>
      </figure>
      <figure className="m-0">
        <figcaption className="text-sm mb-1">2×, with a height ruler from the ground line (the door is 32). Light comes from the top left.</figcaption>
        <div className="flex overflow-x-auto">
          <HeightRuler feetY={PREVIEW_FEET.y} scale={2} />
          <EnhancedHouseCanvas template="cabin_v1" palette="thread_sage" decorations={decorations} pixelPerfect fixedScale={2} className="w-[1024px] shrink-0" />
        </div>
      </figure>
    </div>
  )
}

/** Ticks every 8 art px up from the sprite's feet, beside (not over) the yard. */
function HeightRuler({ feetY, scale }: { feetY: number; scale: number }) {
  const height = 352 * scale
  const marks = Array.from({ length: 13 }, (_, i) => i * 8)
  return (
    <svg width={40} height={height} className="shrink-0" aria-hidden="true" shapeRendering="crispEdges">
      <rect x={34} y={(feetY - 96) * scale} width={2} height={96 * scale} fill="#7a6c64" />
      {marks.map((m) => {
        const y = (feetY - m) * scale
        const major = m % 16 === 0
        return (
          <g key={m}>
            <rect x={major ? 26 : 30} y={y - 1} width={major ? 10 : 6} height={2} fill={m === 32 ? '#c4473a' : '#7a6c64'} />
            {major && <text x={22} y={y + 4} textAnchor="end" fontSize={11} fill={m === 32 ? '#c4473a' : '#4a403d'}>{m}</text>}
          </g>
        )
      })}
    </svg>
  )
}

function ReleasePanel({ item, busy, onRelease }: { item: ExistingItem; busy: boolean; onRelease: (change: ReleaseChange) => void }) {
  const [collection, setCollection] = useState(item.collection ?? '')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  useEffect(() => setCollection(item.collection ?? ''), [item.collection])

  return (
    <div>
      <h3 className="thread-label mb-1">Release</h3>
      <p className="text-sm mb-2">
        Who can place it: <strong>{RELEASE_LABELS[item.releaseType]}</strong>
        {item.releaseType === 'LIMITED_TIME' && item.releaseStartAt && item.releaseEndAt && (
          <> ({new Date(item.releaseStartAt).toLocaleString()} to {new Date(item.releaseEndAt).toLocaleString()})</>
        )}
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {item.releaseType !== 'PUBLIC' && (
          <Button size="sm" disabled={busy} onClick={() => onRelease({ kind: 'put', body: { releaseType: 'PUBLIC', releaseStartAt: null, releaseEndAt: null } })}>
            Release to everyone
          </Button>
        )}
        {item.releaseType !== 'ADMIN_ONLY' && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => onRelease({ kind: 'put', body: { releaseType: 'ADMIN_ONLY', releaseStartAt: null, releaseEndAt: null } })}>
            Back to only you
          </Button>
        )}
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onRelease({ kind: 'release', body: { releaseType: 'CLAIM_CODE', generateCode: true } })}>
          Make a claim code
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2 mb-3 text-sm">
        <label>From<input type="datetime-local" className="ml-1 border border-nb-ink-mid/40 px-1" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label>to<input type="datetime-local" className="ml-1 border border-nb-ink-mid/40 px-1" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        <Button size="sm" variant="secondary" disabled={busy || !start || !end}
          onClick={() => onRelease({ kind: 'release', body: { releaseType: 'LIMITED_TIME', releaseStartAt: new Date(start).toISOString(), releaseEndAt: new Date(end).toISOString() } })}>
          Release for these dates
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2 text-sm">
        <label>Collection<input className="ml-1 border border-nb-ink-mid/40 px-1" value={collection} placeholder="Autumn 2026" onChange={(e) => setCollection(e.target.value)} /></label>
        <Button size="sm" variant="secondary" disabled={busy || collection === (item.collection ?? '')}
          onClick={() => onRelease({ kind: 'put', body: { collection: collection || null } })}>
          Save collection
        </Button>
      </div>
    </div>
  )
}

function VersionList({ item, busy, onPointAt }: { item: ExistingItem; busy: boolean; onPointAt: (version: number) => void }) {
  if (item.artVersions.length === 0) {
    return <p className="text-sm text-nb-ink-mid">No stored versions yet. The current art was uploaded before versions were kept.</p>
  }
  return (
    <div>
      <h3 className="thread-label mb-1">Versions</h3>
      <ul className="list-none p-0 space-y-2">
        {item.artVersions.map((v) => (
          <li key={v.version} className="flex items-center gap-3 text-sm">
            <span className="flex h-12 w-12 items-end justify-center bg-[#e8e0d4] overflow-hidden">
              <img src={v.url} alt="" width={v.width} height={v.height}
                style={{ imageRendering: 'pixelated', maxWidth: 'none', width: v.width, height: v.height, objectFit: 'cover', objectPosition: 'left top' }} />
            </span>
            <span className="flex-1">
              v{v.version} · {v.width}×{v.height}{v.frames > 1 && `, ${v.frames} frames`} · {v.colours} colours · {new Date(v.createdAt).toLocaleDateString()}
            </span>
            {item.pngVersion === v.version
              ? <span className="text-nb-ink-mid">Showing</span>
              : <Button size="sm" variant="secondary" disabled={busy} onClick={() => onPointAt(v.version)}>Use this one</Button>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const user = await getSessionUser(context.req)
  if (user?.role !== 'admin') return { notFound: true }

  // Three of her sprites to stand next to the new one
  const samples = await db.decorationItem.findMany({
    where: { isActive: true, pngUrl: { not: null } },
    select: { itemId: true, type: true, pngUrl: true, width: true, height: true, frames: true },
    orderBy: { itemId: 'asc' },
    take: 3,
  })
  return { props: { samples: samples as SampleSprite[] } }
}
