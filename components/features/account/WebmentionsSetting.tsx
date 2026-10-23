import React, { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

/**
 * Settings → Privacy: whether public posts tell the sites they link to
 * (webmentions, lib/webmentions/send.ts). Saves as soon as it's changed.
 */
export default function WebmentionsSetting() {
  const { showSuccess, showError } = useToast();
  const [send, setSend] = useState<boolean | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/account/webmentions')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setSend(data.send), () => setLoadFailed(true));
  }, []);

  const change = async (next: boolean) => {
    setBusy(true);
    try {
      const res = await csrfFetch('/api/account/webmentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ send: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSend(next);
      showSuccess('Saved.');
    } catch {
      showError("That didn't save. Try again?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="thread-module">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={send ?? false}
          disabled={send === null || busy}
          onChange={(e) => change(e.target.checked)}
          className="mt-1 w-5 h-5"
        />
        <span>
          <span className="block font-bold text-black">Let sites know when my posts link to them</span>
          <span className="block text-sm text-nb-ink-mid">
            When a public post of yours links to someone&apos;s website, and that site takes webmentions, it hears about your post and might link back to it. Posts with a content warning are never sent.
          </span>
          {loadFailed && <span className="block text-sm text-nb-ink-mid mt-1">Couldn&apos;t load this setting. Refresh to try again.</span>}
        </span>
      </label>
    </div>
  );
}
