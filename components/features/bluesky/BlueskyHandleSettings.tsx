import React, { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import type { BlueskySettingsState } from '@/lib/domain/bluesky/handle-links';
import KnownHere from './KnownHere';

/**
 * Settings → Bluesky: use your address here (alice.homepageagain.com) as
 * your Bluesky handle (lib/domain/bluesky/handle-links.ts). Paste the
 * handle you have now, follow the steps in Bluesky, then Check.
 */

type Account = { did: string; handle: string; displayName: string | null; avatar: string | null };

function formatDay(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
}

function CopyText({ text, label }: { text: string; label: string }) {
  const { showSuccess, showError } = useToast();
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('Copied.');
    } catch {
      showError("Couldn't copy it. Select it and copy it by hand?");
    }
  }
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <code className="bg-nb-surface border border-nb-ink-mid/40 rounded px-1.5 py-0.5 text-sm break-all">{text}</code>
      <button
        type="button"
        onClick={copy}
        className="ts-bare inline-flex items-center p-1 rounded hover:bg-nb-ink-mid/10 text-nb-ink"
        aria-label={label}
        title={label}
      >
        <PixelIcon name="copy" size={14} />
      </button>
    </span>
  );
}

export default function BlueskyHandleSettings() {
  const { showSuccess, showError } = useToast();
  const confirm = useConfirm();
  const [state, setState] = useState<BlueskySettingsState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState<'link' | 'check' | 'unlink' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch('/api/account/bluesky');
      if (!res.ok) throw new Error();
      setState(await res.json());
    } catch {
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function link(e: React.FormEvent) {
    e.preventDefault();
    setBusy('link');
    setFormError(null);
    try {
      const res = await csrfFetch('/api/account/bluesky', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setFormError(data.error || "That didn't work. Try again?");
      const { account: found, ...next } = data;
      setAccount(found ?? null);
      setState(next);
      setInput('');
      if (next.link?.status === 'verified') showSuccess('Done: that address is your Bluesky handle.');
    } catch {
      setFormError("That didn't work. Try again?");
    } finally {
      setBusy(null);
    }
  }

  async function check() {
    setBusy('check');
    try {
      const res = await csrfFetch('/api/account/bluesky/check', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showError(data.error || "Couldn't check just now. Try again?");
      setState(data);
      if (data.link?.status === 'verified') showSuccess('Done: that address is your Bluesky handle.');
    } catch {
      showError("Couldn't check just now. Try again?");
    } finally {
      setBusy(null);
    }
  }

  async function unlink(verified: boolean, address: string) {
    if (verified) {
      const ok = await confirm({
        title: 'Stop using this handle?',
        message: `Change your handle in Bluesky first (Settings → Account → Handle). If you stop here first, Bluesky will show @${address} as an invalid handle until you do.`,
        confirmText: 'Stop using it',
        variant: 'danger',
      });
      if (!ok) return;
    }
    setBusy('unlink');
    try {
      const res = await csrfFetch('/api/account/bluesky', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return showError(data.error || "That didn't work. Try again?");
      setState(data);
      setAccount(null);
    } catch {
      showError("That didn't work. Try again?");
    } finally {
      setBusy(null);
    }
  }

  if (loadError) {
    return (
      <div className="thread-module">
        <p className="m-0 text-nb-ink">I couldn&apos;t load this just now.</p>
        <Button variant="secondary" size="sm" className="thread-button-secondary mt-3" onClick={load}>Try again</Button>
      </div>
    );
  }
  if (!state) return <LoadingSpinner />;

  const { address, noAddressReason, link: current } = state;
  const status = current?.status ?? null;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Bluesky handle</h2>
        {address ? (
          <p className="text-nb-ink-mid m-0">
            You can use your address here as your handle on Bluesky, so you show up there as <strong className="text-nb-ink">@{address}</strong>.
            Your posts and followers on Bluesky stay exactly as they are. Only the name changes.
          </p>
        ) : (
          <p className="text-nb-ink-mid m-0">{noAddressReason}</p>
        )}
      </div>

      {address && status === 'verified' && current && (
        <div className="thread-module flex flex-col gap-3">
          <p className="m-0 text-nb-ink flex items-center gap-2 flex-wrap">
            <PixelIcon name="check" size={16} />
            <span>
              <a href={`https://bsky.app/profile/${address}`} target="_blank" rel="noopener noreferrer" className="underline font-semibold">@{address}</a>{' '}
              is your Bluesky handle.
            </span>
          </p>
          <p className="m-0 text-sm text-nb-ink-mid">
            It shows under your name on your profile, with a button to copy it. I check with Bluesky once a day that it&apos;s still yours
            {current.lastCheckedAt ? ` (last time: ${formatDay(current.lastCheckedAt)})` : ''}.
          </p>
          <div>
            <Button variant="secondary" size="sm" className="thread-button-secondary" onClick={() => unlink(true, address)} disabled={busy !== null}>
              {busy === 'unlink' ? 'Stopping...' : 'Stop using it'}
            </Button>
          </div>
        </div>
      )}

      {address && status === 'verified' && <KnownHere />}

      {address && status === 'pending' && current && (
        <div className="thread-module flex flex-col gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {account?.avatar && (
              <img src={account.avatar} alt="" width={40} height={40} className="w-10 h-10 rounded-full border border-nb-ink-mid/40" />
            )}
            <div className="min-w-0">
              <div className="font-semibold text-nb-ink break-words">
                {account?.displayName || (current.previousHandle ? `@${current.previousHandle}` : 'Your Bluesky account')}
              </div>
              {account?.displayName && current.previousHandle && (
                <div className="text-sm text-nb-ink-mid break-all">@{current.previousHandle}</div>
              )}
            </div>
          </div>

          <div>
            <p className="m-0 mb-2 font-semibold text-nb-ink">Now, over in Bluesky:</p>
            <ol className="m-0 pl-5 space-y-2 text-nb-ink list-decimal">
              <li>Open <strong>Settings → Account → Handle</strong>, then pick <strong>I have my own domain</strong>.</li>
              <li>Choose <strong>No DNS Panel</strong>.</li>
              <li>
                Type in your address: <CopyText text={address} label="Copy your address" />
              </li>
              <li>
                Bluesky asks you to upload a text file. You can skip that part, I&apos;m already serving it for you.
                Press <strong>Verify Text File</strong>, then <strong>Update to {address}</strong>.
              </li>
              <li>Come back here and press Check.</li>
            </ol>
          </div>

          {current.lastCheckNote && <p className="m-0 text-sm text-nb-ink">{current.lastCheckNote}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" className="thread-button" onClick={check} disabled={busy !== null}>
              {busy === 'check' ? 'Checking...' : 'Check'}
            </Button>
            <Button variant="secondary" size="sm" className="thread-button-secondary" onClick={() => unlink(false, address)} disabled={busy !== null}>
              Start over
            </Button>
            {current.pendingUntil && (
              <span className="text-sm text-nb-ink-mid">This waits for you until {formatTime(current.pendingUntil)}.</span>
            )}
          </div>
        </div>
      )}

      {address && status !== 'verified' && status !== 'pending' && (
        <form className="thread-module flex flex-col gap-3" onSubmit={link}>
          {status === 'expired' && (
            <p className="m-0 text-sm text-nb-ink">The last try waited 72 hours and ran out. Start again whenever you like.</p>
          )}
          {status === 'revoked' && current?.lastCheckNote && <p className="m-0 text-sm text-nb-ink">{current.lastCheckNote}</p>}
          <label className="block font-semibold text-nb-ink" htmlFor="bluesky-handle-input">
            Your Bluesky handle now
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="bluesky-handle-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="you.bsky.social"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="flex-1 min-w-[12rem] max-w-md border-2 border-nb-ink-mid/60 rounded-md p-3 bg-white focus:outline-none focus:border-nb-ink-mid"
            />
            <Button type="submit" variant="primary" className="thread-button" disabled={busy !== null || !input.trim()}>
              {busy === 'link' ? 'Looking...' : 'Next'}
            </Button>
          </div>
          {formError && <p className="m-0 text-sm text-red-700">{formError}</p>}
          <p className="m-0 text-sm text-nb-ink-mid">Your DID (did:plc:…) works too. I only look it up on Bluesky, nothing changes there yet.</p>
        </form>
      )}
    </div>
  );
}
