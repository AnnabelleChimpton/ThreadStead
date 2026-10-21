/**
 * @jest-environment node
 *
 * Making a member's song's bank on demand (first play, backfill). Storage,
 * the database and the trim are stood in for; trim-sound-bank.test.ts tests
 * the trim itself.
 */
jest.mock('@/lib/config/database/connection', () => ({ db: { media: { update: jest.fn() } } }));
jest.mock('@/lib/storage/r2', () => ({
  keyFromPublicUrl: (url: string) => (url.startsWith('https://cdn.example.com/') ? url.slice('https://cdn.example.com/'.length) : null),
  putObject: jest.fn(async ({ key }: { key: string }) => `https://cdn.example.com/${key}`),
  readStoredObject: jest.fn(),
}));
jest.mock('../trim-sound-bank', () => ({ trimSoundBank: jest.fn(async () => Buffer.from('RIFF\0\0\0\0sfbk')) }));

import { db } from '@/lib/config/database/connection';
import { putObject, readStoredObject } from '@/lib/storage/r2';
import { trimSoundBank } from '../trim-sound-bank';
import { makeSongSoundBank, soundBankKeyFor } from '../song-sound-bank';

const SONG = { id: 'm1', fullUrl: 'https://cdn.example.com/media/u1/1700.mid' };

beforeEach(() => {
  jest.clearAllMocks();
  (readStoredObject as jest.Mock).mockResolvedValue(Buffer.from('MThd'));
});

test('the bank sits beside the song, named as upload names it', () => {
  expect(soundBankKeyFor('https://cdn.example.com/media/u1/1700.mid')).toBe('media/u1/1700.sf2');
  expect(soundBankKeyFor('https://cdn.example.com/media/u1/1700.midi')).toBe('media/u1/1700.sf2');
  expect(soundBankKeyFor('https://elsewhere.example.com/song.mid')).toBeNull();
});

test('makes, stores and records the bank', async () => {
  const { url, bank } = await makeSongSoundBank(SONG);
  expect(trimSoundBank).toHaveBeenCalledWith(Buffer.from('MThd'), undefined);
  expect(putObject).toHaveBeenCalledWith(expect.objectContaining({ key: 'media/u1/1700.sf2', contentType: 'application/octet-stream' }));
  expect(db.media.update).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { soundBankUrl: url } });
  expect(url).toBe('https://cdn.example.com/media/u1/1700.sf2');
  expect(bank.subarray(0, 4).toString()).toBe('RIFF');
});

test('two first plays at once make it once', async () => {
  const [a, b] = await Promise.all([makeSongSoundBank(SONG), makeSongSoundBank(SONG)]);
  expect(a).toBe(b);
  expect(trimSoundBank).toHaveBeenCalledTimes(1);
  // and a later call makes it again (nothing is cached past the job)
  await makeSongSoundBank(SONG);
  expect(trimSoundBank).toHaveBeenCalledTimes(2);
});

test('a missing song file makes nothing and records nothing', async () => {
  (readStoredObject as jest.Mock).mockResolvedValue(null);
  await expect(makeSongSoundBank(SONG)).rejects.toThrow('The song file is missing');
  expect(putObject).not.toHaveBeenCalled();
  expect(db.media.update).not.toHaveBeenCalled();
});

test('a song outside our storage is refused', async () => {
  await expect(makeSongSoundBank({ id: 'm2', fullUrl: 'https://elsewhere.example.com/a.mid' })).rejects.toThrow('Not in our storage');
  expect(readStoredObject).not.toHaveBeenCalled();
});
