/**
 * What a route says when a request's body doesn't fit its schema, in the
 * site's words, from the field's name: "Message is too long: 1000
 * characters at most." Zod's own ("Too big: expected string to have <=1000
 * characters") isn't something to show a resident. A schema's own message
 * (`z.string().max(80, 'Keep it under 80 characters.')`) still wins.
 *
 * Set once for every zod schema, by importing this module (lib/api/handler.ts
 * does).
 */
import { z } from 'zod';

/** What zod hands the error map, as much as this reads */
interface Issue {
  code?: string;
  path?: PropertyKey[];
  origin?: string;
  maximum?: number | bigint;
  minimum?: number | bigint;
  input?: unknown;
  format?: string;
}

/** `displayName` → "Display name"; no field → "That" */
export function fieldLabel(path: readonly PropertyKey[] | undefined): string {
  const key = [...(path ?? [])].reverse().find((part) => typeof part === 'string') as string | undefined;
  if (!key) return 'That';
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function plainMessage(issue: Issue): string | undefined {
  const field = fieldLabel(issue.path);
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined ? `${field} is missing.` : `${field} isn't the right kind of value.`;
    case 'too_big':
      if (issue.origin === 'string') return `${field} is too long: ${issue.maximum} characters at most.`;
      if (issue.origin === 'array' || issue.origin === 'set') return `${field} has too many: ${issue.maximum} at most.`;
      return `${field} is too big: ${issue.maximum} at most.`;
    case 'too_small':
      if (issue.origin === 'string') return Number(issue.minimum) <= 1 ? `${field} can't be empty.` : `${field} is too short: at least ${issue.minimum} characters.`;
      if (issue.origin === 'array' || issue.origin === 'set') return `${field} needs at least ${issue.minimum}.`;
      return `${field} is too small: at least ${issue.minimum}.`;
    case 'invalid_value':
      return `${field} isn't one of the choices.`;
    case 'invalid_format':
      if (issue.format === 'email') return `${field} doesn't look like an email address.`;
      if (issue.format === 'url') return `${field} doesn't look like a web address.`;
      return `${field} isn't in the right form.`;
    case 'unrecognized_keys':
      return `${field} has something it doesn't take.`;
    default:
      return `${field} doesn't look right.`;
  }
}

z.config({ customError: (issue) => plainMessage(issue as unknown as Issue) });

/** The message a 400 leads with: the first problem's */
export function validationMessage(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "That doesn't look right.";
}
