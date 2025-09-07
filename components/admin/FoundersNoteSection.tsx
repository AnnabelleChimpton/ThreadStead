import React, { useState, useEffect } from 'react';

export default function FoundersNoteSection() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load current founder's note
  useEffect(() => {
    fetch('/api/admin/founders-note')
      .then(res => res.json())
      .then(data => {
        setMessage(data.message || '');
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load founders note:', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      const res = await fetch('/api/admin/founders-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (!res.ok) throw new Error('Failed to save');
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save founders note:', error);
      alert('Failed to save founders note');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-3">Founder&apos;s Welcome Note</h3>
      <p className="text-sm text-gray-600 mb-4">
        This message will appear in the welcome dialog when new users complete signup.
        Use it to personally welcome them to your community!
      </p>
      
      <div className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Welcome to our community! We're so glad you're here..."
          className="w-full p-3 border rounded-lg resize-y"
          rows={6}
          maxLength={500}
        />
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {message.length}/500 characters
          </span>
          
          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-sm text-green-600">✓ Saved!</span>
            )}
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </div>
        
        {message && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">Preview:</h4>
            <div className="p-4 bg-white rounded-lg border">
              <h5 className="font-medium mb-2 flex items-center gap-2">
                A Note from the Founder
              </h5>
              <p className="text-gray-700 whitespace-pre-wrap">{message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}