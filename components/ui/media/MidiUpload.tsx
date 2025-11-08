import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';

interface MidiUploadProps {
  onUploadSuccess: (media: any) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export default function MidiUpload({ onUploadSuccess, onCancel, disabled = false }: MidiUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: string;
    duration?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const analyzeMIDIComplexity = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { Midi } = await import('@tonejs/midi');
      const midi = new Midi(arrayBuffer);
      
      let totalNotes = 0;
      let maxConcurrent = 0;
      let currentConcurrent = 0;
      const allEvents: Array<{time: number, type: 'on' | 'off'}> = [];
      
      midi.tracks.forEach(track => {
        track.notes.forEach(note => {
          allEvents.push({ time: note.time, type: 'on' });
          allEvents.push({ time: note.time + note.duration, type: 'off' });
          totalNotes++;
        });
      });
      
      allEvents.sort((a, b) => a.time - b.time);
      
      for (const event of allEvents) {
        if (event.type === 'on') {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        } else {
          currentConcurrent = Math.max(0, currentConcurrent - 1);
        }
      }
      
      return {
        totalNotes,
        maxConcurrent,
        duration: midi.duration,
        tracks: midi.tracks.length,
        isComplex: totalNotes > 2000 || maxConcurrent > 64
      };
    } catch (error) {
      console.warn('Could not analyze MIDI complexity:', error);
      return null;
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['audio/midi', 'audio/x-midi', 'application/x-midi'];
    const allowedExtensions = ['.mid', '.midi'];
    
    const hasValidType = allowedTypes.includes(file.type);
    const hasValidExtension = allowedExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidType && !hasValidExtension) {
      setError('Please select a valid MIDI file (.mid or .midi)');
      return;
    }

    // Validate file size (1MB limit for MIDI files - they're usually tiny)
    if (file.size > 1 * 1024 * 1024) {
      setError('MIDI file size must be less than 1MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    
    // Extract file info and analyze complexity
    const sizeKB = (file.size / 1024).toFixed(1);
    let complexityInfo = '';
    
    const complexity = await analyzeMIDIComplexity(file);
    if (complexity) {
      const { totalNotes, maxConcurrent, duration, tracks, isComplex } = complexity;
      
      if (isComplex) {
        complexityInfo = ` ⚠️ Complex file (${totalNotes} notes)`;
        setError(`This MIDI file is quite complex (${totalNotes} notes across ${tracks} tracks). It may have reduced playback quality for performance reasons.`);
      } else {
        complexityInfo = ` ✅ Optimized (${totalNotes} notes)`;
      }
    }
    
    setFileInfo({
      name: file.name,
      size: `${sizeKB} KB${complexityInfo}`,
      duration: complexity ? `${complexity.duration.toFixed(1)}s` : undefined,
    });

    // Auto-fill title from filename if empty
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.(mid|midi)$/i, '');
      setTitle(nameWithoutExt);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a MIDI file');
      return;
    }

    if (!title.trim()) {
      setError('Please add a title for your MIDI file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Get capability token
      const capRes = await fetch("/api/cap/media", { method: "POST" });
      if (capRes.status === 401) {
        setError("Please log in to upload MIDI files");
        setUploading(false);
        return;
      }
      const { token } = await capRes.json();

      // Create form data
      const formData = new FormData();
      formData.append('image', selectedFile); // Using 'image' field name for compatibility
      formData.append('cap', token);
      formData.append('title', title.trim());
      if (description.trim()) {
        formData.append('caption', description.trim());
      }

      // Upload MIDI file
      const response = await csrfFetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        onUploadSuccess(result.media);
        // Reset form
        setSelectedFile(null);
        setFileInfo(null);
        setTitle('');
        setDescription('');
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
    setFileInfo(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-2xl">🎵</span>
          Upload MIDI File
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Add background music to your profile (MIDI format only)
        </p>
      </div>

      {/* File Info */}
      <div className="space-y-4">
        {/* Title Input */}
        <div>
          <label className="block mb-2">
            <span className="text-sm font-medium">Title *</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-purple-200 p-3 bg-white rounded focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
            placeholder="Enter a title for your MIDI track..."
            disabled={disabled || uploading}
            maxLength={100}
          />
        </div>

        {/* Description Input */}
        <div>
          <label className="block mb-2">
            <span className="text-sm font-medium">Description (optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full border border-purple-200 p-3 bg-white rounded focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
            placeholder="Add notes about this track (composer, style, etc.)"
            disabled={disabled || uploading}
            maxLength={300}
          />
          <div className="text-xs text-gray-500 mt-1">
            {description.length}/300 characters
          </div>
        </div>

        {/* File Selection/Display */}
        {!selectedFile ? (
          <div 
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
              dragOver 
                ? 'border-purple-400 bg-purple-100' 
                : 'border-purple-200 bg-white hover:border-purple-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!disabled ? handleButtonClick : undefined}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mid,.midi,audio/midi"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={disabled || uploading}
            />
            
            <div className="space-y-3">
              <div className="text-4xl animate-bounce">🎹</div>
              <div>
                <p className="font-medium text-purple-700 mb-1">
                  {dragOver ? '🎯 Drop your MIDI file here!' : '📂 Select MIDI File'}
                </p>
                <p className="text-sm text-purple-600 mb-2">
                  File dialog should open automatically, or click here
                </p>
                <div className="inline-flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span>🎵</span> .mid or .midi files
                  </span>
                  <span className="flex items-center gap-1">
                    <span>📏</span> Max 1MB
                  </span>
                  <span className="flex items-center gap-1">
                    <span>🎧</span> Drag & drop supported
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-purple-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🎼</div>
                <div>
                  <p className="font-medium text-purple-700">{fileInfo?.name}</p>
                  <p className="text-sm text-gray-500">{fileInfo?.size}</p>
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="text-red-500 hover:text-red-700 text-xl font-bold"
                disabled={uploading}
                title="Remove file"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* MIDI Info Box */}
        <div className="bg-purple-50 border border-purple-200 rounded p-3">
          <p className="text-xs text-purple-700 mb-2">
            <strong>💡 Pro tip:</strong> MIDI files are perfect for profile music because they&apos;re tiny,
            load instantly, and create a nostalgic web 1.0 vibe!
          </p>
          <p className="text-xs text-purple-600">
            <strong>Need help?</strong> Our <Link href="/help/music-guide" className="underline hover:text-purple-900">music creator&apos;s guide</Link> has composition tips, software recommendations, and technical specifications.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-2">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={uploading}
              className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 rounded font-medium transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleUpload}
            disabled={disabled || uploading || !selectedFile || !title.trim()}
            className="px-4 py-2 border border-purple-300 bg-purple-200 hover:bg-purple-300 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Uploading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>🎵</span>
                Upload MIDI
              </span>
            )}
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}