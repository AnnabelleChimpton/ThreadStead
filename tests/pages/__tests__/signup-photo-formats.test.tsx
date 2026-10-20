/**
 * Signup's profile photo: PNG and WebP go up as they are (the server keeps
 * them as transparent PNG avatars); photos (JPEG, HEIC) and anything else
 * are compressed to JPEG first, as before.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const compressed = new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' });
jest.mock('browser-image-compression', () => jest.fn(async () => compressed));
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn() }));
jest.mock('next/router', () => ({
  useRouter: () => ({ query: {}, isReady: true, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('next/head', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ui/layout/Layout', () => ({ __esModule: true, default: function FakeLayout({ children }: { children: React.ReactNode }) { return <>{children}</>; } }));
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
jest.mock('@/components/features/onboarding/SignupFinaleAnimation', () => () => null);
jest.mock('@/components/home/HousePicker', () => () => null);
jest.mock('@/contexts/GlobalAudioContext', () => ({ useGlobalAudio: () => ({}) }));
jest.mock('@/lib/config/site/dynamic', () => ({ getSiteConfig: jest.fn() }));
jest.mock('@/lib/config/beta-keys', () => ({ isBetaKeysEnabled: () => false }));
jest.mock('@/lib/api/did/did-client', () => ({}));
jest.mock('@/hooks/useCurrentUser', () => ({
  fetchAuthMe: jest.fn(async () => ({ loggedIn: true, user: { primaryHandle: 'newbie@local' } })),
}));

import imageCompression from 'browser-image-compression';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import SignupPage from '@/pages/signup';

beforeEach(() => {
  jest.clearAllMocks();
  // Signed in, with signup saved at the profile step
  window.localStorage.setItem('ts-signup-progress', JSON.stringify({ username: 'newbie', step: 'profile' }));
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })) as unknown as typeof fetch;
  window.scrollTo = jest.fn();
  (csrfFetch as jest.Mock).mockImplementation(async (url: string) => ({
    ok: true,
    json: async () => (url === '/api/cap/profile' ? { token: 'cap' } : {}),
  }));
});

async function chooseAndSave(file: File) {
  const { container } = render(<SignupPage betaRequired={false} siteConfig={{} as React.ComponentProps<typeof SignupPage>['siteConfig']} />);
  await screen.findByText('Set up your profile');
  fireEvent.change(container.querySelector('#profile-photo') as HTMLInputElement, { target: { files: [file] } });
  await screen.findByAltText('Profile preview');
  fireEvent.click(screen.getByRole('button', { name: 'Save Profile & Continue' }));
  await waitFor(() => expect(csrfFetch).toHaveBeenCalledWith('/api/profile/upload-photo', expect.anything()));
  const call = (csrfFetch as jest.Mock).mock.calls.find((c) => c[0] === '/api/profile/upload-photo');
  return (call[1].body as FormData).get('photo') as File;
}

test.each([
  ['a PNG', 'sprite.png', 'image/png'],
  ['a WebP', 'cutout.webp', 'image/webp'],
])('%s goes up as it is', async (_label, name, type) => {
  const photo = await chooseAndSave(new File(['x'], name, { type }));
  expect(imageCompression).not.toHaveBeenCalled();
  expect(photo.name).toBe(name);
  expect(photo.type).toBe(type);
});

test.each([
  ['a JPEG photo', 'holiday.jpg', 'image/jpeg'],
  ['a HEIC photo', 'IMG_0001.heic', 'image/heic'],
  ['a GIF (avatars are never animated)', 'dance.gif', 'image/gif'],
])('%s is compressed to JPEG first', async (_label, name, type) => {
  const photo = await chooseAndSave(new File(['x'], name, { type }));
  expect(imageCompression).toHaveBeenCalledTimes(1);
  expect((imageCompression as unknown as jest.Mock).mock.calls[0][1]).toMatchObject({ fileType: 'image/jpeg' });
  expect(photo.type).toBe('image/jpeg');
});
