/**
 * The crop area starts as a centred square, and that counts as a finished
 * crop: "Apply Crop" used to stay greyed out until the area was dragged, and
 * every new resident setting an avatar hit it (template audit 09).
 * The real crop library reports a finished crop only after a drag, so this
 * one never does.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';

jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
jest.mock('react-image-crop', () => ({
  __esModule: true,
  default: function NeverDraggedReactCrop({ children }: { children: React.ReactNode }) {
    return children;
  },
}));
jest.mock('react-image-crop/dist/ReactCrop.css', () => ({}));

import ImageCropper from '../ImageCropper';

test('Apply Crop works without dragging the crop area', () => {
  render(<ImageCropper imageUrl="blob:1" onCropComplete={jest.fn()} onCancel={jest.fn()} />);
  const apply = screen.getByRole('button', { name: 'Apply Crop' });
  expect(apply).toBeDisabled(); // until the picture has loaded
  const img = screen.getByAltText('Crop preview');
  Object.defineProperty(img, 'width', { value: 400 });
  Object.defineProperty(img, 'height', { value: 300 });
  fireEvent.load(img);
  expect(apply).toBeEnabled();
});
