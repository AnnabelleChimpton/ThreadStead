import React, { useCallback, useEffect, useRef, useState } from 'react';
import Modal from '@/components/ui/feedback/Modal';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import EmptyState from '@/components/ui/feedback/EmptyState';
import ErrorDisplay from '@/components/ui/feedback/ErrorDisplay';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { useToast } from '@/contexts/ToastContext';

/** One of the person's own pictures (/api/photos/[username]?scope=mine). */
export interface PickerImage {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  title?: string | null;
  caption?: string | null;
  createdAt: string;
}

export type ImagePane = 'html' | 'css';

/** Same type and size rules as /api/media/upload. */
const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
const PAGE_SIZE = 30;

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * What a picked image adds to the code, and where the cursor goes after.
 * HTML gets an <img> with the image's title as its alt; with no title the
 * cursor lands inside alt="" so the alt text is the next thing to type.
 * CSS gets url("...").
 */
export function imageSnippet(pane: ImagePane, url: string, alt: string): { text: string; cursor: number } {
  if (pane === 'css') {
    const text = `url("${url.replace(/"/g, '%22')}")`;
    return { text, cursor: text.length };
  }
  const text = `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}">`;
  return { text, cursor: alt ? text.length : text.length - 2 };
}

/** The image's full-size address, absolute (same as the media page's Copy link). */
export function imageAddress(item: Pick<PickerImage, 'fullUrl'>): string {
  return new URL(item.fullUrl, window.location.origin).href;
}

/** The words a screen reader says for the image, and the alt text it gets. */
function imageLabel(item: PickerImage): string {
  const title = item.title?.trim() || item.caption?.trim();
  if (title) return title;
  const date = new Date(item.createdAt);
  return Number.isNaN(date.getTime())
    ? 'Untitled image'
    : `Untitled image from ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}

interface ImagePickerProps {
  /** Which pane the image goes into; null when the picker is closed */
  pane: ImagePane | null;
  username: string;
  onClose: () => void;
  /** Called with the snippet to insert at the cursor */
  onPick: (pane: ImagePane, snippet: { text: string; cursor: number }) => void;
}

/**
 * Pick one of your own images (or upload a new one) to put in your page's
 * HTML or CSS. Lists your gallery and the pictures in your posts and
 * comments, newest first, and uploads through the media page's API.
 */
export default function ImagePicker({ pane, username, onClose, onPick }: ImagePickerProps) {
  const { showError } = useToast();
  const [images, setImages] = useState<PickerImage[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOpen = pane !== null;

  const fetchPage = useCallback(
    async (n: number) => {
      if (!username) throw new Error('no username');
      // scope=mine: gallery and post images, private ones too; owner only
      const res = await fetch(`/api/photos/${encodeURIComponent(username)}?page=${n}&limit=${PAGE_SIZE}&scope=mine`);
      if (!res.ok) throw new Error(`photos ${res.status}`);
      const data = await res.json();
      return { media: (data.media ?? []) as PickerImage[], hasNext: Boolean(data.pagination?.hasNextPage) };
    },
    [username],
  );

  const loadFirstPage = useCallback(async () => {
    setStatus('loading');
    try {
      const { media, hasNext } = await fetchPage(1);
      setImages(media);
      setPage(1);
      setHasMore(hasNext);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [fetchPage]);

  // Fresh list each time it opens, so images added on the media page show up
  useEffect(() => {
    if (isOpen) loadFirstPage();
  }, [isOpen, loadFirstPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { media, hasNext } = await fetchPage(page + 1);
      setImages((prev) => [...prev, ...media.filter((m) => !prev.some((p) => p.id === m.id))]);
      setPage(page + 1);
      setHasMore(hasNext);
    } catch {
      showError("Couldn't load more images. Try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const pick = (item: PickerImage) => {
    if (!pane) return;
    // An untitled image gets an empty alt to fill in, not the "Untitled image" label
    const alt = item.title?.trim() || '';
    onPick(pane, imageSnippet(pane, imageAddress(item), alt));
  };

  // Same API and capability token as the media page's upload; the new image
  // goes straight into the page.
  const upload = async (file: File) => {
    if (!UPLOAD_TYPES.includes(file.type)) {
      showError('Only JPEG, PNG, WebP and GIF images work here.');
      return;
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      showError('That file is over 25MB. Try a smaller one.');
      return;
    }
    setUploading(true);
    try {
      const capRes = await csrfFetch('/api/cap/media', { method: 'POST' });
      if (!capRes.ok) {
        showError(capRes.status === 401 ? 'Please log in again.' : "Couldn't upload that image. Try again.");
        return;
      }
      const { token } = await capRes.json();
      const form = new FormData();
      form.append('file', file);
      form.append('cap', token);
      const res = await csrfFetch('/api/media/upload', { method: 'POST', body: form });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.media) {
        showError(result.error || "Couldn't upload that image. Try again.");
        return;
      }
      pick(result.media as PickerImage);
    } catch {
      showError("Couldn't upload that image. Try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const uploadButton = (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => fileInputRef.current?.click()}
      disabled={uploading}
      className="inline-flex items-center gap-2"
    >
      <PixelIcon name="upload" size={14} />
      {uploading ? 'Uploading...' : 'Upload an image'}
    </Button>
  );

  return (
    <>
      {/* Outside the dialog so its focus trap never lands on a hidden control */}
      <input
        ref={fileInputRef}
        type="file"
        accept={UPLOAD_TYPES.join(',')}
        className="hidden"
        aria-label="Image to upload"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Insert an image"
        maxWidth="max-w-3xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {uploadButton}
            <a
              href={`/resident/${encodeURIComponent(username)}/media`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline"
            >
              Your media page
            </a>
          </div>
        }
      >
        {status === 'loading' && <LoadingSpinner message="Finding your images..." className="py-10" />}

        {status === 'error' && (
          <ErrorDisplay
            title="Couldn't load your images"
            message="Check your connection and try again."
            onRetry={loadFirstPage}
          />
        )}

        {status === 'ready' && images.length === 0 && (
          <EmptyState
            variant="plain"
            title="No images yet"
            description="Upload one and it goes right where your cursor is."
          />
        )}

        {status === 'ready' && images.length > 0 && (
          <>
            <p className="text-sm text-nb-ink-mid mb-3">Pick one to put it where your cursor is.</p>
            <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2" aria-label="Your images">
              {images.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => pick(item)}
                    className="block w-full aspect-square overflow-hidden border-2 border-nb-ink-mid/40 rounded-md bg-nb-paper hover:border-thread-pine focus:outline-none focus-visible:ring-2 focus-visible:ring-thread-pine focus-visible:ring-offset-2"
                  >
                    <img
                      src={item.thumbnailUrl}
                      alt={imageLabel(item)}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="text-center mt-4">
                <Button variant="secondary" size="sm" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading...' : 'Show more'}
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
