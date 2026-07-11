import React from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';

interface DraftRestoreBannerProps {
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
}

function describeWhen(savedAt: number): string {
  const minutes = Math.round((Date.now() - savedAt) / 60000);
  if (minutes < 1) return 'moments ago';
  if (minutes === 1) return 'a minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return 'an hour ago';
  if (hours < 48) return `${hours} hours ago`;
  return new Date(savedAt).toLocaleDateString();
}

export default function DraftRestoreBanner({ savedAt, onRestore, onDiscard }: DraftRestoreBannerProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-thread-cream border-b-2 border-thread-sage">
      <PixelIcon name="clock" size={20} />
      <p className="flex-1 text-sm text-thread-charcoal">
        You have unsaved work from {describeWhen(savedAt)}. Want to pick up where you left off?
      </p>
      <button
        onClick={onRestore}
        className="px-3 py-1.5 text-sm font-medium bg-thread-pine text-white rounded hover:opacity-90 transition-opacity"
      >
        Restore draft
      </button>
      <button
        onClick={onDiscard}
        className="px-3 py-1.5 text-sm font-medium bg-white text-thread-charcoal border border-thread-sage rounded hover:bg-gray-50 transition-colors"
      >
        Discard
      </button>
    </div>
  );
}
