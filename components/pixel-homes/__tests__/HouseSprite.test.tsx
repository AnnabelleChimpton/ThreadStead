import React from 'react'
import { render, waitFor } from '@testing-library/react'

jest.mock('../HouseSVG', () => ({
  __esModule: true,
  default: ({ template }: { template: string }) => <svg data-house-svg={template} />,
  HouseExtras: ({ customizations, at }: { customizations?: { houseBoardText?: string }; at: { sign: { x: number; y: number } } }) =>
    customizations?.houseBoardText ? <svg data-house-extras={`${at.sign.x},${at.sign.y}`} /> : null,
}))

import HouseSprite from '../HouseSprite'
import { HOUSE_LAYER_SETS, PLACEHOLDER_LAYER_SETS } from '@/lib/pixel-homes/house-layers'

const set = PLACEHOLDER_LAYER_SETS.cabin_v1

describe('HouseSprite', () => {
  test('draws HouseSVG when the template isn\'t switched on', () => {
    const { container } = render(<HouseSprite template="cabin_v1" palette="thread_sage" />)
    expect(container.querySelector('[data-house-svg="cabin_v1"]')).not.toBeNull()
    expect(container.querySelector('[data-house-sprite]')).toBeNull()
  })

  test('keeps HouseSVG for custom colours until there is a decision on snapping them', () => {
    const { container } = render(<HouseSprite template="cabin_v1" palette="thread_sage" layerSet={set} customizations={{ roofColor: '#7e0101' }} />)
    expect(container.querySelector('[data-house-svg]')).not.toBeNull()
  })

  test('keeps HouseSVG for a roof trim the art doesn\'t draw yet', () => {
    const { container } = render(<HouseSprite template="cabin_v1" palette="thread_sage" layerSet={HOUSE_LAYER_SETS.cabin_v1} customizations={{ roofTrim: 'ornate' }} />)
    expect(container.querySelector('[data-house-svg]')).not.toBeNull()
  })

  describe('with layers', () => {
    const swapped: string[] = []
    beforeAll(() => {
      ;(global as any).Image = class {
        onload: (() => void) | null = null
        naturalWidth = 2
        naturalHeight = 1
        set src(_v: string) { setTimeout(() => this.onload?.(), 0) }
      }
      HTMLCanvasElement.prototype.getContext = function () {
        return {
          drawImage() {},
          // one roof-key pixel, one plain pixel
          getImageData: () => ({ data: new Uint8ClampedArray([0x00, 0xd0, 0xd0, 255, 1, 2, 3, 255]) }),
          putImageData: (img: { data: Uint8ClampedArray }) => swapped.push([...img.data.slice(0, 3)].join(',')),
        }
      } as any
      HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) { cb(new Blob(['png'])) }
      let n = 0
      ;(URL as any).createObjectURL = jest.fn(() => `blob:layer-${++n}`)
    })

    test('stacks the recoloured base and roof once they are ready, in the palette', async () => {
      const { container } = render(<HouseSprite template="cabin_v1" palette="pixel_petals" layerSet={set} className="w-full" />)
      // HouseSVG while the layers load, so nothing flashes key colours
      expect(container.querySelector('[data-house-svg]')).not.toBeNull()
      await waitFor(() => expect(container.querySelector('[data-house-sprite="cabin_v1"]')).not.toBeNull())
      const imgs = [...container.querySelectorAll('img')].map((i) => i.getAttribute('src'))
      expect(imgs).toHaveLength(2)
      expect(imgs.every((src) => src?.startsWith('blob:layer-'))).toBe(true)
      // pixel_petals roof step 3 is #c4473a
      expect(swapped).toContain('196,71,58')
    })

    test('the real art adds its chimney and window sprites, with the sign laid over', async () => {
      const { container } = render(
        <HouseSprite template="townhouse_v1" palette="thread_sage" layerSet={HOUSE_LAYER_SETS.townhouse_v1}
          customizations={{ windowStyle: 'round', doorStyle: 'double', houseBoardText: 'Hi' }} />
      )
      await waitFor(() => expect(container.querySelector('[data-house-sprite="townhouse_v1"]')).not.toBeNull())
      // base, roof, two windows, the default chimney; "double" is the townhouse's own door
      expect(container.querySelectorAll('img')).toHaveLength(5)
      expect(container.querySelector('[data-house-extras="100,64"]')).not.toBeNull()
    })
  })
})
