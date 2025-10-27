import React, { useState, useRef } from 'react';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

interface BadgeUploadProps {
  onUploadSuccess: (badgeUrls: { badgeImageUrl: string; badgeImageHighResUrl: string }) => void;
  disabled?: boolean;
  ringSlug: string;
}

export default function BadgeUpload({ onUploadSuccess, disabled = false, ringSlug }: BadgeUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateImageFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(file.type) || file.name.toLowerCase().endsWith('.jpg') ||
           file.name.toLowerCase().endsWith('.jpeg') || file.name.toLowerCase().endsWith('.png') ||
           file.name.toLowerCase().endsWith('.gif') || file.name.toLowerCase().endsWith('.webp');
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;

    if (!validateImageFile(file)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit for badges
      setError('Badge image must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      // Get upload capability
      const capRes = await fetch('/api/cap/media', { method: 'POST' });
      if (!capRes.ok) {
        throw new Error('Failed to get upload permission');
      }
      const { token } = await capRes.json();

      // Upload using media API with badge context
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('cap', token);
      formData.append('context', 'threadring_badge');
      formData.append('ringSlug', ringSlug); // Include ring slug for badge processing

      const response = await csrfFetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        // For badges, we need both standard and high-res URLs
        onUploadSuccess({
          badgeImageUrl: result.media.mediumUrl, // Use medium for standard badge
          badgeImageHighResUrl: result.media.fullUrl // Use full for high-res badge
        });

        // Reset form
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload badge image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* File Drop Zone */}
      <div
        className={`border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? 'border-thread-pine bg-thread-cream'
            : 'border-thread-sage hover:border-thread-pine'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        {selectedFile ? (
          <div className="space-y-4">
            {previewUrl && (
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="Badge preview"
                  className="max-w-32 max-h-16 object-contain border border-thread-sage"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            )}
            <div>
              <p className="font-medium text-thread-pine">{selectedFile.name}</p>
              <p className="text-sm text-thread-sage">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleUpload}
                disabled={uploading || disabled}
                className="px-4 py-2 border border-black bg-green-200 hover:bg-green-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0_#000]"
              >
                {uploading ? '🔄 Uploading...' : '🚀 Upload Badge'}
              </button>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                disabled={uploading}
                className="px-4 py-2 border border-black bg-gray-200 hover:bg-gray-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-2">🎨</div>
            <p className="text-thread-pine font-medium mb-2">
              Drop your badge image here or click to browse
            </p>
            <p className="text-sm text-thread-sage mb-4">
              Best results with 88x31 pixels. PNG, JPEG, GIF, or WebP. Max 10MB.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="px-4 py-2 border border-black bg-white hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] disabled:opacity-50"
            >
              Choose Badge Image
            </button>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-800 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 p-4 text-sm">
        <h5 className="font-bold text-blue-900 mb-2">🎯 Badge Guidelines</h5>
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