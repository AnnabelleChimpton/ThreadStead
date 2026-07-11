import React, { useState, useEffect, useCallback } from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';

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
  onClose: () => void;
}

const TRIGGER_LABELS: Record<string, string> = {
  'template-save': 'before a template save',
  'css-save': 'before a CSS save',
  'reset': 'before a reset',
};

function describeWhen(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'moments ago';
  if (minutes === 1) return 'a minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return 'an hour ago';
  if (hours < 48) return `${hours} hours ago`;
  return new Date(iso).toLocaleDateString();
}

export default function TemplateHistoryPanel({ username, onLoadRevision, onClose }: TemplateHistoryPanelProps) {
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
      const res = await fetch(`/api/profile/${encodeURIComponent(username)}/template-revisions?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('Failed to load revision');
      const data = await res.json();
      onLoadRevision(data.revision);
    } catch {
      setError("Couldn't load that version. Try again in a moment.");
    } finally {
      setLoadingId(null);
    }
  }, [username, onLoadRevision]);

  return (
    <div className="fixed right-4 top-20 bottom-4 w-96 bg-white border-2 border-thread-sage rounded-lg shadow-xl z-[9000] flex flex-col overflow-hidden">
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
        Every save keeps a copy of what it replaced. Loading a version puts it
        back in the editor — nothing goes live until you save.
      </p>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <p className="p-4 text-sm text-red-700">{error}</p>
        )}
        {!error && revisions === null && (
          <p className="p-4 text-sm text-thread-sage">Loading…</p>
        )}
        {!error && revisions !== null && revisions.length === 0 && (
          <p className="p-4 text-sm text-thread-sage">
            Nothing here yet. Once you save a change, the version it replaced
            will show up here.
          </p>
        )}
        {!error && revisions !== null && revisions.map((rev) => (
          <div key={rev.id} className="px-4 py-3 border-b border-thread-sage/20 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-thread-charcoal font-medium">
                {describeWhen(rev.createdAt)}
              </p>
              <p className="text-xs text-thread-sage">
                Saved {TRIGGER_LABELS[rev.trigger] || rev.trigger}
                {' · '}
                {rev.templateChars > 0
                  ? `template + ${rev.cssChars > 0 ? 'CSS' : 'no CSS'}`
                  : rev.cssChars > 0 ? 'CSS only' : 'empty'}
                {' · '}
                {rev.templateMode}
              </p>
            </div>
            <button
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
