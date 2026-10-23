import React from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useToast } from '@/contexts/ToastContext';
import { residentFeedUrl } from '@/lib/feeds/urls';

/**
 * Settings → Profile: where you are on the web. Your own address,
 * alice.homepageagain.com, where your page lives signed out and read-only
 * (pages/site/[label].tsx), and your RSS feed while the profile is public,
 * the same rule as lib/feeds/resident-feed.ts.
 */
export default function YourAddress({
  siteUrl,
  username,
  visibility,
  blueskyVerified,
}: {
  /** https://alice.homepageagain.com/ */
  siteUrl: string;
  username: string;
  visibility?: string | null;
  /** The address is their Bluesky handle too (lib/domain/bluesky) */
  blueskyVerified?: boolean;
}) {
  const host = new URL(siteUrl).host;
  const isPublic = !visibility || visibility === 'public';
  const feedUrl = residentFeedUrl(username);

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
        <CopyButton text={host} label="Copy your address" />
      </p>
      <p className="m-0 mt-2 text-sm text-nb-ink-mid">
        Your page, at a web address of its own. Visitors there see it signed out, and signing your guestbook or
        following you takes them back here.
        {username.includes('_') && " Web addresses can't have _ in them, so yours has - instead."}
        {!isPublic && " Your profile isn't public, so for now it shows a note pointing here."}
        {blueskyVerified && " It's your Bluesky handle too."}
      </p>

      {isPublic && (
        <>
          <p className="m-0 mt-4 text-sm font-semibold text-nb-ink">Your feed</p>
          {/* Inline, so a long address wraps with the copy button on its last line */}
          <p className="m-0 text-sm break-all">
            <a href={feedUrl} target="_blank" rel="noopener" className="underline">
              {feedUrl.replace(/^https?:\/\//, '')}
            </a>{' '}
            <CopyButton text={feedUrl} label="Copy your feed address" />
          </p>
          <p className="m-0 mt-2 text-sm text-nb-ink-mid">
            People can paste this into a feed reader to follow your public posts, no account needed. It&apos;s RSS,
            the same kind of feed blogs have always had.
          </p>
        </>
      )}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
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
    <button
      type="button"
      onClick={copy}
      className="ts-bare inline-flex items-center align-middle p-1 rounded hover:bg-nb-ink-mid/10 text-nb-ink"
      aria-label={label}
      title={label}
    >
      <PixelIcon name="copy" size={14} />
    </button>
  );
}
