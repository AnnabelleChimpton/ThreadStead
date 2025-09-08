import React, { useState, useEffect, useRef } from 'react';

interface AudioConfig {
  enabled: boolean;
  url?: string;
  volume?: number;
  originalName?: string;
}

export default function SignupAudioSection() {
  const [config, setConfig] = useState<AudioConfig>({ enabled: false });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/signup-audio');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/admin/signup-audio', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setMessage('Audio uploaded successfully!');
        await fetchConfig();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setMessage(`Upload failed: ${result.error}`);
      }
    } catch (error) {
      setMessage('Upload failed. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/signup-audio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !config.enabled }),
      });

      const result = await response.json();
      setConfig(result);
      setMessage(config.enabled ? 'Signup audio disabled' : 'Signup audio enabled');
    } catch (error) {
      setMessage('Failed to update setting');
    } finally {
      setLoading(false);
    }
  };

  const handleVolumeChange = async (volume: number) => {
    try {
      const response = await fetch('/api/admin/signup-audio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume }),
      });

      const result = await response.json();
      setConfig(result);
    } catch (error) {
      console.error('Failed to update volume:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete the signup audio?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/signup-audio', {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('Audio deleted successfully');
        await fetchConfig();
      } else {
        setMessage('Failed to delete audio');
      }
    } catch (error) {
      setMessage('Failed to delete audio');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (!config.url || !audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.volume = config.volume || 0.7;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Preview failed:', err));
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  return (
    <div className="border border-gray-300 rounded p-4 bg-gray-50">
      <h3 className="font-bold mb-3 flex items-center gap-2">
        Signup Animation Audio
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload an audio file to play during the signup completion animation. 
        This creates a magical moment for new users joining your community.
      </p>

      {message && (
        <div className={`p-2 rounded mb-4 text-sm ${
          message.includes('successfully') || message.includes('enabled') 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Current Status */}
      <div className="mb-4 p-3 border rounded bg-white">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Status:</span>
          <span className={`px-2 py-1 rounded text-xs font-bold ${
            config.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {config.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        
        {config.url && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">File:</span>
              <span className="text-sm font-mono">{config.originalName || 'uploaded-audio'}</span>
            </div>
            
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Volume:</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.volume || 0.7}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm w-8">{Math.round((config.volume || 0.7) * 100)}%</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePreview}
                disabled={loading}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isPlaying ? '⏹️ Stop' : '▶️ Preview'}
              </button>
              
              <button
                onClick={handleToggle}
                disabled={loading}
                className={`px-3 py-1 text-sm rounded font-medium ${
                  config.enabled 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                } disabled:opacity-50`}
              >
                {config.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Upload Section */}
      <form onSubmit={handleUpload} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">
            Upload New Audio File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            Supported formats: MP3, WAV, OGG. Max size: 10MB
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Uploading...' : 'Upload Audio'}
          </button>

          {config.url && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-sm font-medium"
            >
              Delete Audio
            </button>
          )}
        </div>
      </form>

      {/* Hidden audio element for preview */}
      {config.url && (
        <audio ref={audioRef} preload="metadata">
          <source src={config.url} />
        </audio>
      )}
    </div>
  );
}