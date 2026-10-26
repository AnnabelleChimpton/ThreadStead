/**
 * What Admin's decoration pages send (pages/admin/decorations.tsx,
 * pages/admin/decorations/from-png.tsx), as schemas: create, edit, release
 * and grant. Before these, a cleared size box sent null into a non-null
 * column (a 500), a bad date passed the start-before-end check as NaN, and
 * any string went into releaseType.
 */
import { z } from 'zod';
import { ClaimMethod, ReleaseType } from '@prisma/client';

const date = z.string().refine((text) => !Number.isNaN(Date.parse(text)), "That date doesn't look right.");
/** A cleared size box arrives as null: the item keeps its size (edit) or gets 1×1 (new) */
const gridSize = z.number().int().min(1).max(20).nullable();
const svg = z.string().max(200_000);

const fields = {
  name: z.string().trim().min(1).max(100),
  type: z.string().trim().min(1).max(50),
  category: z.string().trim().min(1).max(50),
  zone: z.string().trim().min(1).max(50),
  section: z.string().max(50).nullable(),
  iconSvg: svg,
  renderSvg: svg,
  imagePath: z.string().max(500).nullable(),
  gridWidth: gridSize,
  gridHeight: gridSize,
  description: z.string().max(1000).nullable(),
  isActive: z.boolean(),
  releaseType: z.enum(ReleaseType),
  releaseStartAt: date.nullable(),
  releaseEndAt: date.nullable(),
  maxClaims: z.number().int().min(1).nullable(),
  collection: z.string().max(100).nullable(),
};

export const createDecorationSchema = z.object({
  itemId: z.string().trim().min(1).max(100),
  name: fields.name,
  type: fields.type,
  category: fields.category,
  zone: fields.zone,
  section: fields.section.optional(),
  iconSvg: fields.iconSvg.optional(),
  renderSvg: fields.renderSvg.optional(),
  imagePath: fields.imagePath.optional(),
  gridWidth: fields.gridWidth.optional(),
  gridHeight: fields.gridHeight.optional(),
  description: fields.description.optional(),
  releaseType: fields.releaseType.optional(),
  releaseStartAt: fields.releaseStartAt.optional(),
  releaseEndAt: fields.releaseEndAt.optional(),
  maxClaims: fields.maxClaims.optional(),
});

/** Every field optional: what's left out stays as it is */
export const updateDecorationSchema = z.object(fields).partial().extend({ itemId: z.string().optional() });

export const releaseDecorationSchema = z.object({
  releaseType: z.enum(['LIMITED_TIME', 'CLAIM_CODE']),
  releaseStartAt: date.optional(),
  releaseEndAt: date.optional(),
  /** Left out: the item keeps its limit; null: no limit */
  maxClaims: z.number().int().min(1).nullable().optional(),
  generateCode: z.boolean().optional(),
});

export const grantDecorationSchema = z.object({
  userIds: z.array(z.string().min(1).max(200)).min(1).max(100),
  claimMethod: z.enum([ClaimMethod.ADMIN_GRANT, ClaimMethod.BETA_ACCESS]).optional(),
});

/** A limited-time window, if its start comes before its end; else what's wrong */
export function windowProblem(start: Date | null | undefined, end: Date | null | undefined): string | null {
  if (!start || !end) return 'A limited-time release needs a start and an end.';
  if (start >= end) return 'The start has to come before the end.';
  return null;
}
