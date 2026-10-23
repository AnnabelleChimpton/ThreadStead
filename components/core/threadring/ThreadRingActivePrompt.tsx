import { useEffect, useState } from 'react'
import Link from 'next/link'
import ButtonLink from '@/components/ui/ButtonLink'
import { PixelIcon } from '@/components/ui/PixelIcon'

/** A prompt, as /api/threadrings/[slug]/prompts lists it. */
export interface RingPrompt {
  id: string
  title: string
  description: string
  startsAt: string
  endsAt: string | null
  isActive: boolean
  responseCount: number
  createdBy?: { profile: { displayName: string | null } | null }
}

const shortDate = (iso: string, withYear = false) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) })

export const responsesLabel = (count: number) => `${count} ${count === 1 ? 'response' : 'responses'}`

/** Where a member answers a prompt: the composer, with the prompt and ring filled in. */
export function respondHref(slug: string, prompt: Pick<RingPrompt, 'id' | 'title'>) {
  return `/post/new?promptId=${encodeURIComponent(prompt.id)}&threadRing=${encodeURIComponent(slug)}&promptTitle=${encodeURIComponent(prompt.title)}`
}

/** "Prompt from Cat", or just "Prompt" when its author isn't someone here. */
export function promptFrom(prompt: RingPrompt) {
  const name = prompt.createdBy?.profile?.displayName
  return name ? `Prompt from ${name}` : 'Prompt'
}

export function promptDates(prompt: RingPrompt) {
  return prompt.endsAt ? `${shortDate(prompt.startsAt)} to ${shortDate(prompt.endsAt, true)}` : `Since ${shortDate(prompt.startsAt, true)}`
}

/**
 * The ring's current prompt, as a card at the top of its posts: who asked,
 * what, until when, and a way to answer for members. Prompts are optional,
 * so a ring without one, or a read that fails, shows nothing.
 */
export default function ThreadRingActivePrompt({ threadRingSlug, isMember = false }: { threadRingSlug: string; isMember?: boolean }) {
  const [prompt, setPrompt] = useState<RingPrompt | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/threadrings/${encodeURIComponent(threadRingSlug)}/prompts`)
      .then((response) => (response.ok ? response.json() : []))
      .then((prompts) => {
        if (!cancelled && Array.isArray(prompts)) setPrompt(prompts.find((p: RingPrompt) => p.isActive) ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [threadRingSlug])

  if (!prompt) return null
  const ended = !!prompt.endsAt && new Date(prompt.endsAt) < new Date()
  const responses = `/tr/${encodeURIComponent(threadRingSlug)}/prompts/${encodeURIComponent(prompt.id)}/responses`

  return (
    <section className="tr-active-prompt thread-module p-5 sm:p-6 !mt-0 !mb-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="thread-label !text-[color:var(--ring-accent)] !max-w-none">{promptFrom(prompt)}</span>
        {prompt.endsAt && <span className="text-sm text-nb-ink-mid">{ended ? 'Ended' : `Until ${shortDate(prompt.endsAt)}`}</span>}
      </div>
      <h2 className="thread-headline text-xl sm:text-2xl font-bold !text-nb-ink mt-2 mb-1">{prompt.title}</h2>
      <p className="text-nb-ink m-0 whitespace-pre-wrap">{prompt.description}</p>
      {((isMember && !ended) || prompt.responseCount > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
          {isMember && !ended && (
            <ButtonLink href={respondHref(threadRingSlug, prompt)} variant="secondary" size="sm">
              <PixelIcon name="edit" size={14} className="inline-block align-[-2px] mr-1" />Write a response
            </ButtonLink>
          )}
          {prompt.responseCount > 0 && (
            <Link href={responses} className="text-sm text-nb-ink">{responsesLabel(prompt.responseCount)}</Link>
          )}
        </div>
      )}
    </section>
  )
}
