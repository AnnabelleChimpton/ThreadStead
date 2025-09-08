import React, { useState, useEffect } from 'react';
import MidiUpload from './MidiUpload';

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
  const [midiFiles, setMidiFiles] = useState<MidiFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedMidi, setSelectedMidi] = useState<string | null>(null);
  const [autoplayEnabled, setAutoplayEnabled] = useState(false);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

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

  const handleUploadSuccess = (newMedia: any) => {
    if (newMedia.mediaType === 'midi') {
      setMidiFiles(prev => [newMedia, ...prev]);
      setShowUpload(false);
      // Reload to get the full data
      loadMidiFiles();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this MIDI file?')) return;

    try {
      const capRes = await fetch('/api/cap/media', { method: 'POST' });
      if (capRes.status === 401) {
        setError('Please log in to delete files');
        return;
      }
      const { token } = await capRes.json();

      const response = await fetch(`/api/media/${id}`, {
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

      const response = await fetch('/api/profile/midi', {
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
        alert('Profile MIDI updated successfully!');
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

      const response = await fetch('/api/profile/midi', {
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
        setError('Settings saved successfully!');
        setTimeout(() => setError(null), 2000);
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

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-2 border-thread-pine border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-thread-sage">Loading MIDI files...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
          <span className="text-2xl">🎵</span>
          Profile MIDI Music
        </h3>
        <p className="text-gray-600">
          Add nostalgic background music to your profile with MIDI files. Visitors can play, pause, and enjoy your musical selection.
        </p>
      </div>

      {/* Main Control Panel */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold">Music Library</h4>
            <p className="text-sm text-gray-600 mt-1">
              {midiFiles.length === 0 ? 'No MIDI files uploaded yet' : `${midiFiles.length} MIDI file${midiFiles.length === 1 ? '' : 's'} in your library`}
            </p>
          </div>
          {!showUpload && (
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 border border-black bg-purple-200 hover:bg-purple-100 shadow-[2px_2px_0_#000] font-medium transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]"
            >
              <span className="flex items-center gap-2">
                <span>➕</span>
                Upload MIDI
              </span>
            </button>
          )}
        </div>

        {/* Playback Settings - Only show if there are files */}
        {midiFiles.length > 0 && (
          <div className="bg-white border border-purple-200 rounded p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Global Playback Settings</h4>
              {selectedMidi && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Applied to selected track
                </span>
              )}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer hover:bg-purple-50 p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={autoplayEnabled}
                  onChange={(e) => setAutoplayEnabled(e.target.checked)}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span className="text-sm font-medium">Autoplay on profile load</span>
                  <p className="text-xs text-gray-500">Music starts automatically when someone visits your profile</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer hover:bg-purple-50 p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={loopEnabled}
                  onChange={(e) => setLoopEnabled(e.target.checked)}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span className="text-sm font-medium">Loop continuously</span>
                  <p className="text-xs text-gray-500">Replay the track when it ends</p>
                </div>
              </label>
            </div>
            <div className="flex justify-end pt-2 border-t border-purple-100">
              <button
                onClick={saveGlobalSettings}
                className="px-3 py-1.5 text-sm border border-purple-300 bg-purple-100 hover:bg-purple-200 rounded font-medium transition-colors"
              >
                💾 Save Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Section */}
      {showUpload && (
        <MidiUpload 
          onUploadSuccess={handleUploadSuccess}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {/* MIDI Files List */}
      {midiFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Your MIDI Files</h4>
            <span className="text-sm text-gray-500">
              {selectedMidi ? '✓ Profile music selected' : 'Select a file to set as profile music'}
            </span>
          </div>
          {midiFiles.map((file) => (
            <div
              key={file.id}
              className={`border-2 rounded-lg p-4 transition-all ${
                selectedMidi === file.id 
                  ? 'border-purple-400 bg-gradient-to-r from-purple-50 to-pink-50 shadow-md' 
                  : 'border-gray-200 bg-white hover:border-purple-200 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`text-3xl mt-1 ${selectedMidi === file.id ? 'animate-pulse' : ''}`}>
                    {selectedMidi === file.id ? '🎵' : '🎹'}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">
                      {file.title || file.originalName || 'Untitled MIDI'}
                      {selectedMidi === file.id && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          Active
                        </span>
                      )}
                    </h5>
                    {file.caption && (
                      <p className="text-sm text-gray-600 mt-1">{file.caption}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                      <span className="flex items-center gap-1">
                        📁 {formatFileSize(file.fileSize)}
                      </span>
                      <span className="flex items-center gap-1">
                        📅 {formatDate(file.createdAt)}
                      </span>
                      {file.featured && (
                        <span className="flex items-center gap-1 text-amber-600">
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {selectedMidi !== file.id ? (
                    <button
                      onClick={() => handleSetAsProfile(file.id)}
                      className="px-3 py-1.5 text-sm border border-purple-300 bg-purple-100 hover:bg-purple-200 rounded font-medium transition-colors"
                    >
                      Set as Profile
                    </button>
                  ) : (
                    <button
                      disabled
                      className="px-3 py-1.5 text-sm border border-green-300 bg-green-100 rounded font-medium text-green-700 cursor-not-allowed"
                    >
                      ✓ Active
                    </button>
                  )}
                  <button
                    onClick={() => window.open(file.fullUrl, '_blank')}
                    className="px-3 py-1.5 text-sm border border-gray-300 bg-white hover:bg-gray-50 rounded transition-colors"
                    title="Download MIDI file"
                  >
                    ⬇ Download
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="px-3 py-1.5 text-sm border border-red-200 bg-white hover:bg-red-50 rounded text-red-600 hover:text-red-700 transition-colors"
                    title="Delete this file"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {midiFiles.length === 0 && !showUpload && (
          <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-5xl mb-3">🎼</div>
            <h4 className="font-medium mb-2">No MIDI files yet</h4>
            <p className="text-sm text-gray-600 mb-4">
              Upload MIDI files to add background music to your profile
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 border border-black bg-yellow-200 hover:bg-yellow-100 shadow-[2px_2px_0_#000] font-medium"
            >
              Upload Your First MIDI
            </button>
          </div>
      )}

      {error && (
        <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}