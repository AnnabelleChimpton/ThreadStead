import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import LoadingSpinner from '@/components/ui/feedback/LoadingSpinner';
import ErrorDisplay from '@/components/ui/feedback/ErrorDisplay';

// Dynamic import of MidiPlayer to avoid SSR issues
const MidiPlayer = dynamic(() => import('@/components/ui/media/MidiPlayer'), {
  ssr: false,
  loading: () => <LoadingSpinner layout="row" message="Loading player..." className="justify-start" />
});

interface MidiFile {
  id: string;
  title?: string;
  caption?: string;
  fullUrl: string;
  originalName?: string;
  fileSize?: number;
  createdAt: string;
  featured: boolean;
  featuredOrder?: number;
}

interface MidiManagerProps {
  username: string;
}

export default function MidiManager({ username }: MidiManagerProps) {
  const { showSuccess } = useToast();
  const confirm = useConfirm();
  const [midiFiles, setMidiFiles] = useState<MidiFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMidi, setSelectedMidi] = useState<string | null>(null);
  const [autoplayEnabled, setAutoplayEnabled] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewingMidi, setPreviewingMidi] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadMidiFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/media/midi/${username}`);
      if (response.ok) {
        const data = await response.json();
        setMidiFiles(data.files || []);
      } else {
        setError('Failed to load MIDI files');
      }
    } catch (err) {
      setError('Failed to load MIDI files');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentSettings = async () => {
    // Only load if we haven't loaded settings yet to avoid excessive API calls
    if (settingsLoaded) {
      return;
    }
    
    try {
      const response = await fetch(`/api/profile/${username}`);
      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setSelectedMidi(data.profile.profileMidiId);
          setAutoplayEnabled(data.profile.midiAutoplay || false);
          setLoopEnabled(data.profile.midiLoop || false);
        }
        setSettingsLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load current MIDI settings:', err);
      setSettingsLoaded(true); // Mark as loaded even on error to prevent retries
    }
  };

  useEffect(() => {
    setSettingsLoaded(false); // Reset settings loaded flag when username changes
    loadMidiFiles();
    loadCurrentSettings();
  }, [username]);


  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete this MIDI file?', message: "This can't be undone.", confirmText: 'Delete', variant: 'danger' }))) return;

    try {
      const capRes = await fetch('/api/cap/media', { method: 'POST' });
      if (capRes.status === 401) {
        setError('Please log in to delete files');
        return;
      }
      const { token } = await capRes.json();

      const response = await csrfFetch(`/api/media/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cap: token }),
      });

      if (response.ok) {
        setMidiFiles(prev => prev.filter(f => f.id !== id));
      } else {
        setError('Failed to delete file');
      }
    } catch (err) {
      setError('Failed to delete file');
    }
  };

  const handleSetAsProfile = async (id: string) => {
    try {
      const capRes = await fetch('/api/cap/profile', { method: 'POST' });
      if (capRes.status === 401) {
        setError('Please log in');
        return;
      }
      const { token } = await capRes.json();

      const response = await csrfFetch('/api/profile/midi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          midiId: id,
          autoplay: autoplayEnabled,
          loop: loopEnabled,
          cap: token
        }),
      });

      if (response.ok) {
        setSelectedMidi(id);
        showSuccess('Profile music updated.');
      } else {
        setError('Failed to update profile MIDI');
      }
    } catch (err) {
      setError('Failed to update profile MIDI');
    }
  };

  const saveGlobalSettings = async () => {
    try {
      const capRes = await fetch('/api/cap/profile', { method: 'POST' });
      if (capRes.status === 401) {
        setError('Please log in');
        return;
      }
      const { token } = await capRes.json();

      const response = await csrfFetch('/api/profile/midi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          midiId: selectedMidi,
          autoplay: autoplayEnabled,
          loop: loopEnabled,
          cap: token
        }),
      });

      if (response.ok) {
        // Show a brief success message
        setSuccess('Settings saved.');
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError('Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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

      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file
        const allowedTypes = ['audio/midi', 'audio/x-midi', 'application/x-midi'];
        const allowedExtensions = ['.mid', '.midi'];
        
        const hasValidType = allowedTypes.includes(file.type);
        const hasValidExtension = allowedExtensions.some(ext => 
          file.name.toLowerCase().endsWith(ext)
        );

        if (!hasValidType && !hasValidExtension) {
          setError(`"${file.name}" is not a valid MIDI file`);
          continue;
        }

        if (file.size > 1 * 1024 * 1024) {
          setError(`"${file.name}" is too large (max 1MB)`);
          continue;
        }

        // Create form data
        const formData = new FormData();
        formData.append('image', file); // Using 'image' field name for compatibility
        formData.append('cap', token);
        formData.append('title', file.name.replace(/\.(mid|midi)$/i, '')); // Auto title from filename

        // Upload file
        const response = await csrfFetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (response.ok) {
          // Add to local state
          setMidiFiles(prev => [result.media, ...prev]);
        } else {
          setError(result.error || `Failed to upload "${file.name}"`);
        }
      }

      // Reload files to ensure we have the latest data
      loadMidiFiles();
      
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      // Clear the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading MIDI files..." className="py-8" />;
  }

  return (
    <div className="space-y-4">
      {/* Current Profile Music Status - Most Important Info First */}
      <div className="bg-white border border-nb-ink-mid/40 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PixelIcon name="music" size={32} />
            <div>
              <h3 className="font-semibold">Profile Music</h3>
              {selectedMidi ? (
                <p className="text-sm text-nb-ink">
                  <PixelIcon name="check" size={16} className="inline-block align-middle" /> Background music is active ({midiFiles.find(f => f.id === selectedMidi)?.title || 'Unnamed Track'})
                </p>
              ) : midiFiles.length > 0 ? (
                <p className="text-sm text-amber-600">
                  <PixelIcon name="alert" size={16} className="inline-block align-middle" /> You have {midiFiles.length} track{midiFiles.length === 1 ? '' : 's'} but none selected for your profile
                </p>
              ) : (
                <p className="text-sm text-nb-ink-mid">
                  No background music set up yet
                </p>
              )}
            </div>
          </div>
          
          {/* Quick Upload Button */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".mid,.midi,audio/midi"
              onChange={handleFileInputChange}
              className="hidden"
              multiple
            />
            <button
              onClick={handleButtonClick}
              disabled={uploading}
              className={`px-3 py-1.5 text-sm border font-medium rounded transition-all ${
                uploading 
                  ? 'border-nb-ink-mid/40 bg-nb-ink-mid/5 text-nb-ink-mid cursor-not-allowed' 
                  : 'border-nb-ink-mid/50 border-2 border-dotted border-nb-ink-mid/60 rounded-md text-nb-ink hover:bg-nb-paper'
              }`}
            >
              {uploading ? (
                <span className="flex items-center gap-1">
                  <PixelIcon name="clock" size={16} className="animate-spin" />
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <PixelIcon name="folder" size={16} />
                  Add Files
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Control Panel */}
      <div className="space-y-4">

        {/* Playback Settings - Compact version, only show if there are files */}
        {midiFiles.length > 0 && (
          <div className="bg-nb-ink-mid/5 border border-nb-ink-mid/40 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-nb-ink">Playback Settings</h4>
              <button
                onClick={saveGlobalSettings}
                className="thread-button-secondary btn btn--secondary text-xs"
              >
                <PixelIcon name="save" size={12} className="inline-block align-middle" /> Save
              </button>
            </div>
            <div className="flex items-center gap-6 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoplayEnabled}
                  onChange={(e) => setAutoplayEnabled(e.target.checked)}
                  className="w-3 h-3 text-nb-ink focus:ring-nb-lav"
                />
                <span className="text-xs text-nb-ink-mid">Autoplay when visitors arrive</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={loopEnabled}
                  onChange={(e) => setLoopEnabled(e.target.checked)}
                  className="w-3 h-3 text-nb-ink focus:ring-nb-lav"
                />
                <span className="text-xs text-nb-ink-mid">Loop continuously</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* MIDI Files List */}
      {midiFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Your MIDI Files</h4>
            <span className="text-sm text-nb-ink-mid">
              {selectedMidi ? <><PixelIcon name="check" size={14} className="inline-block align-middle" /> Profile music selected</> : 'Select a file to set as profile music'}
            </span>
          </div>
          {midiFiles.map((file) => (
            <div
              key={file.id}
              className={`border-2 rounded-lg p-4 transition-all ${
                selectedMidi === file.id 
                  ? 'border-nb-ink-mid/50 bg-nb-paper shadow-md' 
                  : 'border-nb-ink-mid/40 bg-white hover:border-nb-ink-mid/50 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`mt-1 ${selectedMidi === file.id ? 'animate-pulse' : ''}`}>
                    <PixelIcon name="music" size={32} />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-nb-ink">
                      {file.title || file.originalName || 'Untitled MIDI'}
                      {selectedMidi === file.id && (
                        <span className="thread-button-secondary btn btn--secondary inline-flex items-center text-xs">
                          Active
                        </span>
                      )}
                    </h5>
                    {file.caption && (
                      <p className="text-sm text-nb-ink-mid mt-1">{file.caption}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-nb-ink-mid mt-2">
                      <span className="flex items-center gap-1">
                        <PixelIcon name="folder" size={12} /> {formatFileSize(file.fileSize)}
                      </span>
                      <span className="flex items-center gap-1">
                        <PixelIcon name="calendar" size={12} /> {formatDate(file.createdAt)}
                      </span>
                      {file.featured && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <PixelIcon name="bookmark" size={12} /> Featured
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {selectedMidi !== file.id ? (
                    <button
                      onClick={() => handleSetAsProfile(file.id)}
                      className="thread-button-secondary btn btn--secondary text-sm"
                    >
                      Set as Profile
                    </button>
                  ) : (
                    <button
                      disabled
                      className="thread-button btn btn--primary text-sm"
                    >
                      <PixelIcon name="check" size={14} className="inline-block align-middle" /> Active
                    </button>
                  )}
                  <button
                    onClick={() => setPreviewingMidi(previewingMidi === file.id ? null : file.id)}
                    className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                      previewingMidi === file.id
                        ? 'border-nb-ink-mid/50 bg-nb-paper hover:bg-nb-paper text-nb-ink'
                        : 'border-nb-ink-mid/40 bg-white hover:bg-nb-ink-mid/5'
                    }`}
                    title={previewingMidi === file.id ? 'Close preview' : 'Preview MIDI'}
                  >
                    <PixelIcon name={previewingMidi === file.id ? 'close' : 'play'} size={14} className="inline-block align-middle" /> {previewingMidi === file.id ? 'Close' : 'Preview'}
                  </button>
                  <button
                    onClick={() => window.open(file.fullUrl, '_blank')}
                    className="thread-button-secondary btn btn--secondary text-sm"
                    title="Download MIDI file"
                  >
                    <PixelIcon name="download" size={14} className="inline-block align-middle" /> Download
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="thread-button-secondary btn btn--secondary text-sm"
                    title="Delete this file"
                  >
                    <PixelIcon name="trash" size={14} className="inline-block align-middle" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}


      {error && (
        <ErrorDisplay title={error} />
      )}

      {success && (
        <div className="p-3 border-2 border-dotted border-nb-ink-mid/60 rounded-md text-nb-ink border border-nb-ink-mid/50 rounded text-sm">
          {success}
        </div>
      )}

      {/* Fixed MIDI Player in bottom right - using portal to render at body level */}
      {isMounted && previewingMidi && createPortal(
        <div className="fixed bottom-4 right-4 z-50 shadow-2xl rounded-lg bg-white border-2 border-nb-ink-mid/50">
          <div className="thread-button-secondary btn btn--secondary flex items-center">
            <span className="text-sm font-medium text-nb-ink">
              {midiFiles.find(f => f.id === previewingMidi)?.title || 'Preview'}
            </span>
            <button
              onClick={() => setPreviewingMidi(null)}
              className="text-nb-ink-mid hover:text-nb-ink transition-colors"
              title="Close preview"
            >
              <PixelIcon name="close" size={16} />
            </button>
          </div>
          <div className="p-2">
            <MidiPlayer
              midiUrl={`/api/media/serve/${previewingMidi}`}
              autoplay={false}
              loop={false}
              defaultMode="compact"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}