/* eslint-disable @typescript-eslint/no-explicit-any -- handler stubs */
/**
 * A page at the caps saves through the real save route and renders for a
 * visitor, against a real Postgres: HTML and CSS both at 500 KB, 25,000
 * tags, and nesting all the way to the depth cap (pages nested past ~57
 * failed to save until the stored copy became text; perf plan step 7).
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/lib/config/database/connection'
import { SITE_NAME } from '@/lib/config/site/constants'

jest.mock('@/lib/auth/server', () => ({ ...jest.requireActual('@/lib/auth/server'), getSessionUser: jest.fn() }))
jest.mock('@/lib/server/http/rate-limit', () => ({ rateLimitCheck: jest.fn(async () => true) }))
jest.mock('@/lib/server/http/csrf', () => ({ csrfProtection: jest.fn(async () => true) }))
jest.mock('@noble/ed25519', () => ({ getPublicKey: jest.fn(), getPublicKeyAsync: jest.fn(), sign: jest.fn(), verify: jest.fn(), utils: {}, etc: {} }))

import templateHandler from '@/pages/api/profile/[username]/template'
import { getSessionUser } from '@/lib/auth/server'
import { loadResidentPage } from '@/lib/domain/profile/load-resident-page'
import { MAX_CSS_CHARS, MAX_TEMPLATE_CHARS } from '@/lib/templates/limits'
import { TEMPLATE_LIMITS } from '@/lib/templates/compilation/template-limits'

const pat = { id: 'u_pat', primaryHandle: `pat@${SITE_NAME}` }

async function save(template: string, customCSS?: string) {
  ;(getSessionUser as jest.Mock).mockResolvedValue(pat)
  const req = { method: 'POST', body: { template, customCSS }, query: { username: 'pat' }, headers: {}, cookies: {} } as unknown as NextApiRequest
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this },
    json(payload: any) { this.body = payload; return this },
    setHeader: jest.fn(),
  }
  await templateHandler(req, res as NextApiResponse)
  expect({ status: res.statusCode, errors: res.body?.errors }).toEqual({ status: 200, errors: undefined })
}

/** What a signed-out visitor gets: the page's HTML */
async function visitorHtml() {
  const lookup = await loadResidentPage('pat', null)
  if (lookup.status !== 'ok') throw new Error(lookup.status)
  const { page } = lookup.resident
  return page?.html ?? JSON.stringify(page?.tree)
}

beforeAll(async () => {
  await db.$executeRawUnsafe('TRUNCATE "User" RESTART IDENTITY CASCADE')
  await db.user.create({
    data: {
      id: pat.id,
      did: 'did:test:pat',
      primaryHandle: pat.primaryHandle,
      handles: { create: { handle: 'pat', host: SITE_NAME } },
      profile: { create: { displayName: 'pat', visibility: 'public', templateMode: 'advanced' } },
    },
  })
})
afterAll(() => db.$disconnect())

test('500 KB of HTML and 500 KB of CSS', async () => {
  const row = '<li><a href="https://example.neocities.org/">A small site I like a lot</a> and a few words about it</li>\n'
  const template = `<ul>\n${row.repeat(Math.floor((MAX_TEMPLATE_CHARS - 20) / row.length))}</ul><p>the end</p>`
  const rule = '.links li:nth-child(3n) a { color: #6b8e23; text-decoration: underline wavy; }\n'
  const css = rule.repeat(Math.floor(MAX_CSS_CHARS / rule.length))
  expect(template.length).toBeGreaterThan(MAX_TEMPLATE_CHARS * 0.99)
  await save(template, css)
  const stored = await db.profile.findUnique({ where: { userId: pat.id }, select: { customCSS: true, pageArtifact: true } })
  expect(stored?.customCSS?.length).toBeGreaterThan(MAX_CSS_CHARS * 0.99)
  expect(stored?.pageArtifact).toBeTruthy()
  expect(await visitorHtml()).toContain('the end')
})

test('25,000 tags', async () => {
  const template = '<b>x</b>'.repeat(TEMPLATE_LIMITS.maxElements - 1) + '<i>last</i>'
  await save(template)
  expect(await visitorHtml()).toContain('<i>last</i>')
})

test('nested all the way to the depth cap', async () => {
  const levels = TEMPLATE_LIMITS.maxDepth
  await save(`${'<div>'.repeat(levels)}deepest${'</div>'.repeat(levels)}`)
  const html = await visitorHtml()
  expect(html).toContain('deepest')
  expect(html.split('<div>').length - 1).toBe(levels)
})
