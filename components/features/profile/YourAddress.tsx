import React from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useToast } from '@/contexts/ToastContext';

/**
 * Settings → Profile: your own address, alice.homepageagain.com, where your
 * page lives signed out and read-only (pages/site/[label].tsx).
 */
export default function YourAddress({
  siteUrl,
  username,
  visibility,
}: {
  /** https://alice.homepageagain.com/ */
  siteUrl: string;
  username: string;
  visibility?: string | null;
}) {
  const { showSuccess, showError } = useToast();
  const host = new URL(siteUrl).host;

  async function copy() {
    try {
      await navigator.clipboard.writeText(host);
      showSuccess('Copied.');
    } catch {
      showError("Couldn't copy it. Select it and copy it by hand?");
    }
  }

  return (
    <div className="thread-module">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-nb-ink">
        <PixelIcon name="home" />
        Your address
      </h3>
      <p className="m-0 flex items-center gap-1 flex-wrap">
        <a href={siteUrl} target="_blank" rel="noopener" className="font-semibold underline break-all">
          {host}
        </a>
        <button
          type="button"
          onClick={copy}
          className="ts-bare inline-flex items-center p-1 rounded hover:bg-nb-ink-mid/10 text-nb-ink"
          aria-label="Copy your address"
          title="Copy your address"
        >
          <PixelIcon name="copy" size={14} />
        </button>
      </p>
      <p className="m-0 mt-2 text-sm text-nb-ink-mid">
        Your page, at a web address of its own. Visitors there see it signed out, and signing your guestbook or
        following you takes them back here.
        {username.includes('_') && " Web addresses can't have _ in them, so yours has - instead."}
        {visibility && visibility !== 'public' && " Your profile isn't public, so for now it shows a note pointing here."}
      </p>
    </div>
  );
}
