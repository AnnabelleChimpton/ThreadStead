/**
 * @jest-environment node
 *
 * The chat block cache over the real getUsersBlockedEitherWay, with only the
 * database mocked.
 */
jest.mock('@/lib/config/database/connection', () => ({
  db: { userBlock: { findMany: jest.fn() } },
}));

import { db } from '@/lib/config/database/connection';
import { CHAT_BLOCK_CACHE_TTL_MS, forgetChatBlocks, getChatBlockedIds } from '../block-cache';

const findMany = (db as unknown as { userBlock: { findMany: jest.Mock } }).userBlock.findMany;

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.__threadsteadChatBlockCache?.clear();
  findMany.mockResolvedValue([]);
});

afterEach(() => jest.useRealTimers());

it('collects people on both sides of a block in one query', async () => {
  findMany.mockResolvedValue([
    { blockerId: 'u-alice', blockedUserId: 'u-bob' }, // Alice blocked Bob
    { blockerId: 'u-carol', blockedUserId: 'u-alice' }, // Carol blocked Alice
    { blockerId: 'u-alice', blockedUserId: 'u-carol' }, // ...and back
  ]);
  expect([...(await getChatBlockedIds('u-alice'))].sort()).toEqual(['u-bob', 'u-carol']);
  expect(findMany).toHaveBeenCalledTimes(1);
  expect(findMany).toHaveBeenCalledWith({
    where: { OR: [{ blockerId: 'u-alice', blockedUserId: { not: null } }, { blockedUserId: 'u-alice' }] },
    select: { blockerId: true, blockedUserId: true },
  });
});

it('reuses a lookup, including one still in flight', async () => {
  await Promise.all([getChatBlockedIds('u-alice'), getChatBlockedIds('u-alice')]);
  await getChatBlockedIds('u-alice');
  expect(findMany).toHaveBeenCalledTimes(1);
});

it('looks again once the entry expires', async () => {
  jest.useFakeTimers({ now: 0 });
  await getChatBlockedIds('u-alice');
  jest.setSystemTime(CHAT_BLOCK_CACHE_TTL_MS - 1);
  await getChatBlockedIds('u-alice');
  expect(findMany).toHaveBeenCalledTimes(1);
  jest.setSystemTime(CHAT_BLOCK_CACHE_TTL_MS);
  await getChatBlockedIds('u-alice');
  expect(findMany).toHaveBeenCalledTimes(2);
});

it('forgetChatBlocks clears both people', async () => {
  await getChatBlockedIds('u-alice');
  await getChatBlockedIds('u-bob');
  forgetChatBlocks('u-alice', 'u-bob', null);
  await getChatBlockedIds('u-alice');
  await getChatBlockedIds('u-bob');
  expect(findMany).toHaveBeenCalledTimes(4);
});

it('does not cache a failed lookup', async () => {
  findMany.mockRejectedValueOnce(new Error('db down'));
  await expect(getChatBlockedIds('u-alice')).rejects.toThrow('db down');
  findMany.mockResolvedValueOnce([{ blockerId: 'u-bob', blockedUserId: 'u-alice' }]);
  expect([...(await getChatBlockedIds('u-alice'))]).toEqual(['u-bob']);
});
