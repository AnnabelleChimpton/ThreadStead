import { useEffect, useState, type CSSProperties } from 'react'
import { GetServerSideProps } from 'next'
import Link from 'next/link'
import Layout from '@/components/ui/layout/Layout'
import PageMeta from '@/components/ui/layout/PageMeta'
import ButtonLink from '@/components/ui/ButtonLink'
import Button from '@/components/ui/Button'
import { PixelIcon } from '@/components/ui/PixelIcon'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'
import EmptyState from '@/components/ui/feedback/EmptyState'
import ErrorDisplay from '@/components/ui/feedback/ErrorDisplay'
import PostItem, { type Post } from '@/components/core/content/PostItem'
import {
  promptDates,
  promptFrom,
  respondHref,
  responsesLabel,
  type RingPrompt,
} from '@/components/core/threadring/ThreadRingActivePrompt'
import { useRingViewer } from '@/components/core/threadring/useRingViewer'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getSiteConfig, SiteConfig } from '@/lib/config/site/dynamic'
import { getSessionUser } from '@/lib/auth/server'
import { loadRingForPage, type RingPageRing } from '@/lib/rings/page-data'
import { ringAccentHex } from '@/lib/rings/theme'

const PAGE_SIZE = 20

/** A response as /api/threadrings/[slug]/prompts/[promptId]/responses gives it. */
interface PromptResponse {
  id: string
  post: {
    id: string
    title: string | null
    bodyText: string | null
    bodyHtml: string | null
    bodyMarkdown: string | null
    createdAt: string
    url: string | null
    author: { id: string; handles: Array<{ handle: string }>; profile: { displayName: string | null; avatarUrl: string | null } | null }
  }
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * A response as the ring feed's post card shows it. Our own public posts come
 * whole, with their author; anything else is the title and preview the ring
 * was sent, linked to where it lives, and names nobody here.
 */
function asPost({ id, post }: PromptResponse): Post {
  const handle = post.author.handles[0]?.handle
  if (handle) {
    return {
      id: post.id,
      title: post.title,
      createdAt: post.createdAt,
      bodyText: post.bodyText,
      bodyHtml: post.bodyHtml,
      bodyMarkdown: post.bodyMarkdown,
      visibility: 'public',
      author: { id: post.author.id, primaryHandle: handle, profile: { displayName: post.author.profile?.displayName ?? undefined, avatarUrl: post.author.profile?.avatarUrl } },
    }
  }
  const preview = post.bodyText ? `<p>${escapeHtml(post.bodyText)}</p>` : ''
  const away = post.url ? `<p><a href="${escapeHtml(post.url)}" rel="ugc noopener" target="_blank">Read it where it lives</a></p>` : ''
  return {
    id: `response-${id}`,
    title: post.title,
    createdAt: post.createdAt,
    bodyHtml: preview + away,
    visibility: 'public',
    author: { id: 'external', profile: { displayName: post.author.profile?.displayName || 'Someone' } },
  }
}

interface PromptResponsesPageProps {
  siteConfig: SiteConfig
  ring: RingPageRing | null
  promptId: string
  unavailable?: 'not-found' | 'slow' | null
}

function Responses({ siteConfig, ring, promptId }: { siteConfig: SiteConfig; ring: RingPageRing; promptId: string }) {
  const { user } = useCurrentUser()
  const viewer = useRingViewer(ring, user)
  const [prompt, setPrompt] = useState<RingPrompt | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'failed'>('loading')
  const [responses, setResponses] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const slug = encodeURIComponent(ring.slug)
  const responsesUrl = `/api/threadrings/${slug}/prompts/${encodeURIComponent(promptId)}/responses`

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`/api/threadrings/${slug}/prompts?includeInactive=true`).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch(`${responsesUrl}?page=1&limit=${PAGE_SIZE}`).then((r) => (r.ok ? r.json() : r.status === 404 ? { responses: [] } : Promise.reject())),
    ])
      .then(([prompts, data]) => {
        if (cancelled) return
        const found = Array.isArray(prompts) ? prompts.find((p: RingPrompt) => p.id === promptId) : null
        if (!found) return setState('missing')
        setPrompt(found)
        setResponses((data.responses || []).map(asPost))
        setTotal(data.pagination?.totalCount ?? 0)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('failed')
      })
    return () => {
      cancelled = true
    }
  }, [slug, promptId, responsesUrl])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const response = await fetch(`${responsesUrl}?page=${Math.floor(responses.length / PAGE_SIZE) + 1}&limit=${PAGE_SIZE}`)
      if (response.ok) {
        const data = await response.json()
        setResponses((shown) => [...shown, ...(data.responses || []).map(asPost)])
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const ended = !!prompt?.endsAt && new Date(prompt.endsAt) < new Date()

  return (
    <Layout siteConfig={siteConfig}>
      <PageMeta
        title={prompt ? `${prompt.title}: answers in ${ring.name}` : ring.name}
        description={prompt?.description}
        path={`/tr/${ring.slug}/prompts/${promptId}/responses`}
        noIndex={ring.visibility !== 'public'}
      />
      <div className="max-w-3xl mx-auto" style={{ '--ring-accent': ringAccentHex(ring.themeColor, ring.slug) } as CSSProperties}>
        <section className="thread-module p-5 sm:p-6 !mt-0 !mb-6 !border-t-4 !border-t-[color:var(--ring-accent)]">
          <Link href={`/tr/${slug}`} className="text-sm text-nb-ink-mid">← {ring.name}</Link>
          {state === 'loading' ? (
            <LoadingSpinner message="Loading the prompt..." className="py-6" />
          ) : state === 'missing' ? (
            <ErrorDisplay variant="notice" title="That prompt isn't here any more." className="mt-3" />
          ) : state === 'failed' || !prompt ? (
            <ErrorDisplay title="Couldn't load this prompt. Try again in a minute." className="mt-3" />
          ) : (
            <>
              <div className="mt-3">
                <span className="thread-label !text-[color:var(--ring-accent)] !max-w-none">{promptFrom(prompt)}</span>
              </div>
              <h1 className="thread-headline text-2xl sm:text-3xl font-bold !text-nb-ink mt-2 mb-2">{prompt.title}</h1>
              <p className="text-lg text-nb-ink m-0 whitespace-pre-wrap">{prompt.description}</p>
              <p className="text-sm text-nb-ink-mid mt-3 mb-0">
                {ended ? 'Ended' : promptDates(prompt)}
                <span aria-hidden="true" className="px-1.5">·</span>
                {responsesLabel(total)}
              </p>
              {viewer.isMember && !ended && (
                <div className="mt-4">
                  <ButtonLink href={respondHref(ring.slug, prompt)} className="w-full sm:w-auto text-center">
                    <PixelIcon name="edit" size={16} className="inline-block align-[-3px] mr-1.5" />Write a response
                  </ButtonLink>
                </div>
              )}
            </>
          )}
        </section>

        {state === 'ready' && (
          responses.length === 0 ? (
            <EmptyState variant="plain" className="py-8 px-3" title="No responses yet" />
          ) : (
            <>
              {responses.map((post) => (
                <PostItem
                  key={post.id}
                  post={post}
                  isOwner={!!user && user.id === post.author?.id}
                  currentUser={user}
                  threadRingContext={{ slug: ring.slug, name: ring.name }}
                  viewContext="ring"
                />
              ))}
              {responses.length < total && (
                <div className="text-center">
                  <Button variant="secondary" size="sm" className="px-6" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading...' : 'Load more'}
                  </Button>
                </div>
              )}
            </>
          )
        )}
      </div>
    </Layout>
  )
}

export default function PromptResponsesPage({ siteConfig, ring, promptId, unavailable = null }: PromptResponsesPageProps) {
  if (!ring) {
    const slow = unavailable === 'slow'
    return (
      <>
        <PageMeta title={slow ? 'Ring Hub is slow' : 'Ring not found'} noIndex />
        <Layout siteConfig={siteConfig}>
          <div className="max-w-2xl mx-auto py-8 px-4">
            {slow ? (
              <ErrorDisplay variant="notice" title="Ring Hub is slow right now" message="Rings live on Ring Hub, and it didn't answer in time. Try again in a minute." />
            ) : (
              <ErrorDisplay title="Ring not found" actionLabel="Browse rings" actionHref="/threadrings" />
            )}
          </div>
        </Layout>
      </>
    )
  }
  return <Responses key={`${ring.slug}/${promptId}`} siteConfig={siteConfig} ring={ring} promptId={promptId} />
}

export const getServerSideProps: GetServerSideProps<PromptResponsesPageProps> = async (context) => {
  const { slug, promptId } = context.params as { slug: string; promptId: string }
  const siteConfig = await getSiteConfig()
  // As the viewer, so a private ring's members see it; never the local mirror
  const viewer = await getSessionUser(context.req as any).catch(() => null)
  const load = await loadRingForPage(slug, viewer?.id ?? null)
  if (load.status !== 'ok') {
    context.res.statusCode = load.status === 'slow' ? 503 : 404
    return { props: { siteConfig, ring: null, promptId, unavailable: load.status } }
  }
  // Next can't send undefined
  const ring = JSON.parse(JSON.stringify(load.ring, (_key, value) => (value === undefined ? null : value)))
  return { props: { siteConfig, ring, promptId } }
}
