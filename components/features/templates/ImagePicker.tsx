import React, { useCallback, useEffect, useRef, useState } from 'react';
import Modal from '@/components/ui/feedback/Modal';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import EmptyState from '@/components/ui/feedback/EmptyState';
import ErrorDisplay from '@/components/ui/feedback/ErrorDisplay';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { CapabilityError, requestCapability } from '@/lib/api/client/capability';
import { useToast } from '@/contexts/ToastContext';
import { PAGE_ASSET_CONTEXT, PAGE_ASSET_UPLOAD } from "@/lib/media/upload-context";
import { useConfirm } from '@/contexts/ConfirmContext';

/** One of the person's own pictures (/api/photos/[username]?scope=mine). */
export interface PickerImage {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  title?: string | null;
  caption?: string | null;
  createdAt: string;
  /** PAGE_ASSET_CONTEXT for pictures uploaded for the page, which this picker manages */
  uploadContext?: string;
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
  /** Several uploaded at once: each file's name and its new address */
  onUploadedMany?: (uploads: UploadedPicture[]) => void;
}

/** A picture just uploaded: the file's own name, and its address here */
export interface UploadedPicture {
  name: string;
  url: string;
}

/**
 * Pick one of your own images (or upload a new one) to put in your page's
 * HTML or CSS, at the cursor.
 */
export default function ImagePicker({ pane, username, onClose, onPick, onUploadedMany }: ImagePickerProps) {
  return (
    <ImageLibrary
      isOpen={pane !== null}
      username={username}
      onClose={onClose}
      // An untitled image gets an empty alt to fill in, not the "Untitled image" label
      onChoose={(url, item) => pane && onPick(pane, imageSnippet(pane, url, item.title?.trim() || ''))}
      onUploadedMany={onUploadedMany}
      title="Insert an image"
      hint="Pick one to put it where your cursor is. Upload several at once, and each takes the place of a picture with the same file name in your page."
      emptyHint="Upload one and it goes right where your cursor is. Upload several, and each takes the place of a picture with the same file name in your page."
    />
  );
}

interface ImageLibraryProps {
  isOpen: boolean;
  username: string;
  onClose: () => void;
  /** The image picked (or just uploaded), and its address */
  onChoose: (url: string, item: PickerImage) => void;
  /** Takes several uploads at once (the file picker lets you choose more than one) */
  onUploadedMany?: (uploads: UploadedPicture[]) => void;
  title: string;
  /** Above the images, and when there are none yet */
  hint: string;
  emptyHint: string;
}

/**
 * Your own images to choose from, or upload a new one: your gallery and the
 * pictures in your posts and comments, newest first, uploading through the
 * media page's API. ImagePicker puts one in your page's code; a ring's
 * banner just takes its address.
 */
export function ImageLibrary({ isOpen, username, onClose, onChoose, onUploadedMany, title, hint, emptyHint }: ImageLibraryProps) {
  const { showError } = useToast();
  const confirm = useConfirm();
  const [images, setImages] = useState<PickerImage[]>([]);

  // Pictures uploaded for the page can be deleted here, and on the media
  // page (they aren't gallery photos)
  const remove = async (item: PickerImage) => {
    const ok = await confirm({
      title: 'Delete this picture for good?',
      message: 'Anywhere your page uses it will show a broken image.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const cap = await requestCapability('media');
      const res = await csrfFetch(`/api/media/${item.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cap }),
      });
      if (!res.ok) {
        showError((await res.json().catch(() => ({}))).error || "Couldn't delete that picture. Try again.");
        return;
      }
      setImages((prev) => prev.filter((image) => image.id !== item.id));
    } catch (error) {
      showError(error instanceof CapabilityError ? error.message : "Couldn't delete that picture. Try again.");
    }
  };
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  // "2 of 5" while several go up
  const [uploadCount, setUploadCount] = useState<{ done: number; of: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const pick = (item: PickerImage) => onChoose(imageAddress(item), item);

  // Same API and capability token as the media page's upload. One file
  // goes straight into the page; several each take the place of the
  // picture with their name (onUploadedMany).
  const sendFile = async (file: File, token: string): Promise<{ media: PickerImage } | { error: string; full?: boolean }> => {
    if (!UPLOAD_TYPES.includes(file.type)) return { error: 'Only JPEG, PNG, WebP and GIF images work here.' };
    if (file.size > UPLOAD_MAX_BYTES) return { error: 'That file is over 25MB. Try a smaller one.' };
    const form = new FormData();
    form.append('file', file);
    form.append('cap', token);
    // For the page, not the gallery: never a "Featured" photo
    form.append('context', PAGE_ASSET_UPLOAD);
    const res = await csrfFetch('/api/media/upload', { method: 'POST', body: form });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.media) return { error: result.error || "Couldn't upload that image. Try again.", full: res.status === 413 || res.status === 429 };
    return { media: result.media as PickerImage };
  };

  const upload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const token = await requestCapability('media');
      if (files.length === 1 || !onUploadedMany) {
        const sent = await sendFile(files[0], token);
        if ('error' in sent) showError(sent.error);
        else pick(sent.media);
        return;
      }
      const uploaded: UploadedPicture[] = [];
      for (const [i, file] of files.entries()) {
        setUploadCount({ done: i, of: files.length });
        const sent = await sendFile(file, token);
        if ('error' in sent) {
          showError(`${file.name}: ${sent.error}`);
          // Full, or too many too fast: the rest would say the same
          if (sent.full) break;
          continue;
        }
        uploaded.push({ name: file.name, url: imageAddress(sent.media) });
      }
      if (uploaded.length > 0) onUploadedMany(uploaded);
    } catch (error) {
      showError(error instanceof CapabilityError ? error.message : "Couldn't upload that image. Try again.");
    } finally {
      setUploading(false);
      setUploadCount(null);
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
      {uploadCount ? `Uploading ${uploadCount.done + 1} of ${uploadCount.of}…` : uploading ? 'Uploading...' : onUploadedMany ? 'Upload pictures' : 'Upload an image'}
    </Button>
  );

  return (
    <>
      {/* Outside the dialog so its focus trap never lands on a hidden control */}
      <input
        ref={fileInputRef}
        type="file"
        accept={UPLOAD_TYPES.join(',')}
        multiple={!!onUploadedMany}
        className="hidden"
        aria-label={onUploadedMany ? 'Pictures to upload' : 'Image to upload'}
        tabIndex={-1}
        onChange={(e) => void upload(Array.from(e.target.files ?? []))}
      />
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
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
            description={emptyHint}
          />
        )}

        {status === 'ready' && images.length > 0 && (
          <>
            <p className="text-sm text-nb-ink-mid mb-3">{hint}</p>
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
                  {item.uploadContext === PAGE_ASSET_CONTEXT && (
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      className="mt-1 w-full text-xs underline text-nb-ink-mid hover:text-thread-sunset"
                      aria-label={`Delete ${imageLabel(item)}`}
                    >
                      Delete
                    </button>
                  )}
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
