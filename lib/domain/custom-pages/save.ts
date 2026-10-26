/**
 * Saving a custom page from Admin (pages/api/admin/custom-pages*): one
 * homepage and one landing page at a time. The other page's flag used to be
 * cleared before the save, outside any transaction, so a slug that was taken
 * (an ordinary mistake) left the site with no homepage or landing page.
 */
import { z } from 'zod';
import type { CustomPage } from '@prisma/client';
import { db } from '@/lib/config/database/connection';

/** What PageForm (pages/admin/index.tsx) sends */
export const customPageSchema = z.object({
  slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/, 'The address can only have lowercase letters, numbers and hyphens.'),
  title: z.string().trim().min(1).max(200),
  content: z.string().max(500_000).optional(),
  published: z.boolean().optional(),
  showInNav: z.boolean().optional(),
  navOrder: z.number().int().min(-10_000).max(10_000).optional(),
  navDropdown: z.string().max(100).nullable().optional(),
  hideNavbar: z.boolean().optional(),
  isHomepage: z.boolean().optional(),
  isLandingPage: z.boolean().optional(),
});

export type CustomPageInput = z.infer<typeof customPageSchema>;

/** Creates (no id) or updates a page, and moves the homepage/landing flags to it, all or nothing */
export async function saveCustomPage(input: CustomPageInput, id?: string): Promise<CustomPage> {
  const data = {
    slug: input.slug,
    title: input.title,
    content: input.content ?? '',
    published: input.published ?? false,
    showInNav: input.showInNav ?? false,
    navOrder: input.navOrder ?? 0,
    navDropdown: input.navDropdown || null,
    hideNavbar: input.hideNavbar ?? false,
    isHomepage: input.isHomepage ?? false,
    isLandingPage: input.isLandingPage ?? false,
  };
  return db.$transaction(async (tx) => {
    const others = id ? { NOT: { id } } : {};
    if (data.isHomepage) await tx.customPage.updateMany({ where: { isHomepage: true, ...others }, data: { isHomepage: false } });
    if (data.isLandingPage) await tx.customPage.updateMany({ where: { isLandingPage: true, ...others }, data: { isLandingPage: false } });
    return id ? tx.customPage.update({ where: { id }, data }) : tx.customPage.create({ data });
  });
}
