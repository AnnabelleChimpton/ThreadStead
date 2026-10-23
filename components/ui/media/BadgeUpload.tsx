import React, { useState, useRef } from 'react';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { requestCapability } from '@/lib/api/client/capability';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface BadgeUploadProps {
  onUploadSuccess: (badgeUrls: { badgeImageUrl: string; badgeImageHighResUrl: string }) => void;
  /** While a picked image is still on its way up (the badge manager holds Save until it's there) */
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
  ringSlug: string;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Picking (or dropping) an image uploads it straight away. It used to wait
 * for a second "Upload" button, and a Save pressed before that one quietly
 * made a template badge instead.
 */
export default function BadgeUpload({ onUploadSuccess, onUploadingChange, disabled = false, ringSlug }: BadgeUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setBusy = (busy: boolean) => {
    setUploading(busy);
    onUploadingChange?.(busy);
  };

  const upload = async (file: File) => {
    if (!IMAGE_TYPES.includes(file.type) && !/\.(jpe?g|png|gif|webp)$/i.test(file.name)) {
      setError('That needs to be a PNG, JPEG, GIF or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('A badge image has to be under 10MB.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('cap', await requestCapability('media'));
      formData.append('context', 'threadring_badge');
      formData.append('ringSlug', ringSlug);

      const response = await csrfFetch('/api/media/upload', { method: 'POST', body: formData });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Couldn't upload that image. Try again in a moment.");
      // The badge-sized copy and its 4× version (pages/api/media/upload.ts)
      onUploadSuccess({ badgeImageUrl: result.media.mediumUrl, badgeImageHighResUrl: result.media.fullUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that image. Try again in a moment.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* File Drop Zone */}
      <div
        className={`border-2 border-dashed p-6 text-center transition-colors ${dragOver
            ? 'border-thread-pine bg-thread-cream'
            : 'border-thread-sage hover:border-thread-pine'
          }`}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file && !uploading && !disabled) upload(file);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        <p className="text-thread-pine font-medium mb-2">
          Drop your badge image here or click to browse
        </p>
        <p className="text-sm text-thread-sage mb-4">
          Best results with 88x31 pixels. PNG, JPEG, GIF, or WebP. Max 10MB.
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="px-4 py-2 border border-black bg-white hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50"
        >
          {uploading ? <><PixelIcon name="reload" /> Uploading...</> : 'Choose Badge Image'}
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
        className="hidden"
      />

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 p-4 text-sm">
        <h5 className="font-bold text-blue-900 mb-2">Badge Guidelines</h5>
        <ul className="text-blue-800 space-y-1">
          <li>• <strong>Size</strong>: 88x31 pixels recommended (will be resized if needed)</li>
          <li>• <strong>Format</strong>: PNG recommended for best quality</li>
          <li>• <strong>Style</strong>: Pixel art or simple graphics work best</li>
          <li>• <strong>Text</strong>: Keep it readable at small sizes</li>
        </ul>
      </div>
    </div>
  );
}
