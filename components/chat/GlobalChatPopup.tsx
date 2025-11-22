'use client';

import { useChat } from '@/contexts/ChatContext';
import { useEffect, useState } from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';
import CommunityChatPanel from '@/components/community/CommunityChatPanel';
import Link from 'next/link';
import { retroSFX } from '@/lib/audio/retro-sfx';

export default function GlobalChatPopup() {
  const { isChatOpen, closeChat } = useChat();
  const [sfxEnabled, setSfxEnabled] = useState(true);

  useEffect(() => {
    setSfxEnabled(retroSFX.isEnabled());
  }, []);

  const toggleSfx = () => {
    const newState = !sfxEnabled;
    setSfxEnabled(newState);
    retroSFX.setEnabled(newState);
  };

  // Handle Escape key to close popup
  useEffect(() => {
    if (!isChatOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeChat();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isChatOpen, closeChat]);

  if (!isChatOpen) return null;

  return (
    <>
      {/* Mobile: Full screen overlay */}
      <div className="md:hidden fixed inset-0 z-50 bg-thread-paper flex flex-col animate-slide-up">
        {/* Header */}
        <div className="bg-thread-cream border-b border-thread-sage p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-thread-pine">Lounge Chat</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSfx}
              className={`text-thread-sage hover:text-thread-pine transition-colors p-2 ${!sfxEnabled ? 'opacity-50' : ''}`}
              title={sfxEnabled ? "Mute sound effects" : "Enable sound effects"}
            >
              <PixelIcon name="speaker" size={20} />
            </button>
            <Link
              href="/chat"
              className="text-thread-sage hover:text-thread-pine transition-colors p-2"
              title="Open in fullscreen"
            >
              <PixelIcon name="external-link" size={20} />
            </Link>
            <button
              onClick={closeChat}
              className="text-thread-sage hover:text-thread-pine transition-colors p-2"
              title="Close chat"
            >
              <PixelIcon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* Chat content */}
        <div className="flex-1 overflow-hidden">
          <CommunityChatPanel popupMode onClose={closeChat} />
        </div>
      </div>

      {/* Desktop: Right-side floating popup */}
      <div className="hidden md:flex flex-col fixed top-24 right-5 bottom-5 z-40 w-[480px] bg-thread-paper border border-thread-sage rounded-lg shadow-xl animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="bg-thread-cream border-b border-thread-sage p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PixelIcon name="chat" size={20} className="text-thread-pine" />
            <h3 className="text-sm font-bold text-thread-pine">Lounge Chat</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSfx}
              className={`text-thread-sage hover:text-thread-pine transition-colors p-1.5 rounded hover:bg-thread-sage/10 ${!sfxEnabled ? 'opacity-50' : ''}`}
              title={sfxEnabled ? "Mute sound effects" : "Enable sound effects"}
            >
              <PixelIcon name="speaker" size={16} />
            </button>
            <Link
              href="/chat"
              className="text-thread-sage hover:text-thread-pine transition-colors p-1.5 rounded hover:bg-thread-sage/10"
              title="Open in fullscreen"
            >
              <PixelIcon name="external-link" size={16} />
            </Link>
            <button
              onClick={closeChat}
              className="text-thread-sage hover:text-thread-pine transition-colors p-1.5 rounded hover:bg-thread-sage/10"
              title="Close chat"
            >
              <PixelIcon name="close" size={16} />
            </button>
          </div>
        </div>

        {/* Chat content */}
        <div className="flex-1 overflow-hidden">
          <CommunityChatPanel popupMode onClose={closeChat} />
        </div>
      </div>

      {/* Mobile backdrop (optional, for consistency) */}
      <div
        className="md:hidden fixed inset-0 bg-black/50 z-40"
        onClick={closeChat}
        aria-hidden="true"
      />

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 300ms ease-out;
        }

        .animate-slide-in-right {
          animation: slide-in-right 300ms ease-out;
        }
      `}</style>
    </>
  );
}
