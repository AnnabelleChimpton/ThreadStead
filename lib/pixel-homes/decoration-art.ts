/**
 * Catalog sprites from PNG: check, store and version them. Server-only.
 *
 * Every upload is a new file, `pixel-homes/decorations/{itemId}.v{n}.png`,
 * and a DecorationArtVersion row. The item points at one version (pngUrl,
 * width, height, frames, pngVersion), so reverting is just pointing back.
 * Old files are never overwritten or deleted, which keeps a yard's share
 * snapshot and any cached page correct until it next redraws.
 */
import sharp from 'sharp'
import type { DecorationItem, ReleaseType } from '@prisma/client'
import { db } from '@/lib/config/database/connection'
import { putObject } from '@/lib/storage/r2'
import { ImageValidationError, preparePixelArtPng, type PixelArtInspection } from '@/lib/media/image'
import { checkSprite, GRID_CELL, MAX_SPRITE_SIZE, type SpriteCheckResult } from './sprite-checks'
import { MAX_FRAMES, nameFromItemId, parseSpriteFilename, type ParsedSpriteName } from './sprite-filename'

const KEY_PREFIX = 'pixel-homes/decorations'
export const MAX_SPRITE_BYTES = 500 * 1024

export type DecorationName = Extract<ParsedSpriteName, { kind: 'decoration' }>

export interface SpriteReview {
  name: DecorationName
  inspection: PixelArtInspection
  result: SpriteCheckResult
}

/** Thrown when a filename or picture can't become a sprite; the message is for the admin. */
export class SpriteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SpriteError'
  }
}

/** Filename + picture → the checks the admin sees. Writes nothing. */
export async function reviewSprite(filename: string, input: Buffer): Promise<SpriteReview> {
  const parsed = parseSpriteFilename(filename)
  if (!parsed.ok) throw new SpriteError(parsed.error)
  if (parsed.value.kind !== 'decoration') {
    throw new SpriteError("House layers can't be uploaded yet. They arrive with the cabin redraw.")
  }
  let prepared
  try {
    prepared = await preparePixelArtPng(input, {
      maxBytes: MAX_SPRITE_BYTES,
      maxDimension: MAX_SPRITE_SIZE * MAX_FRAMES,
    })
  } catch (error) {
    if (error instanceof ImageValidationError) throw new SpriteError(error.message)
    throw error
  }
  return {
    name: parsed.value,
    inspection: prepared.inspection,
    result: checkSprite(prepared.inspection, parsed.value.frames),
  }
}

/** The PNG as it will be stored: empty rows under the art cut off, pixels unchanged. */
export async function finalSpritePng(input: Buffer, review: SpriteReview): Promise<Buffer> {
  const { width, height } = review.inspection
  const source = review.result.trimBottom > 0
    ? await sharp(input).extract({ left: 0, top: 0, width, height: height - review.result.trimBottom }).png().toBuffer()
    : input
  const prepared = await preparePixelArtPng(source, {
    maxBytes: MAX_SPRITE_BYTES,
    maxDimension: MAX_SPRITE_SIZE * MAX_FRAMES,
    rejectPartialAlpha: true,
  })
  return prepared.buffer
}

export interface NewItemFields {
  name?: string
  releaseType?: ReleaseType
  releaseStartAt?: Date | null
  releaseEndAt?: Date | null
  collection?: string | null
  description?: string | null
}

export interface PublishResult {
  item: DecorationItem
  version: number
  created: boolean
}

/**
 * Store a checked sprite as the item's next version and point the item at
 * it. A new itemId creates the catalog item, ADMIN_ONLY unless told
 * otherwise, and gives the uploader a claim so it shows in their own editor.
 */
export async function publishSprite({
  filename,
  input,
  allowOffPalette = false,
  fields = {},
  adminId,
}: {
  filename: string
  input: Buffer
  allowOffPalette?: boolean
  fields?: NewItemFields
  /** Who uploaded it; they get a claim on a new ADMIN_ONLY item. The batch script may have nobody. */
  adminId: string | null
}): Promise<PublishResult> {
  const review = await reviewSprite(filename, input)
  const { name, result } = review
  if (result.blocked) {
    throw new SpriteError(result.checks.filter((c) => c.status === 'fail').map((c) => c.message).join(' '))
  }
  if (result.needsOverride && !allowOffPalette) {
    throw new SpriteError('Some colours aren’t in threadstead-44. Tick "Upload anyway" to use them.')
  }

  const releaseType = fields.releaseType ?? 'ADMIN_ONLY'
  if (releaseType === 'LIMITED_TIME') {
    if (!fields.releaseStartAt || !fields.releaseEndAt) throw new SpriteError('A limited release needs a start and an end.')
    if (fields.releaseStartAt >= fields.releaseEndAt) throw new SpriteError('The release has to start before it ends.')
  }

  const png = await finalSpritePng(input, review)
  const existing = await db.decorationItem.findUnique({
    where: { itemId: name.itemId },
    include: { artVersions: { select: { version: true }, orderBy: { version: 'desc' }, take: 1 } },
  })
  if (existing && existing.type !== name.type) {
    throw new SpriteError(`${name.itemId} is already a ${existing.type}, not a ${name.type}. Rename the file to ${existing.type}_${name.itemId}.png.`)
  }
  // Versions continue from the history; an item with only an old unversioned pngUrl starts at 1.
  const version = (existing?.artVersions[0]?.version ?? 0) + 1
  const url = await putObject({ key: `${KEY_PREFIX}/${name.itemId}.v${version}.png`, body: png, contentType: 'image/png' })

  const art = {
    pngUrl: url,
    width: result.frameWidth,
    height: result.height,
    frames: result.frames,
    pngVersion: version,
    gridWidth: result.gridWidth,
    gridHeight: result.gridHeight,
  }

  const item = await db.$transaction(async (tx) => {
    const saved = existing
      ? await tx.decorationItem.update({ where: { id: existing.id }, data: art })
      : await tx.decorationItem.create({
          data: {
            ...art,
            itemId: name.itemId,
            name: fields.name?.trim() || nameFromItemId(name.itemId),
            type: name.type,
            category: name.category,
            zone: 'front_yard',
            releaseType,
            releaseStartAt: fields.releaseStartAt ?? null,
            releaseEndAt: fields.releaseEndAt ?? null,
            collection: fields.collection?.trim() || null,
            description: fields.description?.trim() || null,
            createdBy: adminId,
          },
        })
    await tx.decorationArtVersion.create({
      data: {
        decorationId: saved.id,
        version,
        url,
        width: result.frameWidth,
        height: result.height,
        frames: result.frames,
        colours: result.colourCount,
        createdBy: adminId,
      },
    })
    if (!existing && releaseType === 'ADMIN_ONLY' && adminId) {
      await tx.userDecorationClaim.upsert({
        where: { userId_decorationId: { userId: adminId, decorationId: saved.id } },
        create: { userId: adminId, decorationId: saved.id, claimMethod: 'ADMIN_GRANT' },
        update: {},
      })
    }
    return saved
  })

  return { item, version, created: !existing }
}

/** Point an item back (or forward) at one of its stored versions. */
export async function pointAtSpriteVersion(decorationId: string, version: number): Promise<DecorationItem> {
  const row = await db.decorationArtVersion.findUnique({
    where: { decorationId_version: { decorationId, version } },
  })
  if (!row) throw new SpriteError(`There's no version ${version} of this decoration.`)
  return db.decorationItem.update({
    where: { id: decorationId },
    data: {
      pngUrl: row.url,
      width: row.width,
      height: row.height,
      frames: row.frames,
      pngVersion: row.version,
      gridWidth: Math.max(1, Math.ceil(row.width / GRID_CELL)),
      gridHeight: Math.max(1, Math.ceil(row.height / GRID_CELL)),
    },
  })
}
