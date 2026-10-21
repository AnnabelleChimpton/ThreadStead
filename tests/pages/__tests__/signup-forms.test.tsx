/**
 * Signup's steps are real forms: Return submits them, the fields carry
 * password-manager hints, and each new step moves focus to its heading so a
 * screen reader says where you are.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('browser-image-compression', () => jest.fn());
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
jest.mock('@/lib/api/did/did-client', () => ({
  createNewIdentityWithPassword: jest.fn(async () => ({ mnemonic: 'never shown to password users' })),
  createNewIdentityWithSeedPhrase: jest.fn(async () => ({
    mnemonic: 'one two three four five six seven eight nine ten eleven twelve',
  })),
}));
jest.mock('@/hooks/useCurrentUser', () => ({ fetchAuthMe: jest.fn(async () => ({ loggedIn: false })) }));

import { createNewIdentityWithPassword, createNewIdentityWithSeedPhrase } from '@/lib/api/did/did-client';
import { fetchAuthMe } from '@/hooks/useCurrentUser';
import SignupPage from '@/pages/signup';

const siteConfig = { site_name: 'ThreadStead' } as React.ComponentProps<typeof SignupPage>['siteConfig'];

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.scrollTo = jest.fn();
  global.fetch = jest.fn(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => (String(url).startsWith('/api/account/check-handle') ? { available: true } : {}),
  })) as unknown as typeof fetch;
});

async function openSignup() {
  const user = userEvent.setup();
  render(<SignupPage betaRequired={false} siteConfig={siteConfig} />);
  await screen.findByRole('heading', { name: 'Make an account' });
  return user;
}

test('the account form has labelled fields with password-manager hints', async () => {
  await openSignup();
  const username = screen.getByLabelText('Username');
  expect(username).toHaveAttribute('autocomplete', 'username');
  expect(username).toHaveAttribute('autocapitalize', 'none');
  expect(username).toHaveAttribute('autocorrect', 'off');
  expect(username).toHaveAttribute('spellcheck', 'false');
  expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
  expect(screen.getByLabelText('Password again')).toHaveAttribute('autocomplete', 'new-password');
  // Username and password share one form, so a password manager sees both
  expect(username.closest('form')).toBe(screen.getByLabelText('Password').closest('form'));
});

test('Return on the account form makes the account and focuses the email step heading', async () => {
  const user = await openSignup();
  await user.type(screen.getByLabelText('Username'), 'newbie');
  await screen.findByText('@newbie is available');
  await user.type(screen.getByLabelText('Password'), 'Lawnchair42');
  await user.type(screen.getByLabelText('Password again'), 'Lawnchair42{Enter}');

  await waitFor(() => expect(createNewIdentityWithPassword).toHaveBeenCalledWith('newbie', 'Lawnchair42', undefined));
  const heading = await screen.findByRole('heading', { name: 'Add an email?' });
  await waitFor(() => expect(heading).toHaveFocus());
  // Password users never hear about a recovery phrase
  expect(screen.queryByText(/recovery phrase/i)).toBeNull();
  expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
});

test('an empty submit says what is missing and focuses the field, without making an account', async () => {
  const user = await openSignup();
  await user.click(screen.getByRole('button', { name: 'Create account' }));

  expect(screen.getByLabelText('Username')).toHaveFocus();
  expect(screen.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByText('Pick a username first.').closest('[role="status"]')).toHaveAttribute('id', 'signup-username-status');
  expect(createNewIdentityWithPassword).not.toHaveBeenCalled();
});

test('a password mismatch sends focus to the second password', async () => {
  const user = await openSignup();
  await user.type(screen.getByLabelText('Username'), 'newbie');
  await screen.findByText('@newbie is available');
  await user.type(screen.getByLabelText('Password'), 'Lawnchair42');
  await user.type(screen.getByLabelText('Password again'), 'Lawnchair43{Enter}');

  expect(screen.getByLabelText('Password again')).toHaveFocus();
  expect(screen.getByText("The two passwords don't match.")).toBeInTheDocument();
  expect(createNewIdentityWithPassword).not.toHaveBeenCalled();
});

test('the 12 words sit behind "Other ways to sign in", and copying them says so', async () => {
  const user = await openSignup();
  await user.type(screen.getByLabelText('Username'), 'keeper');
  await screen.findByText('@keeper is available');
  await user.click(screen.getByRole('button', { name: 'Other ways to sign in' }));

  await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign in with 12 words instead' })).toHaveFocus());
  expect(screen.queryByLabelText('Password')).toBeNull();

  await user.type(screen.getByLabelText('Username'), '{Enter}');
  await waitFor(() => expect(createNewIdentityWithSeedPhrase).toHaveBeenCalledWith('keeper', undefined));
  const heading = await screen.findByRole('heading', { name: 'Write these down' });
  await waitFor(() => expect(heading).toHaveFocus());

  // user-event gives the page its own clipboard
  await user.click(screen.getByRole('button', { name: 'Copy words' }));
  expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  expect(screen.getByText('Copied the 12 words.')).toBeInTheDocument();
  await expect(navigator.clipboard.readText()).resolves.toBe('one two three four five six seven eight nine ten eleven twelve');
});

describe('after the account exists', () => {
  beforeEach(() => {
    (fetchAuthMe as jest.Mock).mockResolvedValue({ loggedIn: true, user: { primaryHandle: 'newbie@local' } });
  });

  test('Return on an empty email skips to the rules, and the rules ask for the box first', async () => {
    const user = userEvent.setup();
    render(<SignupPage betaRequired={false} siteConfig={siteConfig} />);
    await screen.findByRole('heading', { name: 'Add an email?' });

    await user.type(screen.getByLabelText('Email'), '{Enter}');
    const rules = await screen.findByRole('heading', { name: 'Before you move in' });
    await waitFor(() => expect(rules).toHaveFocus());

    // aria-disabled, not disabled: it can be reached, and pressing it says why
    const next = screen.getByRole('button', { name: 'Continue' });
    expect(next).toHaveAttribute('aria-disabled', 'true');
    await user.click(next);
    expect(screen.getByRole('alert')).toHaveTextContent('Check the box first');
    expect(screen.getByRole('checkbox')).toHaveFocus();

    await user.click(screen.getByRole('checkbox'));
    await user.keyboard('{Enter}');
    const profile = await screen.findByRole('heading', { name: 'Set up your profile' });
    await waitFor(() => expect(profile).toHaveFocus());
  });

  test('the photo picker is a real file input you can Tab to', async () => {
    window.localStorage.setItem('ts-signup-progress', JSON.stringify({ username: 'newbie', step: 'profile' }));
    const user = userEvent.setup();
    render(<SignupPage betaRequired={false} siteConfig={siteConfig} />);
    const heading = await screen.findByRole('heading', { name: 'Set up your profile' });

    const picker = screen.getByLabelText('Choose a photo');
    expect(picker).toHaveAttribute('type', 'file');
    expect(picker).not.toHaveClass('hidden');
    heading.focus();
    await user.tab();
    expect(picker).toHaveFocus();
  });
});
