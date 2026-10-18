/**
 * Query helpers shared by /api/search and /api/directory.
 */
import { ApiError } from '@/lib/api/errors';

/**
 * Escape LIKE/ILIKE wildcards. Prisma's `contains` wraps the value in `%…%`
 * but does not escape it, so a search for `%` matched every row and `_`
 * matched any single character. Postgres' default LIKE escape is backslash.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

/**
 * Parse an optional integer query param. Missing → `fallback`; anything that
 * isn't a whole number ≥ `min` → 400 (it used to become NaN → 500, or a
 * negative skip that reversed results). Values above `max` are clamped.
 */
export function parseIntParam(
  raw: string | string[] | undefined,
  name: string,
  { fallback, min, max }: { fallback: number; min: number; max?: number }
): number {
  if (raw === undefined || raw === '') return fallback;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!/^\d+$/.test(value.trim())) {
    throw new ApiError(400, `"${name}" must be a whole number of at least ${min}`);
  }
  const n = Number(value.trim());
  if (n < min) throw new ApiError(400, `"${name}" must be a whole number of at least ${min}`);
  return max !== undefined ? Math.min(n, max) : n;
}
