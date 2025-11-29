'use client';

import { useChat } from '@/contexts/ChatContext';
import { useEffect, useState, useCallback } from 'react';
import { PixelIcon } from '@/components/ui/PixelIcon';
import CommunityChatPanel from '@/components/community/CommunityChatPanel';
import DirectMessagesPanel from '@/components/chat/DirectMessagesPanel';
import Link from 'next/link';
import { retroSFX } from '@/lib/audio/retro-sfx';
import { usePathname } from 'next/navigation';
import { useConversations } from '@/hooks/useConversations';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface PresenceUser {
  userId: string;
  handle: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  lastActiveAt: string;
}

export default function GlobalChatPopup() {
  const { isChatOpen, closeChat, activeConversationId } = useChat();
  const pathname = usePathname();
  const { conversations, createConversation } = useConversations();
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'lounge' | 'messages'>('lounge');
  const [initialConversationId, setInitialConversationId] = useState<string | null>(null);
  const [presenceData, setPresenceData] = useState<{
    users: PresenceUser[];
    showPresence: boolean;
    togglePresence: () => void;
  } | null>(null);

  // Sync with ChatContext activeConversationId
  useEffect(() => {
    if (activeConversationId) {
      setInitialConversationId(activeConversationId);
      setActiveTab('messages');
    }
  }, [activeConversationId]);

  const handleOpenDM = async (userId: string) => {
    try {
      const conversation = await createConversation(userId);
      setInitialConversationId(conversation.id);
      setActiveTab('messages');
    } catch (error) {
      console.error('Failed to open DM:', error);
    }
  };

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

  // Calculate unread count from conversations context
  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <>
      {/* Mobile: Full screen overlay - covers nav bar */}
      <div
        className="md:hidden fixed inset-0 z-[9999] pointer-events-none flex flex-col animate-slide-up"
      >
        {/* Header - compact on mobile */}
        <div className="bg-thread-cream border-b border-thread-sage px-3 py-2 flex items-center justify-between shrink-0 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="flex bg-thread-sage/10 rounded-lg p-1 gap-1">
              <button
                onClick={() => setActiveTab('lounge')}
                className={`p-1.5 rounded ${activeTab === 'lounge' ? 'bg-white text-thread-pine shadow-sm' : 'text-thread-sage hover:text-thread-pine hover:bg-white/50'}`}
                title="Lounge"
              >
                <PixelIcon name="chat" size={18} />
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`p-1.5 rounded relative ${activeTab === 'messages' ? 'bg-white text-thread-pine shadow-sm' : 'text-thread-sage hover:text-thread-pine hover:bg-white/50'}`}
                title="Messages"
              >
                <PixelIcon name="mail" size={18} />
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[14px] h-[14px] flex items-center justify-center border border-thread-cream">
                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                  </span>
                )}
              </button>
            </div>
            <h3 className="font-bold text-thread-pine text-sm">
              {activeTab === 'lounge' ? 'Lounge' : 'Messages'}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Presence button (only for lounge) */}
            {activeTab === 'lounge' && presenceData && (
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
          {activeTab === 'lounge' ? (
            <CommunityChatPanel popupMode onClose={closeChat} onPresenceChange={handlePresenceChange} onOpenDM={handleOpenDM} />
          ) : (
            <DirectMessagesPanel onClose={closeChat} initialConversationId={initialConversationId} />
          )}
        </div>
      </div>

      {/* Desktop: Right-side floating popup - flush in bottom-right */}
      <div className="hidden md:flex flex-col fixed top-24 right-0 bottom-0 z-40 w-[480px] bg-thread-paper border-l border-t border-thread-sage rounded-tl-lg shadow-xl animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="bg-thread-cream border-b border-thread-sage p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex bg-thread-sage/10 rounded-lg p-1 gap-1">
              <button
                onClick={() => setActiveTab('lounge')}
                className={`p-1.5 rounded ${activeTab === 'lounge' ? 'bg-white text-thread-pine shadow-sm' : 'text-thread-sage hover:text-thread-pine hover:bg-white/50'}`}
                title="Lounge"
              >
                <PixelIcon name="chat" size={18} />
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`p-1.5 rounded relative ${activeTab === 'messages' ? 'bg-white text-thread-pine shadow-sm' : 'text-thread-sage hover:text-thread-pine hover:bg-white/50'}`}
                title="Messages"
              >
                <PixelIcon name="mail" size={18} />
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[14px] h-[14px] flex items-center justify-center border border-thread-cream">
                    {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                  </span>
                )}
              </button>
            </div>
            <h3 className="font-bold text-thread-pine text-sm">
              {activeTab === 'lounge' ? 'Lounge' : 'Messages'}
            </h3>
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
        <div className="flex-1 overflow-hidden pointer-events-auto bg-thread-paper">
          {activeTab === 'lounge' ? (
            <CommunityChatPanel popupMode onClose={closeChat} onPresenceChange={handlePresenceChange} onOpenDM={handleOpenDM} />
          ) : (
            <DirectMessagesPanel onClose={closeChat} initialConversationId={initialConversationId} />
          )}
        </div>
      </div>



      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  );
}
