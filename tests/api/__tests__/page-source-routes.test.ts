/**
 * @jest-environment node
 *
 * Every route that takes a page's source accepts a body big enough for HTML
 * and CSS at their caps (PAGE_SOURCE_BODY_LIMIT). Next's default is 1 MB, and
 * a page over it got Next's own 413 with no message the editor could show.
 */
jest.mock('@/lib/config/database/connection', () => ({ db: {} }))

import { MAX_CSS_CHARS, MAX_TEMPLATE_CHARS, PAGE_SOURCE_BODY_LIMIT } from '@/lib/templates/limits'
import * as templateRoute from '@/pages/api/profile/[username]/template'
import * as cssRoute from '@/pages/api/profile/[username]/css'
import * as compileRoute from '@/pages/api/templates/compile'
import * as updateRoute from '@/pages/api/profile/update'

const megabytes = (limit: string) => Number(/^(\d+)mb$/.exec(limit)![1]) * 1024 * 1024

test('the limit fits HTML and CSS at the cap, three bytes a character, with room for the JSON', () => {
  expect((MAX_TEMPLATE_CHARS + MAX_CSS_CHARS) * 3 * 1.1).toBeLessThan(megabytes(PAGE_SOURCE_BODY_LIMIT))
})

test.each([
  ['template save', templateRoute],
  ['CSS save', cssRoute],
  ['compile', compileRoute],
  ['profile update', updateRoute],
])('%s accepts it', (_name, route) => {
  expect((route as { config?: unknown }).config).toEqual({ api: { bodyParser: { sizeLimit: PAGE_SOURCE_BODY_LIMIT } } })
})
