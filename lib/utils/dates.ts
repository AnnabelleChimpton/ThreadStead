/**
 * "Oct 17, 2026" — the same on the server and in every browser.
 *
 * A bare toLocaleDateString() uses the machine's locale and time zone, so a
 * server-rendered page shows one date and the visitor's browser another,
 * and React throws a hydration error. Dates are stored in UTC, so show UTC.
 */
export function calendarDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
