import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import ButtonLink from '@/components/ui/ButtonLink';
import RetroCard from '@/components/ui/layout/RetroCard';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import { useToast } from '@/contexts/ToastContext';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { errorOf, hostOf, Snippet, useSites, type SiteRow, type VerifyMethod } from './site-shared';

/**
 * /build/bring-your-site: the Your sites steps (lib/rings/sites.ts) in the
 * order someone arriving from Neocities needs them. Add the site, prove it,
 * then bring its homepage into the HTML editor (?bring=, which runs
 * /api/sites/import) or have their rings link to it.
 */

/**
 * The one site this page is about: a proved one, else a resting one, else the
 * newest still to prove. Anyone with more than one manages the others in
 * Settings → Your sites. (Sites come oldest first.)
 */
export function currentSite(sites: SiteRow[]): SiteRow | null {
  return (
    sites.find((s) => s.state === 'verified') ??
    sites.find((s) => s.state === 'resting') ??
    [...sites].reverse().find((s) => s.state === 'pending') ??
    sites[sites.length - 1] ??
    null
  );
}

/** What they put on their site, by how it was proved */
const PROOF: Record<VerifyMethod, string> = { meta: 'tag', relme: 'link', strip: 'strip' };

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function Waiting({ children }: { children: React.ReactNode }) {
  return <p className="m-0 text-nb-ink-mid">{children}</p>;
}

/** Signed out: the same three steps, so the cost is clear before signing up */
export function SignedOutSteps() {
  return (
    <div>
      <RetroCard title="1. Where your site is">
        <Waiting>Your site&apos;s address, like yourname.neocities.org.</Waiting>
      </RetroCard>
      <RetroCard title="2. Show me it's yours">
        <Waiting>
          I give you one line to paste into your homepage, inside its <code>&lt;head&gt;</code>. It doesn&apos;t show on
          the page. Then you come back here and press Check.
        </Waiting>
      </RetroCard>
      <RetroCard title="3. What to do with it">
        <Waiting>Bring your homepage in as your page here, have your rings link to your site, or both.</Waiting>
      </RetroCard>
    </div>
  );
}

export default function BringYourSite({ username }: { username: string }) {
  const { showSuccess, showError } = useToast();
  const { data, failed, reload } = useSites();
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState(false);
  // The next card's heading, once it has rendered: a step's form or button goes away when it's done
  const [focusNext, setFocusNext] = useState<string | null>(null);

  useEffect(() => {
    if (!focusNext) return;
    const heading = document.getElementById(focusNext);
    if (heading) {
      heading.focus();
      setFocusNext(null);
    }
  }, [data, focusNext]);

  if (failed) return <p className="text-nb-ink">I couldn&apos;t load your sites. Try reloading the page.</p>;
  if (!data) return <LoadingSpinner message="Loading your sites..." />;

  const site = currentSite(data.sites);
  const proved = site?.state === 'verified';
  const host = site ? hostOf(site.url) : null;
  const proof = PROOF[site?.verifyMethod ?? 'meta'];

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
      await reload();
      setFocusNext('bring-step-2');
    } finally {
      setAdding(false);
    }
  };

  const check = async () => {
    if (!site) return;
    setChecking(true);
    try {
      const res = await csrfFetch(`/api/sites/${site.id}/check`, { method: 'POST' });
      if (!res.ok) return showError(await errorOf(res, "Couldn't check just now. Try again in a moment."));
      const result = await res.json();
      if (result.ok) {
        showSuccess('Found it. The site is yours.');
        setFocusNext('bring-step-3');
      } else {
        showError(result.reason);
      }
      await reload();
    } finally {
      setChecking(false);
    }
  };

  if (site && proved) {
    const rings = data.rings;
    const pickRings = `/settings?tab=sites#site-${site.id}`;
    return (
      <div>
        <RetroCard title="Your site">
          <p className="m-0 text-nb-ink">
            <a href={site.url} target="_blank" rel="noopener" className="font-semibold text-nb-ink underline decoration-dotted">{host}</a>
            <span className="text-nb-ink-mid"> · proved. Leave the {proof} where it is, I look again once a week.</span>
          </p>
        </RetroCard>

        <RetroCard title="What to do with it" titleId="bring-step-3">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <h4 className="m-0 text-base font-bold text-nb-ink">Make it your page here</h4>
              <p className="m-0 text-nb-ink">
                I&apos;ll copy your homepage into the HTML editor. Its pictures and links keep loading from {host}, so
                when you change something there you can bring it in again.
              </p>
              <p className="m-0 text-nb-ink">
                Scripts don&apos;t come over, and only the homepage does, so links to your other pages still go to your
                site. If you&apos;re moving here for good, the editor can copy the pictures over too, so they stay if the
                old site goes. Nothing changes here until you press Save.
              </p>
              <div>
                <ButtonLink href={`/resident/${encodeURIComponent(username)}/template-editor?bring=${encodeURIComponent(site.id)}`}>
                  Bring it in
                </ButtonLink>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="m-0 text-base font-bold text-nb-ink">Keep it there, link it from your rings</h4>
              <p className="m-0 text-nb-ink">
                {rings === null
                  ? "I can't reach your rings right now, so I can't tell which ones could link to it. Try again in a bit."
                  : rings.length === 0
                    ? 'Your rings can link to your site instead of your pixel home, so people walking a ring land on it. Join a ring first, then pick it in Your sites and paste the ring’s prev / next links onto your site.'
                    : `You're in ${rings.length === 1 ? 'a ring' : `${rings.length} rings`}. Pick the ones that should link to your site, then paste each ring’s prev / next links onto it, and people walking the ring land there.`}
              </p>
              <div className="flex flex-wrap gap-3">
                {rings?.length === 0 && <ButtonLink href="/threadrings">Find a ring</ButtonLink>}
                <ButtonLink href={pickRings} variant={rings?.length ? 'primary' : 'secondary'}>Pick its rings</ButtonLink>
              </div>
            </div>
          </div>
        </RetroCard>
      </div>
    );
  }

  return (
    <div>
      <RetroCard title="1. Where your site is">
        {site ? (
          <p className="m-0 text-nb-ink">
            <a href={site.url} target="_blank" rel="noopener" className="font-semibold text-nb-ink underline decoration-dotted">{host}</a>
            <span className="text-nb-ink-mid">
              {' '}· wrong address? Remove it in <Link href="/settings?tab=sites" className="underline">Your sites</Link> and add the right one.
            </span>
          </p>
        ) : (
          <form onSubmit={add} className="flex flex-col gap-2">
            <label htmlFor="bring-site-url" className="block font-semibold text-nb-ink">Your site&apos;s address</label>
            <div className="flex flex-wrap gap-2">
              <input
                id="bring-site-url"
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
          </form>
        )}
      </RetroCard>

      <RetroCard title="2. Show me it's yours" titleId="bring-step-2">
        {!site ? (
          <Waiting>Once you&apos;ve added your site, this is where you prove it&apos;s yours.</Waiting>
        ) : (
          <div className="flex flex-col gap-3">
            {site.state === 'resting' && (
              <p className="m-0 text-nb-ink">
                I couldn&apos;t find your {proof} the last two times I looked. Check it&apos;s still in your homepage, then press Check.
              </p>
            )}
            {site.state === 'removed' && (
              <p className="m-0 text-nb-ink">
                I couldn&apos;t find your {proof} for a month, so the site left its rings. Put it back in your homepage, then press Check.
              </p>
            )}
            <p className="m-0 text-nb-ink">
              Copy this tag into your homepage, on its own line right after <code>&lt;head&gt;</code>, and save. On
              Neocities that&apos;s Edit on index.html in your dashboard. It doesn&apos;t show on the page. Then come back
              here and press Check.
            </p>
            <Snippet code={`<meta name="${data.metaName}" content="${site.id}">`} label="Copy the tag" />
            {data.rings && data.rings.length > 0 && (
              <p className="m-0 text-sm text-nb-ink">
                Already in a ring? Its strip proves the site is yours too, and puts the ring&apos;s prev / next links on it
                in the same edit:{' '}
                {data.rings.map((r, i) => (
                  <React.Fragment key={r.slug}>
                    {i > 0 && ', '}
                    <Link href={`/tr/${encodeURIComponent(r.slug)}?strip=${site.id}#strip`} className="underline">{r.name}</Link>
                  </React.Fragment>
                ))}
                .
              </p>
            )}
            {data.profileUrl && (
              <details className="text-sm text-nb-ink">
                <summary className="cursor-pointer text-nb-ink-mid">Or link to your profile here instead</summary>
                <div className="mt-2 flex flex-col gap-2">
                  <p className="m-0">Put this link anywhere on your homepage. Unlike the tag, it shows on the page.</p>
                  <Snippet code={`<a rel="me" href="${data.profileUrl}">me on HomePageAgain</a>`} label="Copy the link" />
                </div>
              </details>
            )}
            {site.lastError && (
              <p className="m-0 text-sm text-nb-ink">
                {site.lastCheckedAt ? `Last check, ${when(site.lastCheckedAt)}: ` : 'Last check: '}
                {site.lastError}
              </p>
            )}
            <div>
              <Button variant="primary" size="sm" className="thread-button" onClick={check} disabled={checking}>
                {checking ? 'Checking…' : 'Check'}
              </Button>
            </div>
          </div>
        )}
      </RetroCard>

      <RetroCard title="3. What to do with it">
        <Waiting>Once I&apos;ve found the tag, you can bring your page in here, have your rings link to your site, or both.</Waiting>
      </RetroCard>
    </div>
  );
}
