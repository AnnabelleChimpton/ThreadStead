/** "6 November 2026", for when a leaving account goes: UTC, the same day the email names. */
export function leavingDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
