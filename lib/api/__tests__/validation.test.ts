/**
 * A request that doesn't fit its schema hears what to fix in the site's
 * words (lib/api/validation.ts), not zod's ("Too big: expected string to
 * have <=1000 characters"). A schema's own message still wins.
 */
import { z } from 'zod'
import { fieldLabel, validationMessage } from '../validation'

const first = (schema: z.ZodType, value: unknown) => {
  const result = schema.safeParse(value)
  if (result.success) throw new Error('expected a problem')
  return validationMessage(result.error.issues)
}

test.each([
  [z.object({ message: z.string().max(1000) }), { message: 'x'.repeat(1001) }, 'Message is too long: 1000 characters at most.'],
  [z.object({ message: z.string().min(1) }), { message: '' }, "Message can't be empty."],
  [z.object({ password: z.string().min(8) }), { password: 'short' }, 'Password is too short: at least 8 characters.'],
  [z.object({ displayName: z.string() }), {}, 'Display name is missing.'],
  [z.object({ limit: z.number() }), { limit: 'ten' }, "Limit isn't the right kind of value."],
  [z.object({ limit: z.number().max(50) }), { limit: 51 }, 'Limit is too big: 50 at most.'],
  [z.object({ tags: z.array(z.string()).max(3) }), { tags: ['a', 'b', 'c', 'd'] }, 'Tags has too many: 3 at most.'],
  [z.object({ visibility: z.enum(['public', 'private']) }), { visibility: 'secret' }, "Visibility isn't one of the choices."],
  [z.object({ email: z.email() }), { email: 'nope' }, "Email doesn't look like an email address."],
  [z.object({ site_url: z.url() }), { site_url: 'nope' }, "Site url doesn't look like a web address."],
  [z.string().max(2), 'abc', 'That is too long: 2 characters at most.'],
])('%#: %j says %s', (schema, value, message) => {
  expect(first(schema, value)).toBe(message)
})

test("a schema's own words win", () => {
  expect(first(z.object({ title: z.string().max(80, 'Keep the title under 80 characters.') }), { title: 'x'.repeat(81) })).toBe('Keep the title under 80 characters.')
})

test('a field inside a list is named by the field', () => {
  expect(fieldLabel(['items', 3, 'altText'])).toBe('Alt text')
  expect(fieldLabel([])).toBe('That')
})
