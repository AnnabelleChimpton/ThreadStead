import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface ViewSourceBadgeProps {
  username: string;
}

// Small bottom-corner chip on profiles whose owner shares their source —
// the "View Source" culture, one click instead of Ctrl-U. Renders nothing
// unless sharing is on.
export default function ViewSourceBadge({ username }: ViewSourceBadgeProps) {
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/profile/${encodeURIComponent(username)}/source`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data?.sharing) setSharing(true); })
      .catch(() => { /* badge stays hidden */ });
    return () => { cancelled = true; };
  }, [username]);

  if (!sharing) return null;

  return (
    <Link
      href={`/resident/${username}/source`}
      className="fixed bottom-3 right-3 z-[900] flex items-center gap-1.5 px-2.5 py-1.5 bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 border border-gray-300 rounded-full shadow-sm text-xs font-mono transition-colors"
      title="This resident shares their page source — take a look and learn from it"
    >
      <PixelIcon name="code" size={12} />
      view source
    </Link>
  );
}
