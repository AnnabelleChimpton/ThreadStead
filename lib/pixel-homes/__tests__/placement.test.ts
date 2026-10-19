import { CELL, centredOn, place } from '../placement'
import { getDecorationDimensions } from '../decoration-dimensions'

const rose = { id: 'roses_red', type: 'plant' }

test('snaps to the nearest grid cell, wherever the pointer is', () => {
  expect(place(rose, 70, 250)).toEqual({ position: { x: 64, y: 256 }, gridX: 4, gridY: 16 })
  expect(place(rose, 73, 247)).toEqual({ position: { x: 80, y: 240 }, gridX: 5, gridY: 15 })
})

test('stays inside the scene by the item’s own size', () => {
  const { width, height } = getDecorationDimensions('roses_red', 'plant')
  const corner = place(rose, 9999, 9999)
  expect(corner.position.x + width).toBeLessThanOrEqual(512)
  expect(corner.position.y + height).toBeLessThanOrEqual(352)
  expect(corner.position.x % CELL).toBe(0)
  expect(place(rose, -50, -50)).toEqual({ position: { x: 0, y: 0 }, gridX: 0, gridY: 0 })
})

test('free placement keeps the exact pixel, still inside, and no cell', () => {
  expect(place(rose, 70.4, 250.6, { free: true })).toEqual({ position: { x: 70, y: 251 }, gridX: null, gridY: null })
  expect(place(rose, -9, 9999, { free: true }).position.x).toBe(0)
})

test('centredOn puts the art, not a grid square, under the pointer', () => {
  const { width, height } = getDecorationDimensions('roses_red', 'plant')
  expect(centredOn(rose, { x: 100, y: 200 })).toEqual({ x: 100 - width / 2, y: 200 - height / 2 })
})
