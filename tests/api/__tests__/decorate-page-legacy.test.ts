/**
 * The decorate page opens homes saved by older code: odd stored values are
 * cleaned on read (pages/home/[handle]/decorate.tsx → normalizeHomeConfig /
 * normalizeDecorationRow), so the editor shows the home and the save API's
 * stricter schema accepts it when it's saved again unchanged.
 */
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    handle: {
      findFirst: jest.fn(async () => ({ handle: 'oldtimer', user: { id: 'u_old' } })),
    },
    userHomeConfig: {
      findUnique: jest.fn(async () => ({
        userId: 'u_old',
        houseTemplate: 'castle_v9',
        palette: 'thread_sage',
        atmosphereSky: 'night',
        atmosphereWeather: 'clear',
        atmosphereTimeOfDay: 'midday',
        wallColor: '000000',
        roofColor: '#71f98c',
        trimColor: 'banana',
        windowColor: null,
        detailColor: null,
        windowStyle: 'default',
        doorStyle: 'curtains',
        roofTrim: 'default',
        houseBoardText: 'hi neighbor',
        terrain: { '3,8': 'water', '4,8': 'lava' },
        decorations: [
          { id: 'd1', decorationType: 'plant', decorationId: 'roses_red', variant: 'default', size: 'medium', positionX: 64, positionY: 240, layer: 452064, data: null },
          { id: 'd2', decorationType: 'structure', decorationId: 'gazebo', variant: null, size: 'giant', positionX: 99999, positionY: -5000, layer: 1, data: 'odd' },
        ],
      })),
    },
    decorationItem: { findMany: jest.fn(async () => []) },
  },
}))
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn(async () => ({ id: 'u_old' })) }))

import { getServerSideProps } from '@/pages/home/[handle]/decorate'
import { saveHomeSchema } from '@/lib/pixel-homes/decoration-save-rules'

async function props() {
  const result: any = await getServerSideProps({ params: { handle: 'oldtimer' }, req: { headers: {} } } as any)
  return result.props
}

test('odd stored values open as something the editor can show', async () => {
  const p = await props()
  expect(p.isOwnHome).toBe(true)
  expect(p.template).toBe('cottage_v1')
  expect(p.palette).toBe('thread_sage')
  expect(p.initialAtmosphere.sky).toBe('night')
  expect(p.initialHouseCustomizations).toMatchObject({
    wallColor: '#000000',
    roofColor: '#71f98c',
    trimColor: null,
    doorStyle: null,
    houseBoardText: 'hi neighbor',
  })
  expect(p.initialTerrain).toEqual({ '3,8': 'water' })
  expect(p.initialDecorations[1]).toMatchObject({
    decorationId: 'gazebo',
    position: { x: 512, y: -128 },
    size: 'medium',
    variant: 'default',
    data: null,
  })
})

test('the same home saved again unchanged passes the save schema', async () => {
  const p = await props()
  // what decorate.tsx's handleSave sends for each decoration
  const decorations = p.initialDecorations.map((d: any) => ({
    decorationType: d.type,
    decorationId: d.decorationId,
    zone: d.zone,
    positionX: Math.round(d.position.x),
    positionY: Math.round(d.position.y),
    layer: d.position.layer || 1,
    variant: d.variant,
    size: d.size,
    data: d.data,
  }))
  const parsed = saveHomeSchema.safeParse({
    decorations,
    template: p.template,
    palette: p.palette,
    atmosphere: p.initialAtmosphere,
    houseCustomizations: p.initialHouseCustomizations,
    terrain: p.initialTerrain,
  })
  expect(parsed.error?.issues).toBeUndefined()
})
