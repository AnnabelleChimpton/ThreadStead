/**
 * Shared by the SSR golden test: the corpus, the resident data every page is
 * rendered with, and a DOM serializer that ignores what can't matter to a
 * visitor (comments, attribute order, style text formatting, useId values).
 */
import fs from 'fs'
import path from 'path'
import {
  TEMPLATE_EXAMPLES,
  generateDefaultProfileTemplate,
  getMinimalProfileTemplate,
  getFullProfileTemplate,
} from '@/lib/templates/default-profile-template'
import { HTML_TEMPLATES } from '@/lib/templates/default-html-templates'
import type { ResidentData } from '@/components/features/templates/ResidentDataProvider'
import React from 'react'
import { GlobalAudioProvider } from '@/contexts/GlobalAudioContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { ConfirmProvider } from '@/contexts/ConfirmContext'
import { ChatProvider } from '@/contexts/ChatContext'
import { ConversationsProvider } from '@/contexts/ConversationsContext'

/** The providers _app.tsx puts around every page */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GlobalAudioProvider>
      <ToastProvider>
        <ConfirmProvider>
          <ChatProvider>
            <ConversationsProvider>{children}</ConversationsProvider>
          </ChatProvider>
        </ConfirmProvider>
      </ToastProvider>
    </GlobalAudioProvider>
  )
}

export const GOLDEN_DIR = path.join(__dirname, 'ssr-golden')
const PASTED_DIR = path.join(__dirname, 'corpus')

/** Every starter, the generated defaults, and the pasted-page corpus */
export function corpus(): Array<[string, string]> {
  return [
    ...Object.entries(TEMPLATE_EXAMPLES).map(([id, t]) => [`example-${id}`, t.template] as [string, string]),
    ['generated-default', generateDefaultProfileTemplate().template],
    ['generated-minimal', getMinimalProfileTemplate().template],
    ['generated-full', getFullProfileTemplate().template],
    ...HTML_TEMPLATES.map((t) => [`html-${t.id}`, t.template] as [string, string]),
    ...fs
      .readdirSync(PASTED_DIR)
      .filter((f) => f.endsWith('.html'))
      .map((f) => [`pasted-${f.replace(/\.html$/, '')}`, fs.readFileSync(path.join(PASTED_DIR, f), 'utf8')] as [string, string]),
  ]
}

export const OWNER_ID = 'u_owner'

export function residentData(viewerId: string | null): ResidentData {
  return {
    owner: { id: OWNER_ID, handle: 'pat', displayName: 'Pat Example', avatarUrl: '/assets/default-avatar.gif' },
    viewer: { id: viewerId, isFriend: false, isFollowing: false, isFollower: false },
    posts: [
      { id: 'p1', bodyHtml: '<p>First post</p>', createdAt: '2026-10-01T12:00:00.000Z' },
      { id: 'p2', bodyHtml: '<p>Second <em>post</em></p>', createdAt: '2026-10-02T12:00:00.000Z' },
    ],
    guestbook: [
      { id: 'g1', message: 'Lovely page!', authorUsername: 'sam', createdAt: '2026-10-03T12:00:00.000Z' },
    ],
    images: [],
    capabilities: { bio: 'I make small websites.' },
    featuredFriends: [],
    websites: [{ id: 'w1', label: 'My blog', url: 'https://example.com', blurb: 'Words' }],
  } as unknown as ResidentData
}

/** A readable, order-stable serialization of a DOM subtree */
export function serializeDom(root: Element): string {
  const lines: string[] = []
  const walk = (node: Node, depth: number) => {
    const pad = '  '.repeat(depth)
    if (node.nodeType === 3) {
      const text = maskIds(node.textContent ?? '').replace(/\s+/g, ' ')
      if (text.trim()) lines.push(`${pad}"${text}"`)
      else if (text) lines.push(`${pad}" "`)
      return
    }
    if (node.nodeType !== 1) return // comments (Suspense markers) and the rest
    const el = node as HTMLElement
    const attrs = Array.from(el.attributes)
      .map((a) => {
        let value = a.value
        if (a.name === 'style') value = el.style.cssText
        value = maskIds(value)
        return `${a.name}="${value}"`
      })
      .sort()
    lines.push(`${pad}<${el.localName}${attrs.length ? ' ' + attrs.join(' ') : ''}>`)
    el.childNodes.forEach((child) => walk(child, depth + 1))
  }
  // Comments (Suspense markers) go; adjacent text is one run of text to a
  // reader, however React split it
  const clean = root.cloneNode(true) as Element
  stripComments(clean)
  clean.normalize()
  clean.childNodes.forEach((child) => walk(child, 0))
  return lines.join('\n') + '\n'
}

function stripComments(node: Node) {
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === 8) node.removeChild(child)
    else stripComments(child)
  })
}

/** Island ids are random per compile; useId values depend on the render */
function maskIds(value: string): string {
  return value
    .replace(/island-[a-z0-9]+-[a-z0-9]{6}(?![a-z0-9-])/g, '<island>')
    .replace(/«[^»]*»|:r[0-9a-z]+:|_R_[0-9A-Za-z]+_/g, '<useId>')
}

/** Browser APIs jsdom doesn't have, as no-ops (components use them in effects) */
export function installBrowserStubs() {
  const g = globalThis as unknown as Record<string, unknown>
  if (!g.IntersectionObserver) {
    g.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
  }
}
