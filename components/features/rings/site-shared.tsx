import React, { useCallback, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';

/**
 * What Settings → Your sites (YourSites) and /build/bring-your-site
 * (BringYourSite) share: the /api/sites shape, loading it, and the bits both
 * screens draw.
 */

export type SiteState = 'pending' | 'verified' | 'resting' | 'removed';
export type StopStatus = 'listed' | 'pending' | 'hidden';
export type VerifyMethod = 'strip' | 'relme' | 'meta';

export interface SiteRow {
  id: string;
  url: string;
  stripPageUrl: string | null;
  title: string | null;
  state: SiteState;
  verifyMethod: VerifyMethod | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  restingSince: string | null;
  clicksThisMonth: number;
  stops: Array<{ ringSlug: string; status: StopStatus; reason: string | null }>;
}

export interface SitesData {
  max: number;
  metaName: string;
  profileUrl: string | null;
  /** Your public rings; null when Ring Hub can't be reached */
  rings: Array<{ slug: string; name: string }> | null;
  sites: SiteRow[];
}

/** GET /api/sites, with a reload for after each change */
export function useSites() {
  const [data, setData] = useState<SitesData | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/sites');
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, failed, reload };
}

export function hostOf(url: string): string {
  try {
    const u = new URL(url);
    return (u.host + u.pathname).replace(/^www\./, '').replace(/\/$/, '');
  } catch {
    return url;
  }
}

export async function errorOf(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return (body && typeof body.error === 'string' && body.error) || fallback;
}

/** A line of code to paste, with a Copy button. `label` names the button for screen readers when there are several. */
export function Snippet({ code, label }: { code: string; label?: string }) {
  const { showSuccess } = useToast();
  return (
    <div className="flex items-start gap-2">
      <pre className="flex-1 min-w-0 m-0 bg-nb-surface border border-nb-ink-mid/40 rounded-md p-2 text-xs overflow-x-auto whitespace-pre-wrap break-all">{code}</pre>
      <Button
        variant="secondary"
        size="sm"
        className="thread-button-secondary flex-shrink-0"
        aria-label={label}
        onClick={() => {
          navigator.clipboard.writeText(code);
          showSuccess('Copied.');
        }}
      >
        Copy
      </Button>
    </div>
  );
}
