/**
 * The email check is quick whatever it's sent: the old pattern backtracked
 * quadratically, and a 1 MB body held the server for minutes (email-login
 * takes it signed out).
 */
import { looksLikeEmail, EMAIL_MAX_LENGTH } from '../email'

test.each([
  ['pat@example.com', true],
  ['p.a.t+tag@mail.example.co.uk', true],
  ['a@b', false],
  ['a@b..c', false],
  ['a@.c', false],
  ['a b@c.d', false],
  ['@c.d', false],
  ['pat@example.com ', false],
])('%s → %s', (text, expected) => {
  expect(looksLikeEmail(text)).toBe(expected)
})

test('not a string is no address', () => {
  expect(looksLikeEmail(['pat@example.com'])).toBe(false)
  expect(looksLikeEmail({ toString: () => 'pat@example.com' })).toBe(false)
})

test('longer than an address can be is refused', () => {
  expect(looksLikeEmail(`${'a'.repeat(EMAIL_MAX_LENGTH)}@b.co`)).toBe(false)
})

test('a long string built to backtrack is answered at once', () => {
  const pattern = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/
  const nasty = `a@${'a.'.repeat(500_000)} `
  const started = Date.now()
  expect(pattern.test(nasty)).toBe(false)
  expect(looksLikeEmail(nasty)).toBe(false)
  expect(Date.now() - started).toBeLessThan(500)
})
