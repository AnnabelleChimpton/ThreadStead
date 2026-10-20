/**
 * Profile photos: PNG and WebP are cropped as they are and sent as PNG, so
 * transparency and pixel art survive (the server stores them as PNG). Photos
 * (JPEG, HEIC) are still compressed to JPEG first and cropped to JPEG.
 */
import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';

const compressed = new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' });
jest.mock('browser-image-compression', () => jest.fn(async () => compressed));
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn() }));

// The cropper draws on a canvas jsdom doesn't have: stand in with one that
// hands back a blob of the type it was asked for
type CropperProps = { imageUrl: string; outputType?: string; maxOutputSize?: number; onCropComplete: (blob: Blob) => void };
const mockCropperProps: CropperProps[] = [];
jest.mock('@/components/ui/feedback/ImageCropper', () => {
  function FakeCropper(props: CropperProps) {
    mockCropperProps.push(props);
    return (
      <button type="button" onClick={() => props.onCropComplete(new Blob(['crop'], { type: props.outputType ?? 'image/jpeg' }))}>
        Apply Crop
      </button>
    );
  }
  return FakeCropper;
});

import imageCompression from 'browser-image-compression';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import ProfilePhotoUpload from '../ProfilePhotoUpload';

const objectUrlSources: Blob[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  mockCropperProps.length = 0;
  objectUrlSources.length = 0;
  URL.createObjectURL = jest.fn((blob: Blob) => {
    objectUrlSources.push(blob);
    return `blob:${objectUrlSources.length}`;
  });
  URL.revokeObjectURL = jest.fn();
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ token: 'cap' }) })) as unknown as typeof fetch;
  (csrfFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ urls: { mediumUrl: 'm' } }) });
});

async function pickAndCrop(file: File) {
  const { container } = render(<ProfilePhotoUpload onUploadSuccess={jest.fn()} />);
  fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [file] } });
  fireEvent.click(await screen.findByRole('button', { name: 'Apply Crop' }));
  await waitFor(() => expect(csrfFetch).toHaveBeenCalledWith('/api/profile/upload-photo', expect.anything()));
  const form = (csrfFetch as jest.Mock).mock.calls[0][1].body as FormData;
  return form.get('photo') as File;
}

test.each([
  ['a PNG', 'sprite.png', 'image/png'],
  ['a WebP', 'cutout.webp', 'image/webp'],
])('%s is cropped as it is and sent as a PNG', async (_label, name, type) => {
  const file = new File(['x'], name, { type });
  const photo = await pickAndCrop(file);

  expect(imageCompression).not.toHaveBeenCalled();
  expect(objectUrlSources[0]).toBe(file);
  expect(mockCropperProps[0]).toMatchObject({ outputType: 'image/png', maxOutputSize: 1600 });
  expect(photo.type).toBe('image/png');
  expect(photo.name).toBe('cropped-profile.png');
});

test.each([
  ['a JPEG photo', 'holiday.jpg', 'image/jpeg'],
  ['a HEIC photo', 'IMG_0001.heic', 'image/heic'],
])('%s is compressed to JPEG and cropped to JPEG', async (_label, name, type) => {
  const photo = await pickAndCrop(new File(['x'], name, { type }));

  expect(imageCompression).toHaveBeenCalledTimes(1);
  expect((imageCompression as unknown as jest.Mock).mock.calls[0][1]).toMatchObject({ fileType: 'image/jpeg' });
  expect(objectUrlSources[0]).toBe(compressed);
  expect(mockCropperProps[0]).toMatchObject({ outputType: 'image/jpeg' });
  expect(photo.type).toBe('image/jpeg');
  expect(photo.name).toBe('cropped-profile.jpg');
});

test('GIFs are still turned away', async () => {
  const { container } = render(<ProfilePhotoUpload onUploadSuccess={jest.fn()} />);
  fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
    target: { files: [new File(['x'], 'dance.gif', { type: 'image/gif' })] },
  });
  expect(await screen.findByText(/For animated GIFs, use media uploads/)).toBeInTheDocument();
  expect(imageCompression).not.toHaveBeenCalled();
  expect(mockCropperProps).toHaveLength(0);
});
