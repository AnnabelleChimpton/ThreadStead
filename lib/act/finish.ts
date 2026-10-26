/**
 * Where an action page goes when it's done (lib/act/act-page.ts gives it
 * the way back, worked out on the server): back to the person's own
 * address, at the note just signed; or, in a pop-up, to act-done.html there,
 * which tells the page still open and closes (lib/act/actions.ts).
 */
import type { ActPageProps } from './act-page';

/** Where a finished action goes: back to their address, or act-done.html there in a pop-up */
export function finishUrl(props: Pick<ActPageProps, 'backUrl' | 'popup'>, action: 'guestbook' | 'follow', entryId?: string): string {
  if (props.popup) {
    return `${new URL('/assets/act-done.html', props.backUrl).href}#${action}${entryId ? `=${entryId}` : ''}`;
  }
  return action === 'guestbook' && entryId ? `${props.backUrl}#guestbook-entry-${entryId}` : props.backUrl;
}

/** Go there (one place, so tests can see where) */
export function navigate(url: string): void {
  window.location.href = url;
}
