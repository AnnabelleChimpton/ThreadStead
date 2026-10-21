import React, { useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { saveAutoplay, savedAutoplay } from '@/lib/audio/music-preferences';

/**
 * As a visitor: whether other people's profile music may start on its own.
 * The same switch as in the player's "More music controls"; kept on the
 * account and in this browser (lib/audio/music-preferences.ts).
 */
export default function MusicListeningSetting() {
  const { showSuccess, showError } = useToast();
  const [autoplay, setAutoplay] = useState<boolean>(savedAutoplay);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/music-preferences')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.autoplay === 'boolean') {
          setAutoplay(data.autoplay && savedAutoplay());
        }
      })
      .catch(() => { /* the browser's own choice shows */ });
    return () => { cancelled = true; };
  }, []);

  const change = async (next: boolean) => {
    setAutoplay(next);
    setSaving(true);
    try {
      await saveAutoplay(next);
      showSuccess(next ? 'Profile music can start on its own again.' : "Profile music won't start on its own.");
    } catch {
      showError("Couldn't save that. Try again in a moment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="thread-module">
      <h3 className="text-lg font-semibold text-nb-ink mb-2">Other people&apos;s music</h3>
      <label className="flex items-start gap-2 text-nb-ink cursor-pointer">
        <input
          type="checkbox"
          checked={autoplay}
          disabled={saving}
          onChange={(e) => change(e.target.checked)}
          className="mt-1 h-4 w-4 flex-shrink-0 accent-nb-ink"
        />
        <span>Play profile music automatically when I visit</span>
      </label>
      <p className="mt-2 mb-0 text-sm text-nb-ink-mid">
        When this is off, a profile with music shows its player paused. You can still press Play.
      </p>
    </div>
  );
}
