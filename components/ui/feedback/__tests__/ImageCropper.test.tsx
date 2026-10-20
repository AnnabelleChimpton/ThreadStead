/**
 * The cropper saves JPEG by default and PNG when asked (transparent
 * avatars), copies whole pixels unsmoothed at 1:1, and scales a crop bigger
 * than maxOutputSize down to it.
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
// Report a finished crop straight away (the real one waits for a drag)
let mockCrop = { unit: 'px', x: 0, y: 0, width: 100, height: 100 };
jest.mock('react-image-crop', () => {
  const ReactLib = jest.requireActual('react');
  return {
    __esModule: true,
    default: function FakeReactCrop({ children, onComplete }: { children: React.ReactNode; onComplete: (c: typeof mockCrop) => void }) {
      ReactLib.useEffect(() => onComplete(mockCrop), [onComplete]);
      return children;
    },
  };
});
jest.mock('react-image-crop/dist/ReactCrop.css', () => ({}));

import ImageCropper from '../ImageCropper';

type Drawn = { type: string; quality: unknown; width: number; height: number; smoothing: boolean; args: number[] };
let drawn: Drawn[];
const realToBlob = HTMLCanvasElement.prototype.toBlob;
let ctx: { drawImage: jest.Mock; clearRect: jest.Mock; imageSmoothingEnabled: boolean };

beforeEach(() => {
  drawn = [];
  ctx = { drawImage: jest.fn(), clearRect: jest.fn(), imageSmoothingEnabled: true };
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx as unknown as CanvasRenderingContext2D);
  HTMLCanvasElement.prototype.toBlob = function (this: HTMLCanvasElement, cb: BlobCallback, type?: string, quality?: unknown) {
    drawn.push({
      type: type ?? '',
      quality,
      width: this.width,
      height: this.height,
      smoothing: ctx.imageSmoothingEnabled,
      args: ctx.drawImage.mock.calls[0].slice(1),
    });
    cb(new Blob(['x'], { type }));
  };
});
afterEach(() => {
  jest.restoreAllMocks();
  HTMLCanvasElement.prototype.toBlob = realToBlob;
});

/** An image shown at 400px wide whose real size is `natural` px square. */
async function crop(props: Partial<React.ComponentProps<typeof ImageCropper>>, natural: number) {
  const onCropComplete = jest.fn();
  render(<ImageCropper imageUrl="blob:1" onCropComplete={onCropComplete} onCancel={jest.fn()} {...props} />);
  const img = screen.getByAltText('Crop preview');
  for (const [k, v] of Object.entries({ naturalWidth: natural, naturalHeight: natural, width: 400, height: 400 })) {
    Object.defineProperty(img, k, { value: v });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Apply Crop' }));
  await waitFor(() => expect(onCropComplete).toHaveBeenCalled());
  return onCropComplete.mock.calls[0][0] as Blob;
}

test('JPEG by default, as before', async () => {
  mockCrop = { unit: 'px', x: 10, y: 10, width: 200, height: 200 };
  const blob = await crop({}, 400);
  expect(blob.type).toBe('image/jpeg');
  expect(drawn[0]).toMatchObject({ type: 'image/jpeg', quality: 0.9, width: 200, height: 200 });
});

test('PNG when asked: whole pixels, copied 1:1 with no smoothing', async () => {
  // Shown at 400px, really 100px: a crop of 40.3px on screen is 10.075 real pixels
  mockCrop = { unit: 'px', x: 4.1, y: 8.2, width: 40.3, height: 40.3 };
  const blob = await crop({ outputType: 'image/png', maxOutputSize: 1600 }, 100);
  expect(blob.type).toBe('image/png');
  expect(drawn[0]).toMatchObject({ type: 'image/png', quality: undefined, width: 10, height: 10, smoothing: false });
  expect(drawn[0].args).toEqual([1, 2, 10, 10, 0, 0, 10, 10]);
});

test('a crop bigger than maxOutputSize is scaled down to it, smoothed', async () => {
  mockCrop = { unit: 'px', x: 0, y: 0, width: 400, height: 400 };
  await crop({ outputType: 'image/png', maxOutputSize: 1600 }, 4000);
  expect(drawn[0]).toMatchObject({ width: 1600, height: 1600, smoothing: true });
  expect(drawn[0].args).toEqual([0, 0, 4000, 4000, 0, 0, 1600, 1600]);
});
