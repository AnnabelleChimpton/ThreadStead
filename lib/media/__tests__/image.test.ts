/**
 * @jest-environment node
 *
 * Shared sharp pipelines (TECH_DEBT_AUDIT §2.3). Sizes and formats must match
 * what the upload routes produced before they were consolidated.
 */
import sharp from 'sharp';
import {
  ImageValidationError,
  containPng,
  decodeImageDataUrl,
  preparePixelArtPng,
  renderAvatarSizes,
  renderEmoji,
  renderMediaSizes,
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
