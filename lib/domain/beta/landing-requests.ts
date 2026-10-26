/**
 * What Admin's beta landing pages section sends, as schemas. A signup
 * limit of "100" or 75.5 (the Increase Limit prompt takes any number) went
 * to an Int column as a 500, and so did a name that wasn't text.
 */
import { z } from 'zod';

export const signupLimitSchema = z.number().int().min(1).max(100_000);

const fields = {
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().regex(/^[a-z0-9_-]+$/, 'A slug is lowercase letters, numbers, hyphens and underscores.').max(100),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  content: z.string().max(50_000).nullable().optional(),
};

export const createLandingPageSchema = z.object({ ...fields, signupLimit: signupLimitSchema.optional() });

export const updateLandingPageSchema = z.object({
  ...fields,
  signupLimit: signupLimitSchema.optional(),
  isActive: z.boolean().optional(),
  isPaused: z.boolean().optional(),
});

export const landingLimitSchema = z.object({ signupLimit: signupLimitSchema });
