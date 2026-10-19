// The owner's own status line on their profile (Settings > Profile).
export const STATUS_MAX = 80;

/** A status from a request body: trimmed, one line, at most STATUS_MAX; '' clears it. */
export function cleanStatus(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return null;
  const line = value.replace(/\s+/g, ' ').trim().slice(0, STATUS_MAX);
  return line || null;
}
