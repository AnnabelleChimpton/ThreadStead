import { useState } from 'react'
import Link from 'next/link'
import Layout from '@/components/ui/layout/Layout'
import Button from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/ButtonLink'
import IndieList from '@/components/features/search/IndieList'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { csrfFetch } from '@/lib/api/client/csrf-fetch'
import { searchHref } from '@/lib/search/url-state'
import PageMeta from '@/components/ui/layout/PageMeta'
import { SITE_TITLE } from '@/lib/config/site/constants'

/**
 * /indie: the Indie Index's front door (SEARCH_PLAN.md §3.5). Add a site by
 * vouching for it, and see the sites waiting for one more resident.
 */
export default function IndieIndexPage() {
  return (
    <Layout>
      <PageMeta title="Indie Index" description={`Personal sites that people on ${SITE_TITLE} link to and vouch for, searchable by their latest posts.`} path="/indie" />

      <div className="max-w-3xl mx-auto space-y-6">
        <header className="thread-module p-4 sm:p-6">
          <h1 className="thread-headline text-2xl sm:text-3xl font-bold mb-3">Indie Index</h1>
          <p className="text-nb-ink mb-3">
            This is the list of personal sites that search looks through after it&apos;s done with everything here. A
            site gets in when people on HomePageAgain point at it, either because it&apos;s their own, or it&apos;s in
            their Websites list or on their home, or because they vouched for it. Your own site only needs you.
            Anybody else&apos;s needs two of us.
          </p>
          <p className="text-nb-ink mb-4">
            Every night a little bot reads each site&apos;s feed, so search finds their recent posts and not just the
            front page. There&apos;s also a big starting pool from Kagi&apos;s Small Web list, which ranks a bit below
            the sites you all picked.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={searchHref({ scope: 'indie' })} className={buttonClasses('secondary', 'sm')}>
              Browse the index
            </Link>
            <Link href="/indie/about" className={buttonClasses('secondary', 'sm')}>
              About the bot and opting out
            </Link>
          </div>
        </header>

        <AddSite />

        <section aria-labelledby="waiting-heading" className="thread-module p-3 sm:p-4">
          <h2 id="waiting-heading" className="thread-headline text-xl font-bold px-3 pt-1">
            Waiting for one more
          </h2>
          <p className="text-sm text-nb-ink-mid px-3 mb-1">
            Sites one resident points at, or that sites in the index link to. A vouch from you could be the one that
            lists them.
          </p>
          <IndieList view="candidates" empty="Nothing waiting right now." />
        </section>
      </div>
    </Layout>
  )
}

function AddSite() {
  const { loggedIn, loading } = useCurrentUser()
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const res = await csrfFetch('/api/indie/vouch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, note }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'That didn’t work. Try again.')
      const { listed, added, key, tier } = body.result as { listed: boolean; added: boolean; key: string; tier: string }
      setMessage({
        ok: true,
        text: tier === 'pool'
          ? `Vouched for ${key}. It’s in search already from the Kagi pool, and one more resident moves it up with the sites people here picked.`
          : listed
          ? `Vouched for ${key}. It’s in search.`
          : added
            ? `Added ${key}. It shows up in search once one more resident vouches for it or links to it.`
            : `Vouched for ${key}. It needs one more resident before it’s in search.`,
      })
      setUrl('')
      setNote('')
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'That didn’t work. Try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="add" aria-labelledby="add-heading" className="thread-module p-4 sm:p-6 scroll-mt-24">
      <h2 id="add-heading" className="thread-headline text-xl font-bold mb-1">
        Add a site
      </h2>
      {!loading && !loggedIn ? (
        <p className="text-nb-ink">
          <Link href="/login" className="underline underline-offset-2">
            Sign in
          </Link>{' '}
          to vouch for a site.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-nb-ink-mid">Paste the address of a personal site you like. Adding it is the same as vouching for it.</p>
          <div>
            <label htmlFor="indie-url" className="block text-sm font-semibold mb-1">
              Address
            </label>
            <input
              id="indie-url"
              type="text"
              inputMode="url"
              autoComplete="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://someones.site"
              className="w-full border-2 border-nb-ink-mid rounded-md bg-white p-2"
            />
          </div>
          <div>
            <label htmlFor="indie-note" className="block text-sm font-semibold mb-1">
              Why you like it <span className="font-normal text-nb-ink-mid">(optional)</span>
            </label>
            <textarea
              id="indie-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              rows={2}
              className="w-full border-2 border-nb-ink-mid rounded-md bg-white p-2 resize-none"
            />
          </div>
          <Button type="submit" disabled={busy || !url.trim()}>
            {busy ? 'Adding…' : 'Vouch for it'}
          </Button>
          {message && (
            <p role="status" className={`text-sm ${message.ok ? 'text-nb-ink' : 'text-red-700'}`}>
              {message.text}
            </p>
          )}
        </form>
      )}
    </section>
  )
}
