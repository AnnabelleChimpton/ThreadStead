/**
 * @jest-environment node
 *
 * Site news: admins post and edit news at /admin, residents read it at
 * /community/news and in the homepage ticker.
 *
 * - High priority comes first. Postgres sorts the NewsPriority enum in its
 *   declared order (high, medium, low), so that's `asc`; `desc` sank
 *   high-priority news below everything else.
 * - A rejected post says what to fix (a bare "Validation error" didn't).
 * - Editing an item with no url/content works: the admin list hands those
 *   back as null and the edit form sends them as it got them.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { NewsPriority } from '@prisma/client';

jest.mock('@/lib/config/database/connection', () => ({
  db: {
    siteNews: {
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'n1',
        ...data,
        author: { id: 'u_admin', primaryHandle: 'annabelle@local', profile: { displayName: 'Annabelle' } },
      })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'n1',
        ...data,
        author: { id: 'u_admin', primaryHandle: 'annabelle@local', profile: null },
      })),
    },
  },
}));
jest.mock('@/lib/auth/server', () => ({ getSessionUser: jest.fn() }));
jest.mock('@/lib/server/http/csrf', () => ({ csrfProtection: jest.fn(async () => true) }));
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn(async () => true) }));

import adminNews from '@/pages/api/admin/site-news';
import adminNewsItem from '@/pages/api/admin/site-news/[id]';
import publicNews from '@/pages/api/site-news';
import { db } from '@/lib/config/database/connection';
import { getSessionUser } from '@/lib/auth/server';

type Route = (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

async function call(route: Route, method: string, { body, query = {} }: { body?: unknown; query?: Record<string, string> } = {}) {
  const req = { method, url: '/api/site-news', query, body, headers: {} } as unknown as NextApiRequest;
  const res = {
    statusCode: 200,
    body: undefined as Record<string, any> | undefined,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: Record<string, any>) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
    setHeader() {},
  };
  await route(req, res as unknown as NextApiResponse);
  return { status: res.statusCode, body: res.body! };
}

const POST = {
  title: 'Rings can change hands',
  summary: 'Ring owners can hand a ring over to another member now.',
  content: '',
  url: '',
  type: 'feature',
  priority: 'medium',
  isPublished: true,
  publishedAt: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  (getSessionUser as jest.Mock).mockResolvedValue({ id: 'u_admin', role: 'admin' });
});

describe('order: high priority first, then newest', () => {
  const highFirst = [{ priority: 'asc' }, { publishedAt: 'desc' }];

  test('the enum is declared high, medium, low (so high-first is asc)', () => {
    // Prisma lists enum values in schema order, the order the migration
    // created the Postgres type in, which is the order Postgres sorts by.
    expect(Object.values(NewsPriority)).toEqual(['high', 'medium', 'low']);
  });

  test('/community/news and the ticker', async () => {
    const res = await call(publicNews as Route, 'GET', { query: { limit: '5' } });
    expect(res.status).toBe(200);
    expect(db.siteNews.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: highFirst }));
  });

  test('the admin list', async () => {
    const res = await call(adminNews as Route, 'GET');
    expect(res.status).toBe(200);
    expect(db.siteNews.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: highFirst }));
  });
});

describe('posting', () => {
  test('the admin form body saves, published now', async () => {
    const before = Date.now();
    const res = await call(adminNews as Route, 'POST', { body: POST });

    expect(res.status).toBe(201);
    const { data } = (db.siteNews.create as jest.Mock).mock.calls[0][0];
    expect(data).toMatchObject({
      title: POST.title,
      summary: POST.summary,
      type: 'feature',
      priority: 'medium',
      isPublished: true,
      createdBy: 'u_admin',
    });
    expect(data.publishedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  test('a publish date with a zone keeps that instant', async () => {
    const res = await call(adminNews as Route, 'POST', { body: { ...POST, publishedAt: '2026-10-20T21:30:00.000Z' } });

    expect(res.status).toBe(201);
    const { data } = (db.siteNews.create as jest.Mock).mock.calls[0][0];
    expect(data.publishedAt.toISOString()).toBe('2026-10-20T21:30:00.000Z');
  });

  test('a summary over 500 characters says so instead of "Validation error"', async () => {
    const res = await call(adminNews as Route, 'POST', { body: { ...POST, summary: 'a'.repeat(501) } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/summary to 500 characters/);
    expect(db.siteNews.create).not.toHaveBeenCalled();
  });

  test('a missing title says so', async () => {
    const res = await call(adminNews as Route, 'POST', { body: { ...POST, title: '  ' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Add a title.');
  });

  test('a date that is not a date is turned away', async () => {
    const res = await call(adminNews as Route, 'POST', { body: { ...POST, publishedAt: 'next tuesday' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/publish date/);
  });

  // Every way the form body can be turned away names the field and the fix.
  test.each([
    ['a long title', { title: 't'.repeat(256) }, 'Keep the title under 255 characters.'],
    ['no summary', { summary: '' }, 'Add a summary.'],
    ['content that is not text', { content: 42 }, 'The full content has to be text.'],
    ['a url that is not text', { url: 42 }, 'The custom URL has to be text.'],
    ['an unknown type', { type: 'news' }, 'Pick a type: announcement, feature, maintenance or community.'],
    ['an unknown priority', { priority: 'urgent' }, 'Pick a priority: high, medium or low.'],
    ['published as a string', { isPublished: 'yes' }, 'Published has to be on or off.'],
    ['a date that is a number', { publishedAt: 5 }, "That publish date isn't a real date."],
  ])('%s', async (_name, change, message) => {
    const res = await call(adminNews as Route, 'POST', { body: { ...POST, ...change } });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
    expect(db.siteNews.create).not.toHaveBeenCalled();
  });

  test('a body that is not an object asks for a refresh', async () => {
    const res = await call(adminNews as Route, 'POST', { body: 'title=hi' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Couldn't read the news item. Refresh the page and try again.");
  });

  test('members cannot post', async () => {
    (getSessionUser as jest.Mock).mockResolvedValue({ id: 'u_member', role: 'member' });
    const res = await call(adminNews as Route, 'POST', { body: POST });

    expect(res.status).toBe(403);
    expect(db.siteNews.create).not.toHaveBeenCalled();
  });
});

describe('editing', () => {
  test('an item with no url or content saves (they come back as null)', async () => {
    const res = await call(adminNewsItem as Route, 'PATCH', {
      query: { id: 'n1' },
      body: {
        title: 'Edited',
        summary: POST.summary,
        content: null,
        url: null,
        type: 'announcement',
        priority: 'high',
        isPublished: false,
        publishedAt: '2026-10-19T08:00:00.000Z',
      },
    });

    expect(res.status).toBe(200);
    const { data } = (db.siteNews.update as jest.Mock).mock.calls[0][0];
    expect(data).toMatchObject({ title: 'Edited', content: null, url: null, isPublished: false });
    expect(data.publishedAt.toISOString()).toBe('2026-10-19T08:00:00.000Z');
  });

  test('an edit with a long summary says so', async () => {
    const res = await call(adminNewsItem as Route, 'PATCH', { query: { id: 'n1' }, body: { summary: 's'.repeat(501) } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/summary to 500 characters/);
    expect(db.siteNews.update).not.toHaveBeenCalled();
  });

  test('an edit that leaves out isPublished leaves it alone', async () => {
    const res = await call(adminNewsItem as Route, 'PATCH', { query: { id: 'n1' }, body: { title: 'Only the title' } });

    expect(res.status).toBe(200);
    const { data } = (db.siteNews.update as jest.Mock).mock.calls[0][0];
    expect(data).toEqual({ title: 'Only the title' });
  });
});
