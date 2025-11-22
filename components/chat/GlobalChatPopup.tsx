'use client';

import { useChat } from '@/contexts/ChatContext';
import { useEffect, useState, useCallback } from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';
import CommunityChatPanel from '@/components/community/CommunityChatPanel';
import Link from 'next/link';
import { retroSFX } from '@/lib/audio/retro-sfx';
import { usePathname } from 'next/navigation';

interface PresenceUser {
  userId: string;
  handle: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  lastActiveAt: string;
}

export default function GlobalChatPopup() {
  const { isChatOpen, closeChat } = useChat();
  const pathname = usePathname();
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [presenceData, setPresenceData] = useState<{
    users: PresenceUser[];
    showPresence: boolean;
    togglePresence: () => void;
  } | null>(null);

  useEffect(() => {
    setSfxEnabled(retroSFX.isEnabled());
  }, []);

  const handlePresenceChange = useCallback((users: PresenceUser[], showPresence: boolean, togglePresence: () => void) => {
    setPresenceData({ users, showPresence, togglePresence });
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

  // Don't show popup on the /chat page or when closed
  if (pathname === '/chat' || !isChatOpen) return null;

  return (
    <>
      {/* Mobile: Full screen overlay - positioned below nav bar */}
      <div
        className="md:hidden fixed left-0 right-0 bottom-0 z-[9998] pointer-events-none flex flex-col animate-slide-up"
        style={{ top: 'var(--nav-height, 4rem)' }}
      >
        {/* Header - compact on mobile */}
        <div className="bg-thread-cream border-b border-thread-sage px-3 py-2 flex items-center justify-between shrink-0 pointer-events-auto">
          <h2 className="text-base font-bold text-thread-pine">Lounge Chat</h2>
          <div className="flex items-center gap-1.5">
            {/* Presence button */}
            {presenceData && (
              <button
                onClick={presenceData.togglePresence}
                className="text-thread-sage hover:text-thread-pine transition-colors p-1.5 active:scale-95"
                title={`Show participants (${presenceData.users.length} online)`}
              >
                <PixelIcon name="users" size={18} />
              </button>
            )}
            <button
              onClick={toggleSfx}
              className={`text-thread-sage hover:text-thread-pine transition-colors p-1.5 ${!sfxEnabled ? 'opacity-50' : ''}`}
              title={sfxEnabled ? "Mute sound effects" : "Enable sound effects"}
            >
              <PixelIcon name="speaker" size={18} />
            </button>
            <Link
              href="/chat"
              className="text-thread-sage hover:text-thread-pine transition-colors p-1.5"
              title="Open in fullscreen"
            >
              <PixelIcon name="external-link" size={18} />
            </Link>
            <button
              onClick={closeChat}
              className="flex items-center gap-1 bg-thread-sage/10 hover:bg-thread-sage/20 text-thread-pine font-medium px-2.5 py-1 rounded-full transition-colors text-sm"
              title="Close chat"
            >
              <PixelIcon name="close" size={14} />
            </button>
          </div>
        </div>

        {/* Chat content */}
        <div className="flex-1 overflow-hidden pointer-events-auto bg-thread-paper">
          <CommunityChatPanel popupMode onClose={closeChat} onPresenceChange={handlePresenceChange} />
        </div>
      </div>

      {/* Desktop: Right-side floating popup - flush in bottom-right */}
      <div className="hidden md:flex flex-col fixed top-24 right-0 bottom-0 z-40 w-[480px] bg-thread-paper border-l border-t border-thread-sage rounded-tl-lg shadow-xl animate-slide-in-right overflow-hidden">
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
          <CommunityChatPanel popupMode onClose={closeChat} onPresenceChange={handlePresenceChange} />
        </div>
      </div>

      {/* Mobile backdrop - positioned below nav bar */}
      <div
        className="md:hidden fixed left-0 right-0 bottom-0 bg-black/50 z-[9997]"
        style={{ top: 'var(--nav-height, 4rem)' }}
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
