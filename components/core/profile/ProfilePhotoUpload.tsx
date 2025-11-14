import React, { useState, useRef } from 'react';
import ImageCropper from '../../ui/feedback/ImageCropper';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import imageCompression from 'browser-image-compression';

interface ProfilePhotoUploadProps {
  currentAvatarUrl?: string;
  onUploadSuccess: (urls: { thumbnailUrl: string; mediumUrl: string; fullUrl: string }) => void;
  disabled?: boolean;
}

export default function ProfilePhotoUpload({ 
  currentAvatarUrl, 
  onUploadSuccess, 
  disabled = false 
}: ProfilePhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type (GIFs blocked for avatars - use media uploads for animated GIFs)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' ||
                   file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

    if (!allowedTypes.includes(file.type) && !isHEIC) {
      setError('Please select a valid image file (JPEG, PNG, WebP, or HEIC). For animated GIFs, use media uploads.');
      return;
    }

    // Validate file size (20MB limit for modern phone cameras)
    if (file.size > 20 * 1024 * 1024) {
      setError('File size must be less than 20MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Compress image before cropping (handles HEIC conversion automatically)
      const options = {
        maxSizeMB: 3,          // Target 3MB max
        maxWidthOrHeight: 2400, // High quality for displays
        useWebWorker: true,     // Don't block UI
        fileType: 'image/jpeg'  // Convert to JPEG (handles HEIC conversion)
      };

      const compressedFile = await imageCompression(file, options);

      // Create URL for cropping
      const imageUrl = URL.createObjectURL(compressedFile);
      setSelectedImageUrl(imageUrl);
      setShowCropper(true);
      setUploading(false);
    } catch (compressionError: any) {
      console.error('Image compression error:', compressionError);
      setError('Failed to process image. Please try a different file.');
      setUploading(false);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCropper(false);
    setUploading(true);
    setError(null);

    try {
      // Get capability token
      const capRes = await fetch("/api/cap/profile", { method: "POST" });
      if (capRes.status === 401) {
        setError("Please log in to upload a photo");
        setUploading(false);
        return;
      }
      const { token } = await capRes.json();

      // Create form data with cropped image
      const formData = new FormData();
      formData.append('photo', croppedBlob, 'cropped-profile.jpg');
      formData.append('cap', token);

      // Upload photo
      const response = await csrfFetch('/api/profile/upload-photo', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        onUploadSuccess(result.urls);
        setError(null);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      // Clean up object URL
      if (selectedImageUrl) {
        URL.revokeObjectURL(selectedImageUrl);
        setSelectedImageUrl(null);
      }
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl);
      setSelectedImageUrl(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-2">
          <span className="thread-label">Profile Photo</span>
        </label>
        
        {/* Current photo preview */}
        {currentAvatarUrl && (
          <div className="mb-4">
            <p className="text-sm text-thread-sage mb-2">Current photo:</p>
            <img 
              src={currentAvatarUrl} 
              alt="Current profile photo" 
              className="w-20 h-20 rounded-full object-cover border-2 border-thread-sage"
            />
          </div>
        )}
        
        {/* Upload area */}
        <div 
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver 
              ? 'border-thread-pine bg-thread-pine/5' 
              : 'border-thread-sage bg-thread-paper'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-thread-pine'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!disabled ? handleButtonClick : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled || uploading}
          />
          
          {uploading ? (
            <div className="space-y-2">
              <div className="animate-spin w-8 h-8 border-2 border-thread-pine border-t-transparent rounded-full mx-auto"></div>
              <p className="text-thread-sage">Uploading and processing...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-thread-sage text-4xl">📸</div>
              <p className="text-thread-sage">
                {dragOver 
                  ? 'Drop your photo here!' 
                  : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-thread-sage">
                JPEG, PNG, WebP, or GIF • Max 10MB
              </p>
              <p className="text-xs text-thread-sage">
                Select an image to preview and crop before uploading
              </p>
            </div>
          )}
        </div>
        
        {/* Rate limit info */}
        <p className="text-xs text-thread-sage mt-2">
          Rate limit: 5 uploads per hour
        </p>
        
        {/* Error message */}
        {error && (
          <div className="mt-3 p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Image Cropper Modal */}
      {showCropper && selectedImageUrl && (
        <ImageCropper
          imageUrl={selectedImageUrl}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1} // Square crop for profile photos
        />
      )}
    </div>
  );
}