/**
 * Whether text looks like an email address, quickly whatever it's sent.
 * The old check, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, backtracked quadratically
 * on a long string of "a." that didn't end like an address: a 1 MB body
 * held the server for minutes, and email-login takes it signed out. The
 * length comes first (254, the longest an address can be), and the domain
 * is dot-separated labels, which can't backtrack.
 */
export const EMAIL_MAX_LENGTH = 254;

const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export function looksLikeEmail(text: unknown): text is string {
  return typeof text === 'string' && text.length <= EMAIL_MAX_LENGTH && EMAIL.test(text);
}
