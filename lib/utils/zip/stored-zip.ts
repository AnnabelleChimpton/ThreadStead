/**
 * A small zip writer: files stored as they are (method 0, no compression),
 * so it needs nothing but a CRC-32. Enough for downloads of a few files and
 * pictures (pictures barely compress anyway). No zip64: under 65,535 files
 * and 4 GB in all, which callers cap far below.
 *
 * Format: PKWARE APPNOTE.TXT, sections 4.3.7 (local file header), 4.3.12
 * (central directory header) and 4.3.16 (end of central directory record).
 * Names are UTF-8 (general purpose flag bit 11).
 */

export interface ZipEntry {
  /** Path inside the zip, with forward slashes, like images/cat.png */
  name: string;
  data: Buffer | string;
}

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const VERSION = 20; // 2.0: the version that reads stored files and folders
const UTF8_NAMES = 0x0800;
const STORED = 0;
const MAX_ENTRIES = 0xffff;
const MAX_BYTES = 0xffffffff;

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (the zip / PNG / gzip one: polynomial 0xEDB88320, reflected). */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** MS-DOS date and time, as zip stores them (two-second steps, from 1980). */
export function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function checkName(name: string): void {
  if (
    !name ||
    name.startsWith('/') ||
    name.includes('\\') ||
    name.split('/').some((part) => part === '..' || part === '.' || part === '')
  ) {
    throw new Error(`Bad zip entry name: ${name}`);
  }
}

/** The zip file, in one buffer. Throws on a bad or repeated name, or past the format's limits. */
export function createStoredZip(entries: ZipEntry[], modified: Date = new Date()): Buffer {
  if (entries.length > MAX_ENTRIES) throw new Error('Too many files for a zip without zip64');
  const { time, date } = dosDateTime(modified);
  const seen = new Set<string>();
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    checkName(entry.name);
    if (seen.has(entry.name)) throw new Error(`Repeated zip entry name: ${entry.name}`);
    seen.add(entry.name);

    const name = Buffer.from(entry.name, 'utf8');
    const data = typeof entry.data === 'string' ? Buffer.from(entry.data, 'utf8') : entry.data;
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_FILE_HEADER, 0);
    local.writeUInt16LE(VERSION, 4);
    local.writeUInt16LE(UTF8_NAMES, 6);
    local.writeUInt16LE(STORED, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); // compressed size: stored, so the same
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // no extra field

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_DIRECTORY_HEADER, 0);
    central.writeUInt16LE(VERSION, 4); // made by (MS-DOS, 2.0)
    central.writeUInt16LE(VERSION, 6); // needed to extract
    central.writeUInt16LE(UTF8_NAMES, 8);
    central.writeUInt16LE(STORED, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30); // extra field length
    central.writeUInt16LE(0, 32); // comment length
    central.writeUInt16LE(0, 34); // disk number
    central.writeUInt16LE(0, 36); // internal attributes
    central.writeUInt32LE(0, 38); // external attributes
    central.writeUInt32LE(offset, 42);

    locals.push(local, name, data);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
    if (offset > MAX_BYTES) throw new Error('Too big for a zip without zip64');
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_OF_CENTRAL_DIRECTORY, 0);
  end.writeUInt16LE(0, 4); // this disk
  end.writeUInt16LE(0, 6); // disk with the directory
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20); // no comment

  return Buffer.concat([...locals, directory, end]);
}
