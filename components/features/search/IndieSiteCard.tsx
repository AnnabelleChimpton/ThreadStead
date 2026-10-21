import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { PixelIcon } from '@/components/ui/PixelIcon'
import { csrfFetch } from '@/lib/api/client/csrf-fetch'
import { useToast } from '@/contexts/ToastContext'
import { useConfirm } from '@/contexts/ConfirmContext'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { IndieSite } from '@/lib/search/indie'
import { BLURB, META, TITLE, shortDate } from './ResultCards'
import { LIST_RESET } from './ResultGroup'

/**
 * One Indie Index site (SEARCH_PLAN.md §3.5): its 88×31 button when someone
 * here has one up, who vouches for it, its newest or matching posts, and a
 * Vouch button for residents. The site and its posts open in a new tab.
 */

function plural(n: number, word: string) {
  return `${n} ${n === 1 ? word : `${word}s`}`
}

/** The plain line under the title: why this site is in the index. */
export function trustLine(site: Pick<IndieSite, 'tier' | 'owner' | 'vouchCount' | 'residentSignals'>): React.ReactNode {
  switch (site.tier) {
    case 'resident':
      return site.owner ? (
        <>
          <Link href={`/resident/${site.owner.handle}`} className="underline underline-offset-2">
            {site.owner.name}
          </Link>
          ’s site
        </>
      ) : (
        'A resident’s site'
      )
    case 'vouched':
      return `Vouched for by ${plural(site.vouchCount, 'resident')}`
    case 'community':
      return site.residentSignals >= 2 ? `Linked by ${plural(site.residentSignals, 'resident')}` : 'Picked by a resident'
    case 'pool':
      return 'From Kagi Small Web'
    default:
      return site.residentSignals + site.vouchCount > 0 ? 'Needs one more resident' : 'Linked from sites in the index'
  }
}

export function VouchButton({ site, onChange }: { site: Pick<IndieSite, 'id' | 'vouched'>; onChange?: (vouched: boolean) => void }) {
  const [vouched, setVouched] = useState(site.vouched)
  const [busy, setBusy] = useState(false)
  const { showError } = useToast()

  const toggle = async () => {
    setBusy(true)
    try {
      const res = await csrfFetch('/api/indie/vouch', {
        method: vouched ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: site.id }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'That didn’t work. Try again.')
      setVouched(!vouched)
      onChange?.(!vouched)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'That didn’t work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={toggle}
      disabled={busy}
      aria-pressed={vouched}
      title={vouched ? 'Take your vouch back' : 'Say this site belongs in the index'}
      className="shrink-0 whitespace-nowrap"
    >
      {vouched ? <><PixelIcon name="check" size={12} className="inline-block align-[-1px] mr-1" />Vouched</> : 'Vouch'}
    </Button>
  )
}

/** The resident whose site it is can take it out of the index for good. */
function RemoveMySite({ site, onRemoved }: { site: Pick<IndieSite, 'id' | 'title'>; onRemoved: () => void }) {
  const confirm = useConfirm()
  const { showError } = useToast()
  const remove = async () => {
    const ok = await confirm({
      title: 'Take your site out of the index?',
      message: 'It comes out of search, and the index won’t add it back even if people link to it.',
      confirmText: 'Take it out',
      variant: 'danger',
    })
    if (!ok) return
    const res = await csrfFetch('/api/indie/opt-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId: site.id }),
    })
    if (res.ok) onRemoved()
    else showError((await res.json().catch(() => ({})))?.error || 'That didn’t work. Try again.')
  }
  return (
    <Button variant="secondary" size="sm" onClick={remove} className="shrink-0 whitespace-nowrap">
      Remove my site
    </Button>
  )
}

export default function IndieSiteCard({ site, canVouch }: { site: IndieSite; canVouch: boolean }) {
  const { user } = useCurrentUser()
  const [removed, setRemoved] = useState(false)
  const mine = !!site.owner && !!user?.primaryHandle && user.primaryHandle.split('@')[0] === site.owner.handle
  if (removed) return <p className="p-3 text-sm text-nb-ink-mid" role="status">Taken out of the index.</p>

  return (
    // Stacked on phones (the button goes under the text), a row from sm up.
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-3">
      {site.buttonUrl && (
        <img
          src={site.buttonUrl}
          alt=""
          width={88}
          height={31}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="hidden sm:block shrink-0 mt-0.5"
          style={{ imageRendering: 'pixelated', width: 88, height: 31 }}
        />
      )}
      <div className="min-w-0 flex-1">
        <a href={site.url} target="_blank" rel="noopener noreferrer" className={TITLE}>
          {site.title}
        </a>
        <span className={`${META} flex flex-wrap items-center gap-x-1`}>
          <span className="inline-flex items-center gap-1 min-w-0">
            <span className="truncate">{site.domain}</span>
            <PixelIcon name="external-link" size={12} className="shrink-0" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>{trustLine(site)}</span>
          {site.lastPostAt && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                last post <time dateTime={site.lastPostAt}>{shortDate(site.lastPostAt)}</time>
              </span>
            </>
          )}
        </span>
        {site.description && <span className={`${BLURB} block`}>{site.description}</span>}
        {site.posts.length > 0 && (
          <ul className="mt-1.5 space-y-1 border-l-2 border-dotted border-nb-ink-mid/40 pl-3" style={{ ...LIST_RESET, paddingLeft: '0.75rem' }}>
            {site.posts.map((post) => (
              <li key={post.url} className="text-sm min-w-0">
                <a href={post.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-nb-ink underline decoration-nb-ink-mid/50 underline-offset-2 break-words">
                  {post.title || 'Untitled post'}
                </a>
                {post.publishedAt && (
                  <span className="text-nb-ink-mid">
                    {' '}
                    · <time dateTime={post.publishedAt}>{shortDate(post.publishedAt)}</time>
                  </span>
                )}
                {post.excerpt && <span className="text-nb-ink line-clamp-1 break-words">{post.excerpt}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="self-start empty:hidden">
        {mine ? <RemoveMySite site={site} onRemoved={() => setRemoved(true)} /> : canVouch && <VouchButton site={site} />}
      </div>
    </div>
  )
}
