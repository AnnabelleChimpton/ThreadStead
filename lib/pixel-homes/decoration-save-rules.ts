/**
 * What a saved pixel home may contain, shared by the editor and
 * POST /api/home/decorations/save.
 *
 * Strict on write (the zod schema below), lenient on read (the normalize*
 * helpers): older rows hold values like a wallColor of `000000` with no `#`,
 * and the editor must still open and re-save those homes.
 */
import { z } from 'zod'
import { TERRAIN_TILES } from './decoration-data'
import { MAX_LAYER_BIAS, MIN_LAYER_BIAS, clampLayerBias } from './depth'

export const MAX_DECORATIONS = 100

export const CANVAS_WIDTH = 512
export const CANVAS_HEIGHT = 352
export const TERRAIN_CELL = 16
export const TERRAIN_COLUMNS = CANVAS_WIDTH / TERRAIN_CELL
export const TERRAIN_ROWS = CANVAS_HEIGHT / TERRAIN_CELL
/** Grid cells a decoration's top-left may use: the scene, plus the same margin as positions. */
const GRID_MIN = -8
const GRID_MAX_X = CANVAS_WIDTH / TERRAIN_CELL
const GRID_MAX_Y = CANVAS_HEIGHT / TERRAIN_CELL
/**
 * How far a decoration's top-left corner may sit outside the canvas. Items
 * are centred on the cursor, so one dropped at the edge starts up to half
 * its width out; the largest sprite is about 90 px.
 */
export const POSITION_MARGIN = 128
/** Per-decoration `data` (sign text, custom-art slot), as JSON. */
export const MAX_DECORATION_DATA_BYTES = 1024

export const HOUSE_TEMPLATES = ['cottage_v1', 'townhouse_v1', 'loft_v1', 'cabin_v1'] as const
export const COLOR_PALETTES = ['thread_sage', 'charcoal_nights', 'pixel_petals', 'crt_glow', 'classic_linen'] as const
export const SKIES = ['sunny', 'cloudy', 'sunset', 'night'] as const
// Nothing edits weather or time of day yet; both spellings of rain and snow exist in code.
export const WEATHERS = ['clear', 'light_rain', 'light_snow', 'rain', 'snow'] as const
export const TIMES_OF_DAY = ['morning', 'midday', 'evening', 'night'] as const

export const WINDOW_STYLES = ['default', 'round', 'arched', 'bay'] as const
export const DOOR_STYLES = ['default', 'arched', 'double', 'cottage'] as const
export const ROOF_TRIMS = ['default', 'ornate', 'scalloped', 'gabled'] as const
export const WINDOW_TREATMENTS = ['default', 'shutters', 'flower_boxes', 'awnings'] as const
export const CHIMNEY_STYLES = ['default', 'brick', 'stone', 'none'] as const
export const WELCOME_MATS = ['none', 'plain', 'floral', 'welcome_text', 'custom_text'] as const
export const HOUSE_NUMBER_STYLES = ['classic', 'modern', 'rustic'] as const
export const EXTERIOR_LIGHTS = ['none', 'lantern', 'string_lights', 'modern'] as const

export const DECORATION_ZONES = ['front_yard', 'house_facade', 'background'] as const
export const DECORATION_SIZES = ['small', 'medium', 'large'] as const

/** Generous caps: the editor's own limits are lower, older ones were higher. */
export const TEXT_LIMITS = {
  houseTitle: 100,
  houseDescription: 500,
  houseBoardText: 40,
  houseNumber: 16,
  welcomeMatText: 40,
} as const

export const COLOR_FIELDS = ['wallColor', 'roofColor', 'trimColor', 'windowColor', 'detailColor', 'welcomeMatColor'] as const
type ColorField = (typeof COLOR_FIELDS)[number]

const ENUM_FIELDS = {
  windowStyle: WINDOW_STYLES,
  doorStyle: DOOR_STYLES,
  roofTrim: ROOF_TRIMS,
  windowTreatments: WINDOW_TREATMENTS,
  chimneyStyle: CHIMNEY_STYLES,
  welcomeMat: WELCOME_MATS,
  houseNumberStyle: HOUSE_NUMBER_STYLES,
  exteriorLights: EXTERIOR_LIGHTS,
} as const
type EnumField = keyof typeof ENUM_FIELDS

const TERRAIN_IDS = new Set(TERRAIN_TILES.map((t) => t.id))
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/
const CUSTOM_ASSET_ID = /^custom_asset_[0-4]$/
const MAX_LAYER = 10_000_000

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value)
}

/** `#a1b2c3`, `A1B2C3` and `#abc` become `#a1b2c3`/`#A1B2C3`/`#aabbcc`; anything else is null. */
export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`
  if (/^[0-9a-fA-F]{3}$/.test(raw)) return `#${raw.split('').map((c) => c + c).join('')}`
  return null
}

function oneOf<T extends readonly string[]>(values: T, value: unknown): T[number] | null {
  return typeof value === 'string' && (values as readonly string[]).includes(value) ? (value as T[number]) : null
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function isTerrainKey(key: string): boolean {
  const match = /^(\d{1,2}),(\d{1,2})$/.exec(key)
  return !!match && Number(match[1]) < TERRAIN_COLUMNS && Number(match[2]) < TERRAIN_ROWS
}

// ------------------------------------------------------------- read side --

type LooseConfig = Record<string, unknown>

/** The stored house-config columns, made safe for the editor (unknown values fall back to defaults). */
export function normalizeHomeConfig(config: LooseConfig) {
  const customizations: Record<string, string | null> = {}
  for (const field of COLOR_FIELDS) customizations[field] = normalizeHexColor(config[field])
  for (const field of Object.keys(ENUM_FIELDS) as EnumField[]) {
    customizations[field] = oneOf(ENUM_FIELDS[field], config[field])
  }
  for (const [field, max] of Object.entries(TEXT_LIMITS)) {
    const value = config[field]
    customizations[field] = typeof value === 'string' && value !== '' ? value.slice(0, max) : null
  }

  return {
    template: oneOf(HOUSE_TEMPLATES, config.houseTemplate) ?? 'cottage_v1',
    palette: oneOf(COLOR_PALETTES, config.palette) ?? 'thread_sage',
    houseCustomizations: customizations,
    atmosphere: {
      sky: oneOf(SKIES, config.atmosphereSky) ?? 'sunny',
      weather: oneOf(WEATHERS, config.atmosphereWeather) ?? 'clear',
      timeOfDay: oneOf(TIMES_OF_DAY, config.atmosphereTimeOfDay) ?? 'midday',
    },
    terrain: normalizeTerrain(config.terrain),
  }
}

export function normalizeTerrain(terrain: unknown): Record<string, string> {
  if (!terrain || typeof terrain !== 'object' || Array.isArray(terrain)) return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(terrain as Record<string, unknown>)) {
    if (isTerrainKey(key) && typeof value === 'string' && TERRAIN_IDS.has(value)) out[key] = value
  }
  return out
}

/** A stored position pulled back inside the bounds the save API accepts. */
export function normalizePosition(x: unknown, y: unknown): { x: number; y: number } {
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0)
  return {
    x: clamp(num(x), -POSITION_MARGIN, CANVAS_WIDTH),
    y: clamp(num(y), -POSITION_MARGIN, CANVAS_HEIGHT),
  }
}

/** The fields of a stored decoration row the save API checks, made acceptable to it. */
export function normalizeDecorationRow(row: {
  positionX: unknown
  positionY: unknown
  gridX?: unknown
  gridY?: unknown
  layerBias?: unknown
  layer?: unknown
  variant?: unknown
  size?: unknown
  data?: unknown
}) {
  const { x, y } = normalizePosition(row.positionX, row.positionY)
  const layer = typeof row.layer === 'number' && Number.isInteger(row.layer) ? clamp(row.layer, 0, MAX_LAYER) : 1
  const data =
    row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? (row.data as Record<string, unknown>) : null
  // On the grid only if the stored cell really is the stored position
  const onGrid =
    Number.isInteger(row.gridX) && Number.isInteger(row.gridY) &&
    (row.gridX as number) * TERRAIN_CELL === x && (row.gridY as number) * TERRAIN_CELL === y
  return {
    position: { x, y, layer: layer || 1 },
    gridX: onGrid ? (row.gridX as number) : null,
    gridY: onGrid ? (row.gridY as number) : null,
    layerBias: clampLayerBias(row.layerBias),
    variant: typeof row.variant === 'string' && IDENTIFIER.test(row.variant) ? row.variant : 'default',
    size: oneOf(DECORATION_SIZES, row.size) ?? 'medium',
    data,
  }
}

// ------------------------------------------------------------ write side --

const LABELS: Record<ColorField, string> = {
  wallColor: 'Wall color',
  roofColor: 'Roof color',
  trimColor: 'Trim color',
  windowColor: 'Window color',
  detailColor: 'Detail color',
  welcomeMatColor: 'Welcome mat color',
}

const hexColor = (label: string) =>
  z
    .union([z.literal('').transform(() => null), z.string().regex(HEX_COLOR, `${label} should look like #A1B2C3.`)])
    .nullish()

const choice = <T extends readonly [string, ...string[]]>(values: T, label: string) =>
  z.enum(values, { error: `Unknown ${label}.` }).nullish()

const text = (max: number, label: string) => z.string().max(max, `${label} can be at most ${max} characters.`).nullish()

const dataSize = (value: unknown) => {
  if (value === undefined || value === null) return true
  try {
    return JSON.stringify(value).length <= MAX_DECORATION_DATA_BYTES
  } catch {
    return false
  }
}

export const decorationSchema = z.object({
  // Format only: whether the item may be placed is checked against the
  // catalog by decorationId, and older rows carry types from older code.
  decorationType: z.string().regex(IDENTIFIER, 'Unknown decoration type.'),
  decorationId: z.string().regex(IDENTIFIER, 'Unknown decoration.'),
  zone: z.enum(DECORATION_ZONES, { error: 'Unknown yard zone.' }),
  positionX: z
    .number({ error: 'A decoration is outside the yard.' })
    .int('A decoration is outside the yard.')
    .min(-POSITION_MARGIN, 'A decoration is outside the yard.')
    .max(CANVAS_WIDTH, 'A decoration is outside the yard.'),
  positionY: z
    .number({ error: 'A decoration is outside the yard.' })
    .int('A decoration is outside the yard.')
    .min(-POSITION_MARGIN, 'A decoration is outside the yard.')
    .max(CANVAS_HEIGHT, 'A decoration is outside the yard.'),
  layer: z.number().int().min(0).max(MAX_LAYER).nullish(),
  // A cell on the 16 px grid; when given, the stored position is worked out from it
  gridX: z.number().int().min(GRID_MIN, 'A decoration is outside the yard.').max(GRID_MAX_X, 'A decoration is outside the yard.').nullish(),
  gridY: z.number().int().min(GRID_MIN, 'A decoration is outside the yard.').max(GRID_MAX_Y, 'A decoration is outside the yard.').nullish(),
  layerBias: z.number().int().min(MIN_LAYER_BIAS, 'Unknown layer.').max(MAX_LAYER_BIAS, 'Unknown layer.').nullish(),
  variant: z.string().regex(IDENTIFIER, 'Unknown decoration variant.').nullish(),
  size: z.enum(DECORATION_SIZES, { error: 'Unknown decoration size.' }).nullish(),
  data: z
    .record(z.string(), z.unknown(), { error: 'Decoration data should be an object.' })
    .nullish()
    .refine(dataSize, `Decoration data can be at most ${MAX_DECORATION_DATA_BYTES} bytes.`),
})

export const saveHomeSchema = z.object({
  decorations: z
    .array(decorationSchema, { error: 'Decorations must be a list.' })
    .max(MAX_DECORATIONS, `Too many decorations. The limit is ${MAX_DECORATIONS}.`),
  template: choice(HOUSE_TEMPLATES, 'house style'),
  palette: choice(COLOR_PALETTES, 'color palette'),
  atmosphere: z
    .object({
      sky: z.enum(SKIES, { error: 'Unknown sky.' }),
      weather: z.enum(WEATHERS, { error: 'Unknown weather.' }),
      timeOfDay: z.enum(TIMES_OF_DAY, { error: 'Unknown time of day.' }),
    })
    .nullish(),
  houseCustomizations: z
    .object({
      windowStyle: choice(WINDOW_STYLES, 'window style'),
      doorStyle: choice(DOOR_STYLES, 'door style'),
      roofTrim: choice(ROOF_TRIMS, 'roof trim'),
      windowTreatments: choice(WINDOW_TREATMENTS, 'window treatment'),
      chimneyStyle: choice(CHIMNEY_STYLES, 'chimney style'),
      welcomeMat: choice(WELCOME_MATS, 'welcome mat'),
      houseNumberStyle: choice(HOUSE_NUMBER_STYLES, 'house number style'),
      exteriorLights: choice(EXTERIOR_LIGHTS, 'exterior light'),
      wallColor: hexColor(LABELS.wallColor),
      roofColor: hexColor(LABELS.roofColor),
      trimColor: hexColor(LABELS.trimColor),
      windowColor: hexColor(LABELS.windowColor),
      detailColor: hexColor(LABELS.detailColor),
      welcomeMatColor: hexColor(LABELS.welcomeMatColor),
      houseTitle: text(TEXT_LIMITS.houseTitle, 'The house title'),
      houseDescription: text(TEXT_LIMITS.houseDescription, 'The description'),
      houseBoardText: text(TEXT_LIMITS.houseBoardText, 'The house sign'),
      houseNumber: text(TEXT_LIMITS.houseNumber, 'The house number'),
      welcomeMatText: text(TEXT_LIMITS.welcomeMatText, 'The welcome mat text'),
    })
    .nullish(),
  terrain: z
    .record(z.string(), z.string(), { error: 'Terrain should be a map of tiles.' })
    .nullish()
    .refine(
      (terrain) => !terrain || Object.entries(terrain).every(([key, id]) => isTerrainKey(key) && TERRAIN_IDS.has(id)),
      'Unknown terrain tile.'
    ),
})

export type SaveHomeInput = z.infer<typeof saveHomeSchema>
export type SaveDecorationInput = z.infer<typeof decorationSchema>

/** `custom_asset_0`…`custom_asset_4`, the ids placed copies of a resident's own art carry. */
export function isCustomAssetId(decorationId: string): boolean {
  return CUSTOM_ASSET_ID.test(decorationId)
}

/** Field errors as `{ "decorations.3.positionX": "A decoration is outside the yard." }`. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_'
    if (!(key in fields)) fields[key] = issue.message
  }
  return fields
}
