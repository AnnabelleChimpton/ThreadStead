import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/ui/feedback/Modal';
import Button from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { getSiteBaseUrl } from '@/lib/config/site-url';
import { STRIP_PRESETS, stripHtml, type StripPreset } from '@/lib/rings/strip';

/**
 * "Get a strip for your site" on a public ring's page: the webring strip
 * (lib/rings/strip.ts) with a live preview, for one of the viewer's sites
 * (Settings → Your sites) so prev / next / random start from it and the
 * strip proves the site is theirs.
 */

interface MySite {
  id: string;
  url: string;
  state: 'pending' | 'verified' | 'resting' | 'removed';
  stops: Array<{ ringSlug: string }>;
}

function hostOf(url: string): string {
  try {
    const u = new URL(url);
    return (u.host + u.pathname).replace(/^www\./, '').replace(/\/$/, '');
  } catch {
    return url;
  }
}

export default function StripBuilder({
  isOpen,
  onClose,
  ring,
  signedIn,
  initialSiteId,
}: {
  isOpen: boolean;
  onClose: () => void;
  ring: { slug: string; name: string };
  signedIn: boolean;
  initialSiteId?: string | null;
}) {
  const { showSuccess } = useToast();
  const [preset, setPreset] = useState<StripPreset>('plain');
  const [sites, setSites] = useState<MySite[] | null>(null);
  const [siteId, setSiteId] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !signedIn || sites) return;
    fetch('/api/sites')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const list: MySite[] = (data?.sites ?? []).filter((s: MySite) => s.state !== 'removed');
        setSites(list);
        const here = list.find((s) => s.stops.some((st) => st.ringSlug === ring.slug));
        const chosen = list.find((s) => s.id === initialSiteId) ?? here ?? list[0];
        if (chosen) setSiteId(chosen.id);
      })
      .catch(() => setSites([]));
  }, [isOpen, signedIn, sites, ring.slug, initialSiteId]);

  const code = useMemo(
    () => stripHtml({ baseUrl: getSiteBaseUrl(), slug: ring.slug, ringName: ring.name, siteId: siteId || null, preset }),
    [ring.slug, ring.name, siteId, preset]
  );
  const chosen = sites?.find((s) => s.id === siteId);
  const preview = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:12px;font-family:system-ui,sans-serif;font-size:15px;color:#222;background:#fff}</style></head><body>${code}</body></html>`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Put this ring on your site" maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4 text-nb-ink" id="strip">
        <p className="m-0">
          Paste this into your site&apos;s HTML where you&apos;d like the ring to show. It&apos;s plain links and a picture, no
          script, so it works on Neocities and anywhere else.
        </p>

        {signedIn && sites && sites.length > 0 && (
          <div>
            <label htmlFor="strip-site" className="block font-semibold mb-1">For</label>
            <select
              id="strip-site"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full border border-nb-ink-mid/50 rounded-md px-2 py-2 bg-white text-nb-ink"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{hostOf(s.url)}</option>
              ))}
              <option value="">No site of mine (just the ring)</option>
            </select>
            {chosen && chosen.state === 'pending' && (
              <p className="m-0 mt-1 text-sm text-nb-ink-mid">
                Once it&apos;s on your site, press Check in <Link href="/settings?tab=sites" className="underline">Your sites</Link> to prove the site is yours.
              </p>
            )}
            {chosen && chosen.state !== 'pending' && !chosen.stops.some((st) => st.ringSlug === ring.slug) && (
              <p className="m-0 mt-1 text-sm text-nb-ink-mid">
                To make it your stop in this ring, tick the ring under it in <Link href="/settings?tab=sites" className="underline">Your sites</Link>.
              </p>
            )}
          </div>
        )}
        {signedIn && sites && sites.length === 0 && (
          <p className="m-0 text-sm text-nb-ink-mid">
            Add your site in <Link href="/settings?tab=sites" className="underline">Your sites</Link> first, so the strip
            knows where it lives and the ring&apos;s walk passes through it.
          </p>
        )}

        <fieldset className="m-0 p-0 border-0">
          <legend className="font-semibold mb-1">Look</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {STRIP_PRESETS.map((p) => (
              <label key={p.id} className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name="strip-preset" value={p.id} checked={preset === p.id} onChange={() => setPreset(p.id)} className="accent-nb-ink" />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <div className="font-semibold mb-1">Preview</div>
          <iframe
            title="Strip preview"
            srcDoc={preview}
            sandbox=""
            className="w-full h-28 border border-nb-ink-mid/40 rounded-md bg-white"
          />
        </div>

        <div>
          <label htmlFor="strip-code" className="block font-semibold mb-1">HTML</label>
          <textarea
            id="strip-code"
            readOnly
            value={code}
            rows={9}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full font-mono text-xs border border-nb-ink-mid/50 rounded-md p-2 bg-nb-surface text-nb-ink"
          />
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            className="thread-button"
            onClick={() => {
              navigator.clipboard.writeText(code);
              showSuccess('Strip copied.');
            }}
          >
            Copy HTML
          </Button>
        </div>
      </div>
    </Modal>
  );
}
