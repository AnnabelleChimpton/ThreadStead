import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { csrfFetch } from '@/lib/api/client/csrf-fetch';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface ViewSourceToggleProps {
  username: string;
}

// Owner control for Neocities-style view source. Self-contained: reads and
// writes its own state so any editor surface can drop it in.
export default function ViewSourceToggle({ username }: ViewSourceToggleProps) {
  const [sharing, setSharing] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/profile/${encodeURIComponent(username)}/source`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data) setSharing(!!data.sharing); })
      .catch(() => { /* toggle just stays hidden */ });
    return () => { cancelled = true; };
  }, [username]);

  if (sharing === null) return null;

  const toggle = async () => {
    const next = !sharing;
    setSaving(true);
    setSharing(next);
    try {
      const res = await csrfFetch(`/api/profile/${encodeURIComponent(username)}/source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) setSharing(!next);
    } catch {
      setSharing(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <label className="flex items-center gap-1.5 cursor-pointer text-thread-sage hover:text-thread-charcoal transition-colors">
        <input
          type="checkbox"
          checked={sharing}
          onChange={toggle}
          disabled={saving}
          className="w-3.5 h-3.5"
        />
        <PixelIcon name="code" size={12} />
        Visitors can view my source
      </label>
      {sharing && (
        <Link
          href={`/resident/${username}/source`}
          target="_blank"
          className="text-blue-600 hover:underline"
        >
          see it →
        </Link>
      )}
    </div>
  );
}
