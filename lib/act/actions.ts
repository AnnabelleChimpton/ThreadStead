/**
 * Signing a guestbook or following someone from a resident's own address
 * (alice.homepageagain.com), which never sees a session
 * (design/subdomain-actions/07-product-decision.md). The visitor acts on a
 * small page on the main site (/act/guestbook/alice, /act/follow/alice)
 * that shows none of the resident's HTML, where they're signed in, and comes
 * back.
 *
 * How it opens: a plain link, so it works without JavaScript and in every
 * in-app browser. While music is playing it opens in a pop-up instead, so
 * the song keeps going on the page; when the browser won't open one, the
 * link goes ahead in the same tab.
 *
 * How the result comes back from a pop-up: the action page cuts itself off
 * from the page that opened it (Cross-Origin-Opener-Policy), so when it's
 * done it goes to /assets/act-done.html on the resident's address, which
 * says so on a BroadcastChannel and closes. The page only re-reads public
 * data when it hears that, so a forged message gets nobody anything.
 */
import { getSnapshot } from '@/lib/audio/now-playing';

export type ActAction = 'guestbook' | 'follow';

export const ACT_CHANNEL = 'ts-act';
const POPUP_NAME = 'ts-act';
const POPUP_FEATURES = 'popup,width=560,height=700';

/** The action page on the main site, for a pop-up or not */
export function actionUrl(mainSiteUrl: string, action: ActAction, username: string, popup = false): string {
  return `${mainSiteUrl}/act/${action}/${encodeURIComponent(username)}${popup ? '?via=popup' : ''}`;
}

export interface ActDone {
  type: 'act-done';
  action: ActAction;
  /** The guestbook entry just signed */
  entryId?: string;
}

function isActDone(data: unknown): data is ActDone {
  const d = data as ActDone | null;
  return !!d && d.type === 'act-done' && (d.action === 'guestbook' || d.action === 'follow') &&
    (d.entryId === undefined || (typeof d.entryId === 'string' && /^[\w-]{1,64}$/.test(d.entryId)));
}

/**
 * For the action link's click: while a song plays, open the action page in
 * a pop-up and keep this page as it is. Otherwise, or when the browser won't
 * open one, the link goes ahead in this tab.
 */
export function openAction(event: { preventDefault(): void }, mainSiteUrl: string, action: ActAction, username: string): void {
  let playing = false;
  try {
    playing = getSnapshot().status === 'playing';
  } catch {
    playing = false;
  }
  if (!playing) return;
  const popup = window.open(actionUrl(mainSiteUrl, action, username, true), POPUP_NAME, POPUP_FEATURES);
  if (popup) event.preventDefault();
}

/** Hear that an action finished in a pop-up; returns the way to stop listening */
export function onActionDone(listener: (done: ActDone) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel(ACT_CHANNEL);
  channel.onmessage = (event) => {
    if (isActDone(event.data)) listener(event.data);
  };
  return () => channel.close();
}
