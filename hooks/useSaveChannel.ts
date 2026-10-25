import { useCallback, useEffect, useRef } from 'react';

/**
 * Saves heard across tabs: a page editor open in another tab of the same
 * browser hears when the page is saved. A tab with nothing unsaved takes the
 * saved version, so it never shows (or later saves) an old one; a tab with
 * unsaved edits says so, and its save asks before going over it (the
 * template route's 409).
 */
export interface PageSaved {
  css: string;
  cssMode: 'inherit' | 'override' | 'disable';
  /** From the HTML editor: the rest of what it saves */
  page?: { template: string; useStandardLayout: boolean; hideNavigation: boolean };
  /** What the next HTML save is based on (the template route's savedAt) */
  savedAt?: string | null;
}

const CSS_MODES = new Set(['inherit', 'override', 'disable']);

function isPageSaved(data: unknown): data is PageSaved {
  const d = data as PageSaved | null;
  if (!d || typeof d.css !== 'string' || !CSS_MODES.has(d.cssMode)) return false;
  if (d.page !== undefined && (typeof d.page?.template !== 'string' || typeof d.page.useStandardLayout !== 'boolean' || typeof d.page.hideNavigation !== 'boolean')) return false;
  return d.savedAt === undefined || d.savedAt === null || typeof d.savedAt === 'string';
}

/**
 * `onSavedElsewhere` hears other tabs' saves; the returned function tells
 * them about this tab's. One channel object for both, because a channel
 * never hears its own messages but does hear another object's in the same
 * tab.
 */
export function useSaveChannel(userId: string | undefined, onSavedElsewhere: (saved: PageSaved) => void) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const handlerRef = useRef(onSavedElsewhere);
  handlerRef.current = onSavedElsewhere;

  useEffect(() => {
    if (!userId || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(`threadstead:page-saved:${userId}`);
    channel.onmessage = (event) => {
      if (isPageSaved(event.data)) handlerRef.current(event.data);
    };
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, [userId]);

  return useCallback((saved: PageSaved) => {
    try {
      channelRef.current?.postMessage(saved);
    } catch { /* closed, or the page too big to copy: best-effort */ }
  }, []);
}
