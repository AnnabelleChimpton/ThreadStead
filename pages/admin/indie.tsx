import { useCallback, useEffect, useState } from 'react'
import Head from 'next/head'
import type { GetServerSideProps } from 'next'
import Layout from '@/components/ui/layout/Layout'
import AdminHeader from '@/components/ui/navigation/AdminHeader'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner'
import { getSessionUser } from '@/lib/auth/server'
import { csrfFetch } from '@/lib/api/client/csrf-fetch'
import { useToast } from '@/contexts/ToastContext'
import { useConfirm } from '@/contexts/ConfirmContext'

/**
 * /admin/indie: the Indie Index for the admin (SEARCH_PLAN.md §3.5). The
 * nightly runs, how many sites are in each tier, the sites themselves with
 * hide/show, opt-outs, and the list of big platforms the index never takes.
 */

interface Run {
  id: string
  kind: string
  startedAt: string
  finishedAt: string | null
  fetched: number
  notModified: number
  failed: number
  itemsAdded: number
  error: string | null
}
interface SiteRow {
  id: string
  key: string
  url: string
  title: string | null
  tier: string
  status: string
  source: string
  residentSignals: number
  vouchCount: number
  failCount: number
  lastError: string | null
  lastPostAt: string | null
  feedUrl: string | null
}
interface Overview {
  runs: Run[]
  counts: Array<{ tier: string; status: string; n: number }>
  optOuts: Array<{ key: string; via: string; createdAt: string }>
  sites: SiteRow[]
  total: number
  nextOffset: number | null
}
interface Blocked {
  id: string
  domain: string
  category: string
}

const TIERS = ['resident', 'vouched', 'community', 'pool', 'candidate']
const STATUSES = ['active', 'stale', 'dead', 'hidden']
const cell = 'px-2 py-1 align-top'
const input = 'border-2 border-nb-ink-mid rounded-md bg-white p-1.5 text-sm'

function when(iso: string | null) {
  return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

function minutes(run: Run) {
  if (!run.finishedAt) return 'running'
  return `${Math.max(1, Math.round((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 60000))} min`
}

async function post(body: Record<string, unknown>) {
  const res = await csrfFetch('/api/admin/indie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)
  return json
}

export default function IndieAdminPage() {
  const { showError, showSuccess } = useToast()
  const confirm = useConfirm()
  const [data, setData] = useState<Overview | null>(null)
  const [filters, setFilters] = useState({ q: '', tier: '', status: '' })
  const [address, setAddress] = useState('')
  const [blocked, setBlocked] = useState<Blocked[]>([])
  const [newBlocked, setNewBlocked] = useState({ domain: '', category: 'platform' })

  const load = useCallback(async () => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v))
    const res = await fetch(`/api/admin/indie?${params}`)
    if (res.ok) setData(await res.json())
    else showError('The index didn’t load.')
  }, [filters, showError])

  const loadBlocked = useCallback(async () => {
    const res = await fetch('/api/admin/blocked-sites')
    if (res.ok) setBlocked((await res.json()).sites)
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    loadBlocked()
  }, [loadBlocked])

  const act = async (body: Record<string, unknown>, done: string) => {
    try {
      await post(body)
      showSuccess(done)
      await load()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'That didn’t work.')
    }
  }

  const optOut = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address.trim()) return
    const ok = await confirm({
      title: `Opt out ${address.trim()}?`,
      message: 'It comes out of the index with its posts, and nothing adds it back until you let it in again.',
      confirmText: 'Opt out',
      variant: 'danger',
    })
    if (!ok) return
    await act({ action: 'opt-out', address }, 'Opted out.')
    setAddress('')
  }

  const addBlocked = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await csrfFetch('/api/admin/blocked-sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBlocked),
    })
    if (res.ok) {
      setNewBlocked({ domain: '', category: newBlocked.category })
      loadBlocked()
    } else showError((await res.json().catch(() => ({})))?.error || 'That didn’t work.')
  }

  const removeBlocked = async (b: Blocked) => {
    const res = await csrfFetch(`/api/admin/blocked-sites/${b.id}`, { method: 'DELETE' })
    if (res.ok) loadBlocked()
    else showError('That didn’t work.')
  }

  const countFor = (tier: string, status: string) => data?.counts.find((c) => c.tier === tier && c.status === status)?.n ?? 0

  return (
    <Layout>
      <Head>
        <title>Indie Index | Admin</title>
      </Head>
      <AdminHeader current="index">
        <p>Sites in the index, the nightly runs, and opt-outs. The job runs as the pm2 process threadstead-index.</p>
      </AdminHeader>

      {!data ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          <section className="thread-module p-4 overflow-x-auto">
            <h2 className="thread-headline text-xl font-bold mb-2">Runs</h2>
            {data.runs.length === 0 ? (
              <p className="text-nb-ink-mid">No runs yet. Start the job with: pm2 start ecosystem.indie-index.config.cjs</p>
            ) : (
              <table className="text-sm w-full">
                <thead>
                  <tr className="text-left text-nb-ink-mid">
                    {['Run', 'Started', 'Took', 'Requests', 'Unchanged', 'Failed', 'New posts', 'Error'].map((h) => (
                      <th key={h} className={cell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.runs.map((r) => (
                    <tr key={r.id} className="border-t border-dotted border-nb-ink-mid/40">
                      <td className={cell}>{r.kind === 'kagi_import' ? 'Kagi import' : 'Nightly'}</td>
                      <td className={cell}>{when(r.startedAt)}</td>
                      <td className={cell}>{minutes(r)}</td>
                      <td className={cell}>{r.fetched}</td>
                      <td className={cell}>{r.notModified}</td>
                      <td className={cell}>{r.failed}</td>
                      <td className={cell}>{r.itemsAdded}</td>
                      <td className={`${cell} text-red-700 break-words max-w-xs`}>{r.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="thread-module p-4 overflow-x-auto">
            <h2 className="thread-headline text-xl font-bold mb-2">Sites by tier</h2>
            <table className="text-sm">
              <thead>
                <tr className="text-left text-nb-ink-mid">
                  <th className={cell}>Tier</th>
                  {STATUSES.map((s) => (
                    <th key={s} className={cell}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t) => (
                  <tr key={t} className="border-t border-dotted border-nb-ink-mid/40">
                    <td className={`${cell} font-semibold`}>{t}</td>
                    {STATUSES.map((s) => (
                      <td key={s} className={`${cell} tabular-nums`}>{countFor(t, s).toLocaleString()}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="thread-module p-4 overflow-x-auto">
            <h2 className="thread-headline text-xl font-bold mb-2">Sites</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              <input
                aria-label="Address contains"
                placeholder="Address contains…"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                className={input}
              />
              <select aria-label="Tier" value={filters.tier} onChange={(e) => setFilters({ ...filters, tier: e.target.value })} className={input}>
                <option value="">Any tier</option>
                {TIERS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <select aria-label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className={input}>
                <option value="">Any status</option>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <span className="text-sm text-nb-ink-mid self-center">{data.total.toLocaleString()} sites</span>
            </div>
            <table className="text-sm w-full">
              <thead>
                <tr className="text-left text-nb-ink-mid">
                  {['Site', 'Tier', 'Status', 'Residents', 'Vouches', 'Last post', 'Problem', ''].map((h) => (
                    <th key={h} className={cell}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sites.map((s) => (
                  <tr key={s.id} className="border-t border-dotted border-nb-ink-mid/40">
                    <td className={`${cell} break-all`}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{s.key}</a>
                      {s.title && <span className="block text-nb-ink-mid">{s.title}</span>}
                    </td>
                    <td className={cell}>{s.tier}</td>
                    <td className={cell}>{s.status}</td>
                    <td className={`${cell} tabular-nums`}>{s.residentSignals}</td>
                    <td className={`${cell} tabular-nums`}>{s.vouchCount}</td>
                    <td className={cell}>{s.lastPostAt ? new Date(s.lastPostAt).toLocaleDateString() : '—'}</td>
                    <td className={`${cell} text-nb-ink-mid break-words max-w-xs`}>
                      {s.failCount > 0 ? `${s.failCount}× ${s.lastError ?? ''}` : s.feedUrl ? '' : 'no feed'}
                    </td>
                    <td className={cell}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => act({ action: s.status === 'hidden' ? 'show' : 'hide', siteId: s.id }, s.status === 'hidden' ? 'Shown.' : 'Hidden.')}
                      >
                        {s.status === 'hidden' ? 'Show' : 'Hide'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="thread-module p-4">
            <h2 className="thread-headline text-xl font-bold mb-1">Opt-outs</h2>
            <p className="text-sm text-nb-ink-mid mb-2">
              Sites that said no (robots.txt, a noindex tag, their owner, or you). Nothing adds them back while they&apos;re here.
            </p>
            <form onSubmit={optOut} className="flex flex-wrap gap-2 mb-3">
              <input aria-label="Address to opt out" placeholder="someones.site" value={address} onChange={(e) => setAddress(e.target.value)} className={input} />
              <Button type="submit" size="sm" variant="danger" disabled={!address.trim()}>Opt out</Button>
            </form>
            {data.optOuts.length === 0 ? (
              <p className="text-nb-ink-mid text-sm">None yet.</p>
            ) : (
              <ul className="text-sm divide-y divide-dotted divide-nb-ink-mid/40" style={{ paddingLeft: 0, listStyle: 'none' }}>
                {data.optOuts.map((o) => (
                  <li key={o.key} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="break-all">
                      {o.key} <span className="text-nb-ink-mid">· {o.via} · {new Date(o.createdAt).toLocaleDateString()}</span>
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => act({ action: 'lift-opt-out', key: o.key }, 'Let back in.')}>
                      Let back in
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="thread-module p-4">
            <h2 className="thread-headline text-xl font-bold mb-1">Big platforms</h2>
            <p className="text-sm text-nb-ink-mid mb-2">
              Domains the index never takes, subdomains included, however many residents link to them.
            </p>
            <form onSubmit={addBlocked} className="flex flex-wrap gap-2 mb-3">
              <input aria-label="Domain" placeholder="example.com" value={newBlocked.domain} onChange={(e) => setNewBlocked({ ...newBlocked, domain: e.target.value })} className={input} />
              <input aria-label="Category" placeholder="category" value={newBlocked.category} onChange={(e) => setNewBlocked({ ...newBlocked, category: e.target.value })} className={input} />
              <Button type="submit" size="sm" disabled={!newBlocked.domain.trim() || !newBlocked.category.trim()}>Add</Button>
            </form>
            <ul className="text-sm flex flex-wrap gap-2" style={{ paddingLeft: 0, listStyle: 'none' }}>
              {blocked.map((b) => (
                <li key={b.id} className="inline-flex items-center gap-1 border border-nb-ink-mid/40 rounded-md pl-2">
                  <span>{b.domain}</span>
                  <span className="text-nb-ink-mid">({b.category})</span>
                  <button type="button" onClick={() => removeBlocked(b)} className="px-2 py-0.5 text-nb-ink-mid hover:text-nb-ink" aria-label={`Remove ${b.domain}`}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = await getSessionUser(context.req as never)
  if (!user || user.role !== 'admin') return { redirect: { destination: '/', permanent: false } }
  return { props: {} }
}
