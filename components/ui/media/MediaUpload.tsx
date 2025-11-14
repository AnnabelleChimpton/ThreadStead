import React, { useState, useRef } from 'react';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import imageCompression from 'browser-image-compression';

interface MediaUploadProps {
  onUploadSuccess: (media: any) => void;
  disabled?: boolean;
}

export default function MediaUpload({ onUploadSuccess, disabled = false }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [showCaptionWarning, setShowCaptionWarning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inspirational placeholders that rotate
  const placeholders = [
    "What's on your mind today?",
    "Every image has a story — what's yours?",
    "Write a note to go with your photo...",
    "What made you capture this moment?",
    "Share the story behind this image...",
  ];
  
  const uploadButtonTexts = [
    "Attach an image",
    "Illustrate your thought", 
    "Add a picture to your note",
    "Choose your image",
  ];

  const [currentPlaceholder] = useState(() => 
    placeholders[Math.floor(Math.random() * placeholders.length)]
  );
  
  const [currentButtonText] = useState(() =>
    uploadButtonTexts[Math.floor(Math.random() * uploadButtonTexts.length)]
  );

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    const allowedMidiTypes = ['audio/midi', 'audio/x-midi', 'application/x-midi'];
    const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' ||
                   file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    const isMidi = allowedMidiTypes.includes(file.type);
    const isGif = file.type === 'image/gif';

    if (!allowedImageTypes.includes(file.type) && !isMidi && !isHEIC) {
      setError('Please select a valid image file (JPEG, PNG, WebP, GIF, or HEIC) or MIDI file');
      return;
    }

    // Validate file size (25MB limit for modern phone cameras)
    if (file.size > 25 * 1024 * 1024) {
      setError('File size must be less than 25MB');
      return;
    }

    setError(null);

    // For MIDI files, skip compression
    if (isMidi) {
      setSelectedFile(file);
      setPreviewUrl('midi-placeholder');
      return;
    }

    // For GIFs, skip compression to preserve animation
    if (isGif) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Compress other images (JPEG, PNG, WebP, HEIC)
    try {
      setUploading(true);
      const options = {
        maxSizeMB: 3,          // Target 3MB max
        maxWidthOrHeight: 2400, // High quality for displays
        useWebWorker: true,     // Don't block UI
        fileType: 'image/jpeg'  // Convert to JPEG (handles HEIC conversion)
      };

      const compressedFile = await imageCompression(file, options);
      setSelectedFile(compressedFile);

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(compressedFile);
      setUploading(false);
    } catch (compressionError: any) {
      console.error('Image compression error:', compressionError);
      setError('Failed to process image. Please try a different file.');
      setUploading(false);
    }
  };

  const handleUpload = async (skipCaptionCheck = false) => {
    if (!selectedFile) return;

    // Check if user wants to add a caption
    if (!skipCaptionCheck && !caption.trim() && !title.trim()) {
      setShowCaptionWarning(true);
      return;
    }

    setUploading(true);
    setError(null);
    setShowCaptionWarning(false);

    try {
      // Get capability token
      const capRes = await fetch("/api/cap/media", { method: "POST" });
      if (capRes.status === 401) {
        setError("Please log in to upload media");
        setUploading(false);
        return;
      }
      const { token } = await capRes.json();

      // Create form data
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('cap', token);
      if (caption.trim()) formData.append('caption', caption.trim());
      if (title.trim()) formData.append('title', title.trim());

      // Upload media
      const response = await csrfFetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        onUploadSuccess(result.media);
        // Reset form
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption('');
        setTitle('');
        setError(null);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
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

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setShowCaptionWarning(false);
  };

  return (
    <div className="space-y-6 bg-thread-cream/30 border border-thread-sage/50 rounded-lg p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-thread-pine mb-2">Share a moment</h3>
        <p className="text-thread-sage text-sm">
          {currentPlaceholder}
        </p>
      </div>

      {/* Caption/Story Input */}
      <div className="space-y-4">
        <div>
          <label className="block mb-2">
            <span className="thread-label">Title (optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-thread-sage p-3 bg-thread-paper rounded focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
            placeholder="Give your image a title..."
            disabled={disabled || uploading}
            maxLength={100}
          />
        </div>
        
        <div>
          <label className="block mb-2">
            <span className="thread-label">Your story</span>
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            className="w-full border border-thread-sage p-3 bg-thread-paper rounded focus:border-thread-pine focus:ring-1 focus:ring-thread-pine"
            placeholder={currentPlaceholder}
            disabled={disabled || uploading}
            maxLength={500}
          />
          <div className="text-xs text-thread-sage mt-1">
            {caption.length}/500 characters
          </div>
        </div>
      </div>

      {/* Image Selection/Preview */}
      {!selectedFile ? (
        <div 
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
            accept="image/*,.mid,.midi,.heic,.heif,audio/midi"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled || uploading}
          />
          
          <div className="space-y-3">
            <div className="text-thread-sage text-5xl">📷</div>
            <div>
              <p className="text-thread-pine font-medium mb-1">
                {dragOver ? 'Drop your file here!' : currentButtonText}
              </p>
              <p className="text-xs text-thread-sage">
                JPEG, PNG, WebP, GIF, or MIDI • Max 15MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative">
            {previewUrl === 'midi-placeholder' ? (
              <div className="w-full max-w-md mx-auto rounded-lg shadow-sm border border-thread-sage bg-thread-paper p-8 text-center">
                <div className="text-6xl mb-2">🎵</div>
                <p className="text-thread-pine font-medium">MIDI File</p>
                <p className="text-sm text-thread-sage mt-1">Ready to upload</p>
              </div>
            ) : (
              <img 
                src={previewUrl || ''} 
                alt="Preview" 
                className="w-full max-w-md mx-auto rounded-lg shadow-sm border border-thread-sage"
              />
            )}
            <button
              onClick={handleRemoveFile}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
              disabled={uploading}
            >
              ×
            </button>
          </div>
          
          <div className="text-center text-sm text-thread-sage">
            {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
          </div>
        </div>
      )}

      {/* Caption Warning */}
      {showCaptionWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm mb-3">
            Your photo will look even better with a caption. Want to add a line about it?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCaptionWarning(false)}
              className="text-sm px-3 py-1 border border-yellow-300 rounded text-yellow-700 hover:bg-yellow-100"
            >
              Add a caption
            </button>
            <button
              onClick={() => handleUpload(true)}
              className="text-sm px-3 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300"
              disabled={uploading}
            >
              Post anyway
            </button>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && !showCaptionWarning && (
        <div className="text-center">
          <button
            onClick={() => handleUpload()}
            disabled={disabled || uploading}
            className="thread-button"
          >
            {uploading ? "Sharing your moment..." : "Share this moment"}
          </button>
        </div>
      )}

      {/* Rate limit info */}
      <p className="text-xs text-thread-sage text-center">
        Rate limit: 30 uploads per day • 50 images per month
      </p>
      
      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}