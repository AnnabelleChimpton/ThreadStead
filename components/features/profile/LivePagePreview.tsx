/**
 * Someone's page, shrunk to fit a card: the feed's "updated their page" items
 * and the showcase use it in place of screenshots (the server has no
 * browser to take them).
 *
 * It's the real page in an iframe, laid out at a desktop width and scaled
 * down. The iframe is fully sandboxed: no scripts run (so a profile song
 * can't start playing), no cookies are sent (it's the page a signed-out
 * visitor sees), and it can't be clicked into. It only loads once the card
 * scrolls near the screen.
 */
import React from 'react';

const PAGE_WIDTH = 1280;
const PAGE_HEIGHT = 800;

export default function LivePagePreview({
  username,
  width = 320,
  label,
}: {
  username: string;
  /** Card width in px; the height keeps the page's 16:10 shape */
  width?: number;
  /** What a screen reader hears, e.g. "Pat's page" */
  label?: string;
}) {
  const scale = width / PAGE_WIDTH;
  return (
    <div
      role="img"
      aria-label={label ?? `${username}'s page`}
      className="relative overflow-hidden border border-black/20 bg-white"
      style={{ width, height: Math.round(PAGE_HEIGHT * scale) }}
    >
      <iframe
        src={`/resident/${encodeURIComponent(username)}`}
        title={label ?? `${username}'s page`}
        aria-hidden="true"
        tabIndex={-1}
        loading="lazy"
        sandbox=""
        referrerPolicy="same-origin"
        className="absolute top-0 left-0 border-0 pointer-events-none"
        style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, transform: `scale(${scale})`, transformOrigin: '0 0' }}
      />
    </div>
  );
}
