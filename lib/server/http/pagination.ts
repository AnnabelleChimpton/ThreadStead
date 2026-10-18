/**
 * Lenient query-string pagination. A missing or non-numeric value falls back
 * to the default, and anything outside [min, max] is clamped, so a bad
 * `?limit=abc` or `?offset=-5` can't reach Prisma as NaN or a negative skip.
 *
 * Routes that should reject bad input with a 400 instead use the strict
 * parseIntParam in lib/search/query.ts.
 */

type QueryValue = string | string[] | undefined;
type Query = Partial<Record<string, QueryValue>>;

/** One integer query param. Missing or not a number → fallback; then clamped. */
export function intParam(
  raw: QueryValue,
  { fallback, min, max }: { fallback: number; min?: number; max?: number }
): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = value === undefined ? NaN : parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}

/** A page size: at least 1, at most `max` when given. */
export function parseLimit(raw: QueryValue, { fallback, max }: { fallback: number; max?: number }): number {
  return intParam(raw, { fallback, min: 1, max });
}

/** `?limit=&offset=` → `{ limit, offset }` (offset ≥ 0). */
export function parseOffsetPagination(
  query: Query,
  { defaultLimit, maxLimit }: { defaultLimit: number; maxLimit?: number }
): { limit: number; offset: number } {
  return {
    limit: parseLimit(query.limit, { fallback: defaultLimit, max: maxLimit }),
    offset: intParam(query.offset, { fallback: 0, min: 0 }),
  };
}

/** `?page=&limit=` with 1-based pages → `{ page, limit, skip }`. */
export function parsePagePagination(
  query: Query,
  { defaultLimit, maxLimit }: { defaultLimit: number; maxLimit?: number }
): { page: number; limit: number; skip: number } {
  const page = intParam(query.page, { fallback: 1, min: 1 });
  const limit = parseLimit(query.limit, { fallback: defaultLimit, max: maxLimit });
  return { page, limit, skip: (page - 1) * limit };
}
