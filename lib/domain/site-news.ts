import { z } from 'zod';
import type { Prisma } from '@prisma/client';

/**
 * Site news, shared by the admin routes (pages/api/admin/site-news*) and the
 * public ones (pages/api/site-news*).
 */

/**
 * High priority first, then newest. Postgres sorts an enum by its declared
 * order (high, medium, low), so high-first is `asc`. `desc` put high-priority
 * news at the very bottom of /community/news and out of the ticker.
 */
export const SITE_NEWS_ORDER: Prisma.SiteNewsOrderByWithRelationInput[] = [
  { priority: 'asc' },
  { publishedAt: 'desc' },
];

const publishedAt = z
  .string({ error: "That publish date isn't a real date." })
  .refine((value) => value === '' || !Number.isNaN(new Date(value).getTime()), {
    error: "That publish date isn't a real date.",
  });

// Every message names the field and says what to change: the admin form shows
// the first one as it is (a bare "Validation error" left the owner guessing).
export const createNewsSchema = z.object(
  {
    title: z
      .string({ error: 'Add a title.' })
      .trim()
      .min(1, 'Add a title.')
      .max(255, 'Keep the title under 255 characters.'),
    summary: z
      .string({ error: 'Add a summary.' })
      .trim()
      .min(1, 'Add a summary.')
      .max(500, 'Keep the summary to 500 characters. The rest can go in the full content.'),
    // The admin list returns null for an empty content or url, and the edit
    // form sends the item back as it got it.
    content: z.string({ error: 'The full content has to be text.' }).nullish(),
    url: z.string({ error: 'The custom URL has to be text.' }).nullish(),
    type: z.enum(['announcement', 'feature', 'maintenance', 'community'], {
      error: 'Pick a type: announcement, feature, maintenance or community.',
    }),
    priority: z.enum(['high', 'medium', 'low'], { error: 'Pick a priority: high, medium or low.' }),
    isPublished: z.boolean({ error: 'Published has to be on or off.' }).default(true),
    publishedAt: publishedAt.optional(),
  },
  { error: "Couldn't read the news item. Refresh the page and try again." }
);

export const updateNewsSchema = createNewsSchema.partial().extend({
  isPublished: z.boolean({ error: 'Published has to be on or off.' }).optional(),
});

/** The first problem, in words an admin can act on. */
export function newsValidationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Check the news item and try again.';
}
