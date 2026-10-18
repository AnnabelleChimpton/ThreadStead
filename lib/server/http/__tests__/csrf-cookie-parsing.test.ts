import type { NextApiRequest } from 'next'
import { getCsrfToken, validateCsrfToken } from '../csrf'

const TOKEN = 'a'.repeat(64)
const req = (cookie: string, header?: string) =>
  ({ method: 'POST', headers: { cookie, ...(header ? { 'x-csrf-token': header } : {}) } }) as unknown as NextApiRequest

describe('CSRF cookie parsing', () => {
  it('reads csrf_token by exact name, not a cookie that ends with it', () => {
    expect(getCsrfToken(req(`x_csrf_token=other; csrf_token=${TOKEN}`))).toBe(TOKEN)
    expect(getCsrfToken(req('x_csrf_token=other'))).toBeNull()
    expect(validateCsrfToken(req('x_csrf_token=other', 'other'))).toBe(false)
  })

  it('reads it at the start of the header or after other cookies', () => {
    expect(getCsrfToken(req(`csrf_token=${TOKEN}`))).toBe(TOKEN)
    expect(getCsrfToken(req(`session=s;csrf_token=${TOKEN}`))).toBe(TOKEN)
    expect(validateCsrfToken(req(`session=s; csrf_token=${TOKEN}`, TOKEN))).toBe(true)
  })

  it('rejects a malformed percent-encoded cookie instead of throwing', () => {
    expect(() => validateCsrfToken(req('csrf_token=%E0%A4%A', '%E0%A4%A'))).not.toThrow()
    expect(validateCsrfToken(req('csrf_token=%E0%A4%A', '%E0%A4%A'))).toBe(false)
  })
})
