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
    profile: { findUnique: jest.fn() },
    profileTemplateRevision: { findFirst: jest.fn() },
  },
}));

import { db as realDb } from '@/lib/config/database/connection';
import { getFirstSteps, housePicked, FIRST_STEPS_MAX_AGE_DAYS, OWN_PAGE_SAVE_TRIGGERS } from '../first-steps';

const db = realDb as unknown as Record<string, Record<string, jest.Mock>>;

const NOW = new Date('2026-10-17T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

function newcomer({
  createdAt = daysAgo(1),
  config = { createdAt: daysAgo(1), updatedAt: daysAgo(1), terrain: {} } as any,
  decoration = null as any,
  post = null as any,
  signed = null as any,
  // What signup leaves: a theme's CSS on the standard layout, no History yet
  profile = { templateMode: 'enhanced', widgetSlot: null } as { templateMode: string; widgetSlot: unknown } | null,
  pageSave = null as { id: string } | null,
  // Someone else's latest public post, for the guestbook step
  latest = null as { author: { primaryHandle: string | null } } | null,
} = {}) {
  db.user.findUnique.mockResolvedValue({ createdAt });
  db.userHomeConfig.findUnique.mockResolvedValue(config);
  db.userHomeDecoration.findFirst.mockResolvedValue(decoration);
  // Their own post, or the latest one by someone else
  db.post.findFirst.mockImplementation(async ({ where }: { where: { authorId: unknown } }) =>
    typeof where.authorId === 'string' ? post : latest
  );
  db.guestbookEntry.findFirst.mockResolvedValue(signed);
  db.profile.findUnique.mockResolvedValue(profile);
  db.profileTemplateRevision.findFirst.mockResolvedValue(pageSave);
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
    await expect(getFirstSteps('u1', NOW)).resolves.toEqual({ house: false, yard: false, post: false, guestbook: false, page: false, neighbor: null });
  });

  it('ticks each item from the matching data', async () => {
    newcomer({
      config: { createdAt: daysAgo(1), updatedAt: daysAgo(0.5), terrain: {} },
      decoration: { id: 'd1' },
      post: { id: 'p1' },
      signed: { id: 'g1' },
      pageSave: { id: 'r1' },
    });
    await expect(getFirstSteps('u1', NOW)).resolves.toEqual({ house: true, yard: true, post: true, guestbook: true, page: true, neighbor: null });
  });

  it("counts the page as theirs once they've saved a look over signup's", async () => {
    newcomer({ pageSave: { id: 'r1' } });
    expect((await getFirstSteps('u1', NOW))?.page).toBe(true);
    expect(db.profileTemplateRevision.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', trigger: { in: OWN_PAGE_SAVE_TRIGGERS } } })
    );
  });

  it("doesn't count History the person didn't make", () => {
    expect(OWN_PAGE_SAVE_TRIGGERS).toEqual(expect.arrayContaining(['css-save', 'template-save']));
    expect(OWN_PAGE_SAVE_TRIGGERS).not.toContain('moderator-reset');
    expect(OWN_PAGE_SAVE_TRIGGERS).not.toContain('layout-merge');
  });

  it('counts their own HTML page', async () => {
    newcomer({ profile: { templateMode: 'advanced', widgetSlot: null } });
    expect((await getFirstSteps('u1', NOW))?.page).toBe(true);
  });

  it('counts widgets under the header', async () => {
    newcomer({ profile: { templateMode: 'enhanced', widgetSlot: { fragment: '<StickyNote />' } } });
    expect((await getFirstSteps('u1', NOW))?.page).toBe(true);
  });

  it('copes with no profile row', async () => {
    newcomer({ profile: null });
    expect((await getFirstSteps('u1', NOW))?.page).toBe(false);
  });

  it('counts a painted path as a decorated yard', async () => {
    newcomer({ config: { createdAt: daysAgo(1), updatedAt: daysAgo(1), terrain: { '5,18': 'dirt_path' } } });
    expect((await getFirstSteps('u1', NOW))?.yard).toBe(true);
  });

  it("offers the guestbook of whoever else posted most recently, among residents they can see", async () => {
    newcomer({ latest: { author: { primaryHandle: 'moss@local' } } });
    expect((await getFirstSteps('u1', NOW))?.neighbor).toBe('moss');
    expect(db.post.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ authorId: { not: 'u1' }, visibility: 'public', author: expect.objectContaining({ AND: expect.any(Array) }) }),
        orderBy: { createdAt: 'desc' },
      })
    );
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
