import React, { useCallback, useEffect, useState } from 'react';
import RetroCard from '@/components/ui/layout/RetroCard';
import Button from '@/components/ui/Button';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { CapabilityError, requestCapability } from '@/lib/api/client/capability';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';

interface PagePicture {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  originalName?: string | null;
  fileSize?: number | null;
  createdAt: string;
}

const PAGE_SIZE = 60;

// "340 KB" under a megabyte, then "4.2 MB", "37 MB"
const size = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;

/**
 * The owner's pictures for their own page (uploaded in the HTML editor, or
 * copied from their site): not gallery photos, so they're listed here on
 * their own, with how much room they take, to be found and deleted.
 * Nothing shows until there are some.
 */
export default function PagePictures({ username }: { username: string }) {
  const confirm = useConfirm();
  const { showError } = useToast();
  const [pictures, setPictures] = useState<PagePicture[]>([]);
  const [usage, setUsage] = useState<{ bytes: number; limit: number } | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (n: number) => {
    const res = await fetch(`/api/photos/${encodeURIComponent(username)}?scope=page&page=${n}&limit=${PAGE_SIZE}`);
    if (!res.ok) return;
    const data = await res.json();
    setPictures((prev) => (n === 1 ? data.media : [...prev, ...data.media.filter((m: PagePicture) => !prev.some((p) => p.id === m.id))]));
    setUsage(data.usage ?? null);
    setHasMore(Boolean(data.pagination?.hasNextPage));
    setPage(n);
  }, [username]);

  useEffect(() => {
    void load(1);
  }, [load]);

  const remove = async (picture: PagePicture) => {
    const ok = await confirm({
      title: 'Delete this picture for good?',
      message: 'Anywhere your page uses it will show a broken image.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const cap = await requestCapability('media');
      const res = await csrfFetch(`/api/media/${picture.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cap }),
      });
      if (!res.ok) {
        showError((await res.json().catch(() => ({}))).error || "Couldn't delete that picture. Try again.");
        return;
      }
      setPictures((prev) => prev.filter((p) => p.id !== picture.id));
      setUsage((prev) => (prev ? { ...prev, bytes: Math.max(0, prev.bytes - (picture.fileSize ?? 0)) } : prev));
    } catch (error) {
      showError(error instanceof CapabilityError ? error.message : "Couldn't delete that picture. Try again.");
    }
  };

  if (pictures.length === 0) return null;

  return (
    <RetroCard className="ts-phone-sheet mt-6">
      <section aria-labelledby="page-pictures">
        <h2 id="page-pictures" className="text-xl font-bold text-thread-pine mb-1">Pictures for your page</h2>
        <p className="text-sm text-thread-sage mb-4">
          The ones you uploaded or copied in the HTML editor. Only you see this list.
          {usage && <> They take {size(usage.bytes)} of your {size(usage.limit)}.</>}
        </p>
        <ul className="grid grid-cols-3 sm:grid-cols-6 gap-3 list-none p-0 m-0">
          {pictures.map((picture) => (
            <li key={picture.id} className="min-w-0">
              <a href={picture.fullUrl} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden border-2 border-nb-ink-mid/40 rounded-md bg-nb-paper">
                <img src={picture.thumbnailUrl} alt={picture.originalName || 'A picture for your page'} loading="lazy" className="w-full h-full object-cover" />
              </a>
              <p className="m-0 mt-1 text-xs text-nb-ink truncate" title={picture.originalName ?? undefined}>{picture.originalName || 'Untitled'}</p>
              <button
                type="button"
                onClick={() => void remove(picture)}
                className="text-xs underline text-nb-ink-mid hover:text-thread-sunset"
                aria-label={`Delete ${picture.originalName || 'this picture'}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        {hasMore && (
          <div className="text-center mt-4">
            <Button variant="secondary" size="sm" onClick={() => void load(page + 1)}>Show more</Button>
          </div>
        )}
      </section>
    </RetroCard>
  );
}
