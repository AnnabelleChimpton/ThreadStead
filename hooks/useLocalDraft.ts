import { useState, useEffect, useRef, useCallback } from 'react';

export interface LocalDraft<T> {
  data: T;
  savedAt: number;
}

const WRITE_DEBOUNCE_MS = 800;

/**
 * Best-effort crash/navigation recovery for editor pages.
 *
 * While `isDirty` is true, the live value is mirrored into localStorage
 * (debounced). On mount, a stored draft that differs from what the server
 * loaded is surfaced as `pendingDraft` so the page can offer to restore it.
 *
 * The caller owns the draft lifecycle at save time: call `clearDraft()` after
 * a successful save or reset so a stale draft never shadows saved work.
 */
export function useLocalDraft<T>(key: string, liveValue: T, isDirty: boolean) {
  const [pendingDraft, setPendingDraft] = useState<LocalDraft<T> | null>(null);
  const checkedRef = useRef(false);
  const liveRef = useRef(liveValue);
  liveRef.current = liveValue;

  useEffect(() => {
    if (checkedRef.current || typeof window === 'undefined') return;
    checkedRef.current = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LocalDraft<T>;
      if (
        parsed &&
        typeof parsed.savedAt === 'number' &&
        parsed.data !== undefined &&
        JSON.stringify(parsed.data) !== JSON.stringify(liveRef.current)
      ) {
        setPendingDraft(parsed);
      } else {
        // Draft matches what the server already has — nothing to recover.
        window.localStorage.removeItem(key);
      }
    } catch {
      try { window.localStorage.removeItem(key); } catch { /* unavailable */ }
    }
  }, [key]);

  useEffect(() => {
    if (!isDirty || typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({ data: liveRef.current, savedAt: Date.now() })
        );
      } catch { /* storage full or blocked — drafts are best-effort */ }
    }, WRITE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [key, isDirty, liveValue]);

  const clearDraft = useCallback(() => {
    try { window.localStorage.removeItem(key); } catch { /* unavailable */ }
    setPendingDraft(null);
  }, [key]);

  return { pendingDraft, clearDraft };
}
