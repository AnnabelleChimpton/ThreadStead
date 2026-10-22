import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

/**
 * Settings → Your sites: residents' sites elsewhere as their stops in their
 * rings (lib/rings/sites.ts, lib/rings/stops.ts). Add a site, prove it's
 * yours, then pick the rings it's your stop in.
 */

type SiteState = 'pending' | 'verified' | 'resting' | 'removed';
type StopStatus = 'listed' | 'pending' | 'hidden';

interface SiteRow {
  id: string;
  url: string;
  stripPageUrl: string | null;
  title: string | null;
  state: SiteState;
  verifyMethod: 'strip' | 'relme' | 'meta' | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  restingSince: string | null;
  clicksThisMonth: number;
  stops: Array<{ ringSlug: string; status: StopStatus; reason: string | null }>;
}

interface SitesData {
  max: number;
  metaName: string;
  profileUrl: string | null;
  rings: Array<{ slug: string; name: string }> | null;
  sites: SiteRow[];
}

function hostOf(url: string): string {
  try {
    const u = new URL(url);
    return (u.host + u.pathname).replace(/^www\./, '').replace(/\/$/, '');
  } catch {
    return url;
  }
}

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

async function errorOf(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return (body && typeof body.error === 'string' && body.error) || fallback;
}

function Snippet({ code }: { code: string }) {
  const { showSuccess } = useToast();
  return (
    <div className="flex items-start gap-2">
      <pre className="flex-1 min-w-0 m-0 bg-nb-surface border border-nb-ink-mid/40 rounded-md p-2 text-xs overflow-x-auto whitespace-pre-wrap break-all">{code}</pre>
      <Button
        variant="secondary"
        size="sm"
        className="thread-button-secondary flex-shrink-0"
        onClick={() => {
          navigator.clipboard.writeText(code);
          showSuccess('Copied.');
        }}
      >
        Copy
      </Button>
    </div>
  );
}

function stateLine(site: SiteRow): string {
  switch (site.state) {
    case 'pending':
      return "Not proved yet";
    case 'verified':
      return site.lastCheckedAt ? `Proved · last checked ${day(site.lastCheckedAt)}` : 'Proved';
    case 'resting':
      return "Resting: I couldn't find it the last two times I looked, so your rings walk to your pixel home instead";
    case 'removed':
      return 'Out of its rings: it was resting for 30 days. Check again once it\'s back';
  }
}

function SiteCard({ site, data, reload }: { site: SiteRow; data: SitesData; reload: () => Promise<void> }) {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  const [checking, setChecking] = useState(false);
  const [stripPage, setStripPage] = useState(site.stripPageUrl ?? '');
  const [busyRing, setBusyRing] = useState<string | null>(null);
  const proved = site.state === 'verified' || site.state === 'resting';
  const name = site.title || hostOf(site.url);

  const check = async () => {
    setChecking(true);
    try {
      const res = await csrfFetch(`/api/sites/${site.id}/check`, { method: 'POST' });
      if (!res.ok) return showError(await errorOf(res, "Couldn't check just now. Try again in a moment."));
      const result = await res.json();
      if (result.ok) showSuccess(site.state === 'pending' || site.state === 'removed' ? 'Found it. The site is yours.' : 'Found it. All good.');
      else showError(result.reason);
      await reload();
    } finally {
      setChecking(false);
    }
  };

  const saveStripPage = async () => {
    const res = await csrfFetch(`/api/sites/${site.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stripPageUrl: stripPage.trim() || null }),
    });
    if (!res.ok) return showError(await errorOf(res, "Couldn't save that."));
    showSuccess('Saved.');
    await reload();
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Remove ${hostOf(site.url)}?`,
      message: 'It stops being your stop in your rings, and strips with its id go to the start of the ring. You can add it again later.',
      confirmText: 'Remove',
      variant: 'danger',
    });
    if (!ok) return;
    const res = await csrfFetch(`/api/sites/${site.id}`, { method: 'DELETE' });
    if (!res.ok) return showError(await errorOf(res, "Couldn't remove it."));
    showSuccess('Removed.');
    await reload();
  };

  const setRing = async (ringSlug: string, on: boolean) => {
    setBusyRing(ringSlug);
    try {
      const res = await csrfFetch(`/api/sites/${site.id}/rings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ringSlug, on }),
      });
      if (!res.ok) return showError(await errorOf(res, "Couldn't change that."));
      const { stop } = await res.json();
      if (!on) showSuccess('Your pixel home is your stop there again.');
      else if (stop?.status === 'pending') showSuccess("Sent. It's your stop there once a ring owner or moderator says yes.");
      else showSuccess("It's your stop in that ring now.");
      await reload();
    } finally {
      setBusyRing(null);
    }
  };

  // Which of your sites is your stop in each ring
  const stopIn = (ringSlug: string) => {
    for (const s of data.sites) {
      const stop = s.stops.find((st) => st.ringSlug === ringSlug);
      if (stop) return { siteId: s.id, host: hostOf(s.url), ...stop };
    }
    return null;
  };

  return (
    <div className="thread-module flex flex-col gap-4" id={`site-${site.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-nb-ink m-0 break-words">
            <a href={site.url} target="_blank" rel="noopener" className="text-nb-ink underline decoration-dotted">{name}</a>
          </h3>
          {site.title && <div className="text-sm text-nb-ink-mid break-all">{hostOf(site.url)}</div>}
          <div className="text-sm text-nb-ink-mid mt-1">{stateLine(site)}</div>
        </div>
        <Button variant="secondary" size="sm" className="thread-button-secondary" onClick={remove}>Remove</Button>
      </div>

      {!proved && (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-nb-ink">
            To prove it&apos;s yours, put one of these on your homepage (or the page you name below), then press Check.
          </p>
          <div>
            <div className="font-semibold text-nb-ink mb-1">A ring strip</div>
            {data.rings && data.rings.length > 0 ? (
              <p className="m-0 text-sm text-nb-ink-mid">
                Get one from any of your rings and paste it in:{' '}
                {data.rings.map((r, i) => (
                  <React.Fragment key={r.slug}>
                    {i > 0 && ', '}
                    <Link href={`/tr/${encodeURIComponent(r.slug)}?strip=${site.id}#strip`} className="underline">{r.name}</Link>
                  </React.Fragment>
                ))}
                . It proves the site is yours and puts the ring&apos;s doorway on it in one go.
              </p>
            ) : (
              <p className="m-0 text-sm text-nb-ink-mid">
                Once you&apos;re in a public ring, its page has a strip for your site. Until then, use the tag below.
              </p>
            )}
          </div>
          <div>
            <div className="font-semibold text-nb-ink mb-1">Or this tag, inside your page&apos;s &lt;head&gt;</div>
            <Snippet code={`<meta name="${data.metaName}" content="${site.id}">`} />
          </div>
          {data.profileUrl && (
            <div>
              <div className="font-semibold text-nb-ink mb-1">Or a rel=&quot;me&quot; link to your profile here</div>
              <Snippet code={`<a rel="me" href="${data.profileUrl}">me on HomePageAgain</a>`} />
            </div>
          )}
          <div>
            <label className="block font-semibold text-nb-ink mb-1" htmlFor={`strip-page-${site.id}`}>
              Page to look at, if it isn&apos;t your homepage
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id={`strip-page-${site.id}`}
                type="url"
                value={stripPage}
                onChange={(e) => setStripPage(e.target.value)}
                placeholder={`${site.url}webrings.html`}
                className="flex-1 min-w-[12rem] border border-nb-ink-mid/50 rounded-md px-2 py-2 bg-white text-nb-ink"
              />
              {stripPage !== (site.stripPageUrl ?? '') && (
                <Button variant="secondary" size="sm" className="thread-button-secondary" onClick={saveStripPage}>Save</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {site.lastError && site.state !== 'verified' && (
        <p className="m-0 text-sm text-nb-ink">Last time: {site.lastError}</p>
      )}

      {proved && (
        <div className="flex flex-col gap-2">
          <div className="font-semibold text-nb-ink">Your stop in</div>
          {data.rings === null ? (
            <p className="m-0 text-sm text-nb-ink-mid">I can&apos;t reach your rings right now. Try again in a bit.</p>
          ) : data.rings.length === 0 ? (
            <p className="m-0 text-sm text-nb-ink-mid">
              You&apos;re not in any public rings yet. <Link href="/threadrings" className="underline">Find one to join</Link>.
            </p>
          ) : (
            <ul className="m-0 p-0 list-none space-y-1">
              {data.rings.map((ring) => {
                const stop = stopIn(ring.slug);
                const mine = stop?.siteId === site.id;
                const hiddenHere = stop?.status === 'hidden';
                return (
                  <li key={ring.slug} className="flex flex-wrap items-baseline gap-x-2">
                    <label className="flex items-start gap-2 text-nb-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mine}
                        disabled={busyRing === ring.slug || hiddenHere}
                        onChange={(e) => setRing(ring.slug, e.target.checked)}
                        className="mt-1 h-4 w-4 flex-shrink-0 accent-nb-ink"
                      />
                      <span>{ring.name}</span>
                    </label>
                    <span className="text-sm text-nb-ink-mid">
                      {mine && stop?.status === 'pending' && 'waiting for a ring owner or moderator'}
                      {mine && stop?.status === 'hidden' && `hidden by a ring owner${stop.reason ? `: ${stop.reason}` : ''}`}
                      {!mine && stop && `${stop.host} is your stop there`}
                      {!mine && !stop && 'your pixel home is your stop'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="m-0 text-sm text-nb-ink-mid">
            {site.clicksThisMonth === 1 ? '1 click' : `${site.clicksThisMonth} clicks`} through your strip this month.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant={proved ? 'secondary' : 'primary'} size="sm" className={proved ? 'thread-button-secondary' : 'thread-button'} onClick={check} disabled={checking}>
          {checking ? 'Checking…' : proved ? 'Check again' : 'Check'}
        </Button>
        <span className="text-sm text-nb-ink-mid">I only visit the page you gave me, and I look again once a week.</span>
      </div>
    </div>
  );
}

export default function YourSites() {
  const { showSuccess, showError } = useToast();
  const [data, setData] = useState<SitesData | null>(null);
  const [failed, setFailed] = useState(false);
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/sites');
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setAdding(true);
    try {
      const res = await csrfFetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) return showError(await errorOf(res, "Couldn't add that site."));
      setUrl('');
      showSuccess('Added. Now prove it\'s yours.');
      await reload();
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2 text-nb-ink">Your sites</h2>
        <p className="text-nb-ink-mid m-0">
          Got a site somewhere else, like Neocities, Nekoweb or your own domain? Add it here and it can be your stop in your
          rings. You paste a little prev / next strip onto it, and people walking the ring pass through your site.
        </p>
      </div>

      {!data && !failed && <LoadingSpinner message="Loading your sites..." />}
      {failed && <p className="text-nb-ink m-0">I couldn&apos;t load your sites. Try reloading the page.</p>}

      {data?.sites.map((site) => <SiteCard key={site.id} site={site} data={data} reload={reload} />)}

      {data && data.sites.length < data.max && (
        <form onSubmit={add} className="thread-module flex flex-col gap-2">
          <label htmlFor="add-site-url" className="block font-semibold text-nb-ink">
            {data.sites.length === 0 ? 'Add your site' : 'Add another site'}
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="add-site-url"
              type="text"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yourname.neocities.org"
              className="flex-1 min-w-[12rem] border border-nb-ink-mid/50 rounded-md px-2 py-2 bg-white text-nb-ink"
            />
            <Button type="submit" variant="primary" className="thread-button" disabled={adding || !url.trim()}>
              {adding ? 'Adding…' : 'Add'}
            </Button>
          </div>
          <p className="m-0 text-sm text-nb-ink-mid">Up to {data.max} sites.</p>
        </form>
      )}
    </div>
  );
}
