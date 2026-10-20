/**
 * @jest-environment node
 *
 * The zip writer, read back by a minimal reader written from the format
 * (read-stored-zip.ts).
 */
import { createStoredZip, crc32, dosDateTime } from '../stored-zip'
import { readStoredZip } from './read-stored-zip'

describe('crc32', () => {
  test('matches the standard check values', () => {
    expect(crc32(Buffer.from(''))).toBe(0)
    expect(crc32(Buffer.from('123456789'))).toBe(0xcbf43926)
    expect(crc32(Buffer.from('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339)
  })
})

describe('createStoredZip', () => {
  const when = new Date(2026, 9, 19, 14, 30, 42)
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 255])

  test('every file comes back out, stored, with its CRC, UTF-8 name and date', () => {
    const zip = createStoredZip(
      [
        { name: 'index.html', data: '<h1>Hi</h1>\n' },
        { name: 'style.css', data: 'body { color: #2e4b3f; }' },
        { name: 'images/media-1.png', data: png },
        { name: 'images/café.png', data: Buffer.alloc(0) },
      ],
      when
    )
    const entries = readStoredZip(zip)
    expect(entries.map((e) => e.name)).toEqual(['index.html', 'style.css', 'images/media-1.png', 'images/café.png'])
    expect(entries[0].data.toString('utf8')).toBe('<h1>Hi</h1>\n')
    expect(entries[1].data.toString('utf8')).toBe('body { color: #2e4b3f; }')
    expect(Buffer.compare(entries[2].data, png)).toBe(0)
    expect(entries[3].data.length).toBe(0)
    for (const e of entries) {
      expect(e.method).toBe(0)
      expect(e.flags & 0x0800).toBe(0x0800)
      expect(e.crc).toBe(crc32(e.data))
      expect(e.time).toBe(dosDateTime(when).time)
      expect(e.date).toBe(dosDateTime(when).date)
    }
  })

  test('DOS date and time', () => {
    const { time, date } = dosDateTime(when)
    expect(date >> 9).toBe(2026 - 1980)
    expect((date >> 5) & 0xf).toBe(10)
    expect(date & 0x1f).toBe(19)
    expect(time >> 11).toBe(14)
    expect((time >> 5) & 0x3f).toBe(30)
    expect((time & 0x1f) * 2).toBe(42)
  })

  test('an empty zip is just the end record', () => {
    const zip = createStoredZip([], when)
    expect(zip.length).toBe(22)
    expect(readStoredZip(zip)).toEqual([])
  })

  test.each(['/etc/passwd', '../up.txt', 'images/../x', 'a\\b', 'images//x', ''])('refuses the name %p', (name) => {
    expect(() => createStoredZip([{ name, data: 'x' }])).toThrow(/Bad zip entry name/)
  })

  test('refuses a name twice', () => {
    expect(() => createStoredZip([{ name: 'a.txt', data: '1' }, { name: 'a.txt', data: '2' }])).toThrow(/Repeated/)
  })
})
