/**
 * @jest-environment node
 *
 * Shared sharp pipelines (TECH_DEBT_AUDIT §2.3). Sizes and formats must match
 * what the upload routes produced before they were consolidated.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {
  ImageValidationError,
  containPng,
  decodeImageDataUrl,
  inspectPixelArt,
  mediumSize,
  preparePixelArtPng,
  renderAvatarSizes,
  renderEmoji,
  renderMediaSizes,
  renderMediaSizesKeepingFormat,
} from '@/lib/media/image';

const image = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 4, background: '#3a6' } }).png().toBuffer();

const dims = async (buf: Buffer) => {
  const m = await sharp(buf).metadata();
  return [m.format, m.width, m.height];
};

test('avatar: square 64/200/800 JPEGs, never enlarged past the source', async () => {
  const big = await renderAvatarSizes(await image(1600, 1200));
  expect(await dims(big.thumbnail)).toEqual(['jpeg', 64, 64]);
  expect(await dims(big.medium)).toEqual(['jpeg', 200, 200]);
  expect(await dims(big.full)).toEqual(['jpeg', 800, 800]);

  const small = await renderAvatarSizes(await image(300, 300));
  expect(await dims(small.full)).toEqual(['jpeg', 300, 300]);
});

test('media: 150 square thumb, aspect-kept 600/1200', async () => {
  const out = await renderMediaSizes(await image(2400, 1200));
  expect(await dims(out.thumbnail)).toEqual(['jpeg', 150, 150]);
  expect(await dims(out.medium)).toEqual(['jpeg', 600, 300]);
  expect(await dims(out.full)).toEqual(['jpeg', 1200, 600]);
});

test("mediumSize is the medium's real size (a post photo's link preview declares it)", async () => {
  for (const [w, h] of [[1000, 667], [333, 1001], [601, 599], [500, 300]]) {
    const upload = await image(w, h);
    const [jpeg, kept] = await Promise.all([renderMediaSizes(upload), renderMediaSizesKeepingFormat(upload, 'png')]);
    const { width, height } = mediumSize(w, h);
    expect((await dims(jpeg.medium)).slice(1)).toEqual([width, height]);
    expect((await dims(kept.medium)).slice(1)).toEqual([width, height]);
  }
});

test('badge and emoji are letterboxed PNGs at exact size', async () => {
  expect(await dims(await containPng(await image(400, 400), 88, 31, { quality: 90 }))).toEqual(['png', 88, 31]);
  expect(await dims(await renderEmoji(await image(100, 50)))).toEqual(['png', 64, 64]);
});

test('decodeImageDataUrl', async () => {
  const png = await image(2, 2);
  const decoded = decodeImageDataUrl(`data:image/png;base64,${png.toString('base64')}`);
  expect(decoded?.format).toBe('png');
  expect(decoded?.buffer.equals(png)).toBe(true);
  expect(decodeImageDataUrl('data:text/html;base64,AAAA')).toBeNull();
});

describe('preparePixelArtPng', () => {
  test('keeps the original size as a PNG', async () => {
    const out = await preparePixelArtPng(await image(32, 48), { maxBytes: 100 * 1024, maxDimension: 64 });
    expect([out.width, out.height]).toEqual([32, 48]);
    expect(await dims(out.buffer)).toEqual(['png', 32, 48]);
  });

  test('rejects oversize dimensions and bytes with user-facing messages', async () => {
    await expect(preparePixelArtPng(await image(65, 10), { maxBytes: 100 * 1024, maxDimension: 64 })).rejects.toEqual(
      new ImageValidationError('Image too large. Maximum dimensions are 64x64 pixels')
    );
    await expect(preparePixelArtPng(Buffer.alloc(2048), { maxBytes: 1024, maxDimension: 64 })).rejects.toEqual(
      new ImageValidationError('Image too large. Maximum size is 1KB')
    );
  });
});

/** A width×height RGBA picture from a function of (x, y) → [r, g, b, a]. */
const pixels = (width: number, height: number, at: (x: number, y: number) => [number, number, number, number]) => {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(at(x, y), (y * width + x) * 4);
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
};

/** RGBA bytes, with fully clear pixels zeroed (their hidden colour doesn't matter). */
const rawPixels = async (buf: Buffer) => {
  const data = await sharp(buf).ensureAlpha().raw().toBuffer();
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] === 0) data.fill(0, i, i + 4);
  return data;
};

describe('pixel art', () => {
  test('inspectPixelArt counts colours, partial alpha and the empty rows under the art', async () => {
    // 4×6: two colours on rows 0–2, one half-clear pixel, rows 3–5 clear
    const art = await pixels(4, 6, (x, y) => {
      if (y > 2) return [0, 0, 0, 0];
      if (x === 3 && y === 0) return [10, 20, 30, 128];
      return x < 2 ? [0x2d, 0x50, 0x16, 255] : [0xc4, 0x47, 0x3a, 255];
    });
    const out = await inspectPixelArt(art);
    expect([out.width, out.height]).toEqual([4, 6]);
    expect(Object.fromEntries(out.colours)).toEqual({ '#2d5016': 6, '#c4473a': 5 });
    expect(out.partialAlpha).toBe(1);
    expect(out.firstPartialAlpha).toEqual({ x: 3, y: 0 });
    expect(out.bottomPadding).toBe(3);
    expect(out.empty).toBe(false);
  });

  test('an empty picture is all padding', async () => {
    const out = await inspectPixelArt(await pixels(3, 3, () => [0, 0, 0, 0]));
    expect(out.empty).toBe(true);
    expect(out.bottomPadding).toBe(3);
  });

  test('a few colours become a palette PNG with every pixel unchanged', async () => {
    const art = await pixels(16, 16, (x, y) => ((x + y) % 2 ? [0x2b, 0x25, 0x23, 255] : [0xf6, 0xe2, 0x7f, 255]));
    const out = await preparePixelArtPng(art, { maxBytes: 100 * 1024, maxDimension: 64 });
    expect((await sharp(out.buffer).metadata()).isPalette).toBe(true);
    expect((await rawPixels(out.buffer)).equals(await rawPixels(art))).toBe(true);
  });

  test('more than 256 colours are saved lossless, never dithered', async () => {
    const art = await pixels(32, 32, (x, y) => [x * 8, y * 8, (x * y) % 256, 255]);
    const out = await preparePixelArtPng(art, { maxBytes: 100 * 1024, maxDimension: 64 });
    expect(out.inspection.colours.size).toBeGreaterThan(256);
    expect((await rawPixels(out.buffer)).equals(await rawPixels(art))).toBe(true);
  });

  test('rejectPartialAlpha turns away half-clear pixels; residents’ uploads keep them', async () => {
    const art = await pixels(4, 4, (x) => (x === 0 ? [255, 0, 0, 100] : [255, 0, 0, 255]));
    await expect(preparePixelArtPng(art, { maxBytes: 1e5, maxDimension: 64, rejectPartialAlpha: true })).rejects.toEqual(
      new ImageValidationError('4 pixels are partly see-through (the first is at 0, 0). Every pixel needs to be fully solid or fully clear.')
    );
    await expect(preparePixelArtPng(art, { maxBytes: 1e5, maxDimension: 64 })).resolves.toBeTruthy();
  });

  test('her real sprites come back pixel for pixel', async () => {
    const dir = path.join(process.cwd(), 'design/pixel-art/remap-preview');
    for (const name of ['before/tree_pine.png', 'trimmed/roses_red.png', 'garden_cart.png']) {
      const art = fs.readFileSync(path.join(dir, name));
      const out = await preparePixelArtPng(art, { maxBytes: 1e5, maxDimension: 256, rejectPartialAlpha: true });
      expect((await rawPixels(out.buffer)).equals(await rawPixels(art))).toBe(true);
    }
  });
});
