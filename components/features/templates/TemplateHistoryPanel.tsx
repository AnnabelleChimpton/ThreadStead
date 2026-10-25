import React, { useState, useEffect, useCallback } from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import EmptyState from '@/components/ui/feedback/EmptyState';
import ErrorDisplay from '@/components/ui/feedback/ErrorDisplay';
import { layoutOf } from '@/lib/domain/profile/layout';

export interface RevisionSummary {
  id: string;
  trigger: 'template-save' | 'css-save' | 'reset' | string;
  templateMode: 'default' | 'enhanced' | 'advanced';
  cssMode: 'inherit' | 'override' | 'disable';
  hideNavigation: boolean;
  createdAt: string;
  templateChars: number;
  cssChars: number;
}

export interface FullRevision extends Omit<RevisionSummary, 'templateChars' | 'cssChars'> {
  customTemplate: string | null;
  customCSS: string | null;
}

interface TemplateHistoryPanelProps {
  username: string;
  onLoadRevision: (revision: FullRevision) => void;
  /** "Look": show a version in the preview, the code untouched (it's optional) */
  onLook?: (id: string) => void;
  /** The version the preview is showing, if any */
  lookingAt?: string | null;
  onClose: () => void;
}

/** One version, everything in it */
export async function fetchRevision(username: string, id: string): Promise<FullRevision> {
  const res = await fetch(`/api/profile/${encodeURIComponent(username)}/template-revisions?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to load revision');
  return (await res.json()).revision;
}

const TRIGGER_LABELS: Record<string, string> = {
  'template-save': 'Before a save',
  'css-save': 'Before a CSS save',
  'reset': 'Before you reset your page',
  'moderator-reset': 'Before a moderator reset your page',
  'layout-merge': "When the site cleared CSS your page wasn't showing",
  'vb-convert': 'Before the old Visual Builder layout was converted',
};

// What a version holds, in the words Settings uses: "Saved before you saved
// · template + CSS · advanced" said it in the code's (template audit 07 #12)
function describeVersion(rev: RevisionSummary): string {
  const holds = rev.templateChars > 0
    ? rev.cssChars > 0 ? 'HTML and CSS' : 'HTML, no CSS'
    : rev.cssChars > 0 ? 'CSS only' : 'empty';
  const layout = layoutOf(rev.templateMode) === 'html' ? 'your own HTML page' : 'the standard layout';
  return `${TRIGGER_LABELS[rev.trigger] || rev.trigger} · ${holds} · ${layout}`;
}

export function describeWhen(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'moments ago';
  if (minutes === 1) return 'a minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return 'an hour ago';
  if (hours < 48) return `${hours} hours ago`;
  return new Date(iso).toLocaleDateString();
}

export default function TemplateHistoryPanel({ username, onLoadRevision, onLook, lookingAt = null, onClose }: TemplateHistoryPanelProps) {
  const [revisions, setRevisions] = useState<RevisionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/profile/${encodeURIComponent(username)}/template-revisions`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load history');
        const data = await res.json();
        if (!cancelled) setRevisions(data.revisions || []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your history. Try again in a moment.");
      });
    return () => { cancelled = true; };
  }, [username]);

  const loadRevision = useCallback(async (id: string) => {
    setLoadingId(id);
    setError(null);
    try {
      onLoadRevision(await fetchRevision(username, id));
    } catch {
      setError("Couldn't load that version. Try again in a moment.");
    } finally {
      setLoadingId(null);
    }
  }, [username, onLoadRevision]);

  return (
    // On the left where the preview is beside the code, so Look can be seen
    <div className="fixed left-4 right-4 sm:left-auto lg:left-4 lg:right-auto top-20 bottom-4 sm:w-96 bg-white border-2 border-thread-sage rounded-lg shadow-xl z-[9000] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-thread-cream border-b border-thread-sage">
        <h3 className="font-semibold text-thread-charcoal flex items-center gap-2">
          <PixelIcon name="clock" size={16} /> History
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-thread-paper rounded transition-colors"
          aria-label="Close history"
        >
          <PixelIcon name="close" size={16} />
        </button>
      </div>

      <p className="px-4 py-2 text-xs text-thread-sage border-b border-thread-sage/30">
        Every save keeps a copy of what it replaced.{' '}
        {onLook ? 'Look shows a version in the preview; Load puts it in the editor.' : 'Load puts a version back in the editor.'}{' '}
        Nothing goes live until you save.
      </p>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <ErrorDisplay title={error} className="m-4" />
        )}
        {!error && revisions === null && (
          <LoadingSpinner message="Loading…" className="p-4" />
        )}
        {!error && revisions !== null && revisions.length === 0 && (
          <EmptyState
            variant="plain"
            title="Nothing here yet."
            description="Once you save a change, the version it replaced will show up here."
          />
        )}
        {!error && revisions !== null && revisions.map((rev) => (
          <div key={rev.id} className="px-4 py-3 border-b border-thread-sage/20 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-thread-charcoal font-medium">
                {describeWhen(rev.createdAt)}
              </p>
              <p className="text-xs text-thread-sage">{describeVersion(rev)}</p>
            </div>
            {onLook && (
              <button
                type="button"
                onClick={() => onLook(rev.id)}
                aria-pressed={lookingAt === rev.id}
                className={`px-3 py-1.5 text-xs font-medium border border-thread-pine rounded transition-colors flex-shrink-0 ${lookingAt === rev.id ? 'bg-thread-cream text-thread-pine' : 'bg-white text-thread-pine hover:bg-thread-paper'}`}
              >
                {lookingAt === rev.id ? 'Showing' : 'Look'}
              </button>
            )}
            <button
              type="button"
              onClick={() => loadRevision(rev.id)}
              disabled={loadingId !== null}
              className="px-3 py-1.5 text-xs font-medium bg-thread-pine text-white rounded hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0"
            >
              {loadingId === rev.id ? 'Loading…' : 'Load'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Over the preview while it shows a version from History: which one, and
 * the way to keep it or go back. `failed`: it wouldn't build, so the
 * preview stayed on your code.
 */
export function LookingNotice({ revision, failed, onLoad, onBack }: {
  revision: FullRevision | null;
  failed?: boolean;
  onLoad: () => void;
  onBack: () => void;
}) {
  // "3 hours ago", or "on 10/20/2026" past two days
  const when = revision ? describeWhen(revision.createdAt) : '';
  const at = /ago$/.test(when) ? when : `on ${when}`;
  return (
    <div role="status" className="m-0 px-3 py-2 text-sm bg-thread-cream border-b border-thread-sage text-nb-ink flex-shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex-1 min-w-0">
        {!revision
          ? 'Getting that version…'
          : failed
            ? `The version from ${at} doesn't build any more, so the preview still shows your code. Loading it lists what's wrong.`
            : `Showing how your page looked ${at}. Your code hasn't changed.`}
      </span>
      {revision && (
        <button type="button" onClick={onLoad} className="px-2.5 py-1 text-xs font-medium bg-thread-pine text-white rounded hover:opacity-90">
          Load it
        </button>
      )}
      <button type="button" onClick={onBack} className="ts-bare text-xs underline text-nb-ink">
        Back to my code
      </button>
    </div>
  );
}
