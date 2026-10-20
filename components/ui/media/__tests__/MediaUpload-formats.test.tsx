/**
 * The Media page's uploader only compresses photos. GIF, PNG and WebP go up
 * as they are, so the server can keep animation, transparency and exact
 * pixels (renderMediaSizesKeepingFormat / renderGifSizes).
 */
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'

jest.mock('browser-image-compression', () => jest.fn(async (file: File) => new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' })))
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn() }))

import imageCompression from 'browser-image-compression'
import MediaUpload from '../MediaUpload'

function pick(container: HTMLElement, file: File) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

beforeEach(() => jest.clearAllMocks())

test.each([
  ['a PNG', 'sprite.png', 'image/png'],
  ['a WebP', 'cutout.webp', 'image/webp'],
  ['a GIF', 'dance.gif', 'image/gif'],
])('%s is not compressed or converted', async (_label, name, type) => {
  const { container } = render(<MediaUpload onUploadSuccess={jest.fn()} />)
  pick(container, new File(['x'], name, { type }))
  await waitFor(() => expect(container.querySelector('img')).not.toBeNull())
  expect(imageCompression).not.toHaveBeenCalled()
})

test('a photo is still compressed', async () => {
  const { container } = render(<MediaUpload onUploadSuccess={jest.fn()} />)
  pick(container, new File(['x'], 'holiday.jpg', { type: 'image/jpeg' }))
  await waitFor(() => expect(imageCompression).toHaveBeenCalledTimes(1))
})
