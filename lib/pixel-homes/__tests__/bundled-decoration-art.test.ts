import { readFileSync, readdirSync } from 'fs'
import path from 'path'
import { BUNDLED_DECORATION_ART, bundledDecorationPngUrl } from '../bundled-decoration-art'
import { DECORATION_DIMENSIONS } from '../decoration-dimensions'

const DIR = path.join(process.cwd(), 'public', 'pixel-homes', 'decorations')

describe('bundled decoration art', () => {
  test('every listed decoration has its PNG, at the size the yard already gives it', () => {
    for (const id of BUNDLED_DECORATION_ART) {
      const file = readFileSync(path.join(DIR, `${id}.png`))
      expect(file.toString('ascii', 1, 4)).toBe('PNG')
      const size = { width: file.readUInt32BE(16), height: file.readUInt32BE(20) }
      expect([id, size]).toEqual([id, DECORATION_DIMENSIONS[id]])
    }
  })

  test('every PNG in the folder is listed', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, ''))
    expect(files.sort()).toEqual([...BUNDLED_DECORATION_ART].sort())
  })

  test('placed copies find the art too; others have none', () => {
    expect(bundledDecorationPngUrl('gazebo')).toBe('/pixel-homes/decorations/gazebo.png')
    expect(bundledDecorationPngUrl('gazebo_1729000000000_abcdef')).toBe('/pixel-homes/decorations/gazebo.png')
    expect(bundledDecorationPngUrl('roses_red')).toBeNull()
  })
})
