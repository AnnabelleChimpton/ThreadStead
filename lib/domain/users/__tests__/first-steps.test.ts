/**
 * The first-steps list reads real data: these tests pin what counts as done.
 */
jest.mock('@/lib/config/database/connection', () => ({
  db: {
    user: { findUnique: jest.fn() },
    userHomeConfig: { findUnique: jest.fn() },
    userHomeDecoration: { findFirst: jest.fn() },
    post: { findFirst: jest.fn() },
    guestbookEntry: { findFirst: jest.fn() },
  },
}));

import { db as realDb } from '@/lib/config/database/connection';
import { getFirstSteps, housePicked, FIRST_STEPS_MAX_AGE_DAYS } from '../first-steps';

const db = realDb as unknown as Record<string, Record<string, jest.Mock>>;

const NOW = new Date('2026-10-17T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function newcomer({
  createdAt = daysAgo(1),
  config = { createdAt: daysAgo(1), updatedAt: daysAgo(1), terrain: {} } as any,
  decoration = null as any,
  post = null as any,
  signed = null as any,
} = {}) {
  db.user.findUnique.mockResolvedValue({ createdAt });
  db.userHomeConfig.findUnique.mockResolvedValue(config);
  db.userHomeDecoration.findFirst.mockResolvedValue(decoration);
  db.post.findFirst.mockResolvedValue(post);
  db.guestbookEntry.findFirst.mockResolvedValue(signed);
}

beforeEach(() => jest.clearAllMocks());

describe('housePicked', () => {
  it('is false for the random house signup creates (one insert, equal timestamps)', () => {
    const at = daysAgo(1);
    expect(housePicked({ createdAt: at, updatedAt: at })).toBe(false);
  });

  it('is true once the house has been saved again', () => {
    expect(housePicked({ createdAt: daysAgo(1), updatedAt: new Date(daysAgo(1).getTime() + 60_000) })).toBe(true);
  });

  it('is false with no house at all', () => {
    expect(housePicked(null)).toBe(false);
  });
});

describe('getFirstSteps', () => {
  it('starts with nothing done for a brand-new account', async () => {
    newcomer();
    await expect(getFirstSteps('u1', NOW)).resolves.toEqual({ house: false, yard: false, post: false, guestbook: false });
  });

  it('ticks each item from the matching data', async () => {
    newcomer({
      config: { createdAt: daysAgo(1), updatedAt: daysAgo(0.5), terrain: {} },
      decoration: { id: 'd1' },
      post: { id: 'p1' },
      signed: { id: 'g1' },
    });
    await expect(getFirstSteps('u1', NOW)).resolves.toEqual({ house: true, yard: true, post: true, guestbook: true });
  });

  it('counts a painted path as a decorated yard', async () => {
    newcomer({ config: { createdAt: daysAgo(1), updatedAt: daysAgo(1), terrain: { '5,18': 'dirt_path' } } });
    expect((await getFirstSteps('u1', NOW))?.yard).toBe(true);
  });

  it("only counts guestbooks that aren't your own", async () => {
    newcomer();
    await getFirstSteps('u1', NOW);
    expect(db.guestbookEntry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { authorId: 'u1', profileOwner: { not: 'u1' } } })
    );
  });

  it('has no list for older accounts', async () => {
    newcomer({ createdAt: daysAgo(FIRST_STEPS_MAX_AGE_DAYS + 1) });
    await expect(getFirstSteps('u1', NOW)).resolves.toBeNull();
    expect(db.post.findFirst).not.toHaveBeenCalled();
  });

  it('has no list for an unknown user', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(getFirstSteps('nobody', NOW)).resolves.toBeNull();
  });
});
