'use client';

import { useChat } from '@/contexts/ChatContext';
import { useEffect } from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';
import CommunityChatPanel from '@/components/community/CommunityChatPanel';
import Link from 'next/link';

export default function GlobalChatPopup() {
  const { isChatOpen, closeChat } = useChat();

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
      <div className="hidden md:flex flex-col fixed top-24 right-0 bottom-0 z-40 w-[380px] bg-thread-paper border-l-2 border-thread-sage shadow-xl animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="bg-thread-cream border-b border-thread-sage p-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-thread-pine">Lounge Chat</h3>
          <div className="flex items-center gap-1">
            <Link
              href="/chat"
              className="text-thread-sage hover:text-thread-pine transition-colors p-1.5"
              title="Open in fullscreen"
            >
              <PixelIcon name="external-link" size={16} />
            </Link>
            <button
              onClick={closeChat}
              className="text-thread-sage hover:text-thread-pine transition-colors p-1.5"
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
