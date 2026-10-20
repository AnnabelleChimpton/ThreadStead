/**
 * A minimal stored-only zip reader for tests, written from the format
 * (APPNOTE.TXT 4.3.7, 4.3.12, 4.3.16), the way an unzip tool walks it: end
 * record, then the central directory, then each local header and its bytes.
 * It checks every field it can against the other copy.
 */
export interface ReadEntry {
  name: string
  data: Buffer
  crc: number
  method: number
  flags: number
  time: number
  date: number
}

export function readStoredZip(zip: Buffer): ReadEntry[] {
  const endAt = zip.length - 22
  expect(zip.readUInt32LE(endAt)).toBe(0x06054b50)
  const count = zip.readUInt16LE(endAt + 10)
  expect(zip.readUInt16LE(endAt + 8)).toBe(count)
  const dirSize = zip.readUInt32LE(endAt + 12)
  const dirOffset = zip.readUInt32LE(endAt + 16)
  expect(dirOffset + dirSize).toBe(endAt)
  expect(zip.readUInt16LE(endAt + 20)).toBe(0) // no comment

  const entries: ReadEntry[] = []
  let at = dirOffset
  for (let i = 0; i < count; i++) {
    expect(zip.readUInt32LE(at)).toBe(0x02014b50)
    const flags = zip.readUInt16LE(at + 8)
    const method = zip.readUInt16LE(at + 10)
    const time = zip.readUInt16LE(at + 12)
    const date = zip.readUInt16LE(at + 14)
    const crc = zip.readUInt32LE(at + 16)
    const compressed = zip.readUInt32LE(at + 20)
    const size = zip.readUInt32LE(at + 24)
    const nameLength = zip.readUInt16LE(at + 28)
    const extra = zip.readUInt16LE(at + 30)
    const comment = zip.readUInt16LE(at + 32)
    const localAt = zip.readUInt32LE(at + 42)
    const name = zip.subarray(at + 46, at + 46 + nameLength).toString('utf8')
    expect(compressed).toBe(size)

    // The local header says the same
    expect(zip.readUInt32LE(localAt)).toBe(0x04034b50)
    expect(zip.readUInt16LE(localAt + 6)).toBe(flags)
    expect(zip.readUInt16LE(localAt + 8)).toBe(method)
    expect(zip.readUInt32LE(localAt + 14)).toBe(crc)
    expect(zip.readUInt32LE(localAt + 18)).toBe(compressed)
    expect(zip.readUInt32LE(localAt + 22)).toBe(size)
    const localNameLength = zip.readUInt16LE(localAt + 26)
    const localExtra = zip.readUInt16LE(localAt + 28)
    expect(zip.subarray(localAt + 30, localAt + 30 + localNameLength).toString('utf8')).toBe(name)
    const dataAt = localAt + 30 + localNameLength + localExtra
    const data = zip.subarray(dataAt, dataAt + size)

    entries.push({ name, data, crc, method, flags, time, date })
    at += 46 + nameLength + extra + comment
  }
  expect(at).toBe(endAt)
  return entries
}
