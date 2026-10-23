/**
 * Your songs in Settings → Music (MIDI plan Phase 5): choose the song on
 * your profile or none, switches that save as you tick them, a title and
 * credit you can edit, an in-row preview, and a delete that warns when it's
 * the song on your profile.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const toast = { showSuccess: jest.fn(), showError: jest.fn(), showInfo: jest.fn() };
const confirm = jest.fn(async (_options: { title: string; message?: string }) => true);
jest.mock('@/contexts/ToastContext', () => ({ useToast: () => toast }));
jest.mock('@/contexts/ConfirmContext', () => ({ useConfirm: () => confirm }));
jest.mock('@/lib/api/client/csrf-fetch', () => ({ csrfFetch: jest.fn() }));
jest.mock('@/components/ui/PixelIcon', () => ({ PixelIcon: () => null }));
// The player is loaded with next/dynamic; a stand-in shows which song it was given
jest.mock('next/dynamic', () => () => {
  const PreviewPlayer = (props: { title: string; credit?: string }) => (
    <div data-testid="preview-player">{props.title} {props.credit}</div>
  );
  return PreviewPlayer;
});

import MidiManager from '../MidiManager';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

const SONGS = [
  { id: 's1', title: 'Little tune', caption: 'by me', originalName: 'little.mid', fileSize: 2048, createdAt: '2026-10-01T00:00:00Z' },
  { id: 's2', title: null, caption: null, originalName: 'second-song.midi', fileSize: 4096, createdAt: '2026-10-02T00:00:00Z' },
];

type Reply = { ok: boolean; status: number; json: () => Promise<unknown> };
const MINTED: Reply = { ok: true, status: 200, json: async () => ({ token: 'cap' }) };

function serve(profile: { profileMidiId: string | null; midiAutoplay?: boolean; midiLoop?: boolean }, cap = MINTED) {
  global.fetch = jest.fn(async (url: string) => {
    if (url.startsWith('/api/media/midi/')) return { ok: true, json: async () => ({ files: SONGS }) };
    if (url.startsWith('/api/profile/')) return { ok: true, json: async () => ({ profile }) };
    if (url.startsWith('/api/cap/')) return cap;
    return { ok: false, json: async () => ({}) };
  }) as unknown as typeof fetch;
}

const posted = () =>
  (csrfFetch as jest.Mock).mock.calls
    .filter(([url]) => url === '/api/profile/midi')
    .map(([, init]) => JSON.parse(init.body));

beforeEach(() => {
  jest.clearAllMocks();
  (csrfFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ media: { title: 'Renamed', caption: 'by someone' } }) });
});

test('"No music" is a choice, and picking it clears the song', async () => {
  serve({ profileMidiId: 's1', midiAutoplay: true });
  render(<MidiManager username="me" />);
  const none = await screen.findByRole('radio', { name: 'No music' });
  expect(screen.getByRole('radio', { name: /Little tune/ })).toBeChecked();

  fireEvent.click(none);
  await waitFor(() => expect(posted()).toEqual([{ midiId: null, autoplay: true, loop: false, cap: 'cap' }]));
  expect(toast.showSuccess).toHaveBeenCalledWith('Your profile has no music now.');
});

test('a song whose row was deleted isn’t shown as picked (it used to say "Unnamed Track")', async () => {
  serve({ profileMidiId: 'gone' });
  render(<MidiManager username="me" />);
  expect(await screen.findByRole('radio', { name: 'No music' })).toBeChecked();
});

test('autoplay and repeat save the moment they’re ticked, with the song', async () => {
  serve({ profileMidiId: 's2' });
  render(<MidiManager username="me" />);
  fireEvent.click(await screen.findByRole('checkbox', { name: /Start it when someone visits/ }));
  await waitFor(() => expect(posted()).toEqual([{ midiId: 's2', autoplay: true, loop: false, cap: 'cap' }]));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Play it on repeat' }));
  await waitFor(() => expect(posted()[1]).toEqual({ midiId: 's2', autoplay: true, loop: true, cap: 'cap' }));
  expect(screen.queryByRole('button', { name: /^Save$/ })).not.toBeInTheDocument();
});

test('with no song picked there are no playback switches', async () => {
  serve({ profileMidiId: null });
  render(<MidiManager username="me" />);
  await screen.findByRole('radio', { name: 'No music' });
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

test('a song can get a title and a credit', async () => {
  serve({ profileMidiId: null });
  render(<MidiManager username="me" />);
  const row = (await screen.findByText('second-song')).closest('li')!;
  fireEvent.click(within(row).getByRole('button', { name: 'Edit' }));
  fireEvent.change(within(row).getByRole('textbox', { name: 'Title' }), { target: { value: 'Renamed' } });
  fireEvent.change(within(row).getByRole('textbox', { name: /Credit/ }), { target: { value: 'by someone' } });
  fireEvent.click(within(row).getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(within(row).getByText('Renamed')).toBeInTheDocument());
  const [, init] = (csrfFetch as jest.Mock).mock.calls.find(([url]) => url === '/api/media/s2');
  expect(init.method).toBe('PATCH');
  expect(JSON.parse(init.body)).toMatchObject({ title: 'Renamed', caption: 'by someone' });
});

test('the preview plays in its own row, with the song’s name and credit', async () => {
  serve({ profileMidiId: null });
  render(<MidiManager username="me" />);
  const row = (await screen.findByText('Little tune')).closest('li')!;
  fireEvent.click(within(row).getByRole('button', { name: 'Preview' }));
  expect(within(row).getByTestId('preview-player')).toHaveTextContent('Little tune by me');
  fireEvent.click(within(row).getByRole('button', { name: 'Close preview' }));
  expect(screen.queryByTestId('preview-player')).not.toBeInTheDocument();
});

test('deleting the song on your profile says the page will go quiet', async () => {
  serve({ profileMidiId: 's1' });
  render(<MidiManager username="me" />);
  const row = (await screen.findByText('Little tune')).closest('li')!;
  fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));
  await waitFor(() => expect(confirm).toHaveBeenCalled());
  expect(confirm.mock.calls[0][0].message).toMatch(/song on your profile, so your page will go quiet/);
  await waitFor(() => expect(screen.queryByText('Little tune')).not.toBeInTheDocument());
  expect(screen.getByRole('radio', { name: 'No music' })).toBeChecked();
});

test('Download saves the file with its own name', async () => {
  serve({ profileMidiId: null });
  render(<MidiManager username="me" />);
  const link = await screen.findAllByRole('link', { name: 'Download' });
  expect(link[0]).toHaveAttribute('href', '/api/media/serve/s1?download=1');
});

test('songs move up and down, and the new order is saved', async () => {
  serve({ profileMidiId: null });
  render(<MidiManager username="me" />);
  const up = await screen.findByRole('button', { name: 'Move “Little tune” up' });
  expect(up).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Move “second-song” down' })).toBeDisabled();

  fireEvent.click(screen.getByRole('button', { name: 'Move “Little tune” down' }));
  await waitFor(() => {
    const call = (csrfFetch as jest.Mock).mock.calls.find(([url]) => url === '/api/user/song-order');
    expect(call && JSON.parse(call[1].body)).toEqual({ ids: ['s2', 's1'] });
  });
  const names = screen.getAllByRole('radio').map((r) => r.closest('li')?.textContent ?? '');
  expect(names[1]).toMatch(/second-song/);
  expect(names[2]).toMatch(/Little tune/);
  expect(screen.getByText('Moved “Little tune” to 2 of 2.')).toBeInTheDocument();
});

test('when the order can’t be saved, the list goes back', async () => {
  serve({ profileMidiId: null });
  (csrfFetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({}) });
  render(<MidiManager username="me" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Move “Little tune” down' }));
  await waitFor(() => expect(toast.showError).toHaveBeenCalledWith("Couldn't save the new order. Try again in a moment."));
  expect(screen.getAllByRole('radio')[1].closest('li')?.textContent).toMatch(/Little tune/);
});

test('someone leaving hears how to stay, and nothing changes', async () => {
  const leaving = "Your account is set to be deleted on 6 November. If you'd like to stay, press Keep my account at the top of the page.";
  serve({ profileMidiId: 's1' }, { ok: false, status: 403, json: async () => ({ error: leaving, code: 'account_leaving' }) });
  render(<MidiManager username="me" />);
  fireEvent.click(await screen.findByRole('radio', { name: 'No music' }));

  await waitFor(() => expect(toast.showError).toHaveBeenCalledWith(leaving));
  expect(posted()).toEqual([]);
  expect(screen.getByRole('radio', { name: /Little tune/ })).toBeChecked();
});
