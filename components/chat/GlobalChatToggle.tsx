'use client';

import { useChat } from '@/contexts/ChatContext';
import { useConversations } from '@/hooks/useConversations';
import { PixelIcon } from '@/components/ui/PixelIcon';
import { useRouter } from 'next/router';

export default function GlobalChatToggle() {
  const { toggleChat, isChatOpen } = useChat();
  const { conversations } = useConversations();
  const { pathname } = useRouter();

  const unreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  // Not on the chat page, nor inside the editor's preview, over the page being edited
  if (pathname === '/community/chat' || pathname === '/template-preview') {
    return null;
  }
  // In the page editors on a phone it sat on top of the code
  const inEditor = /\/(?:template|css)-editor$/.test(pathname);

  return (
    <button
      onClick={toggleChat}
      className={`ts-chat-toggle fixed right-5 z-40 rounded-full bg-thread-pine text-thread-paper shadow-lg hover:bg-thread-sage transition-all hover:scale-105 active:scale-95 w-[56px] h-[56px] md:w-[60px] md:h-[60px] ${isChatOpen ? 'md:hidden' : ''} ${inEditor ? 'max-lg:hidden' : ''}`}
      style={{
        bottom: 'calc(1.25rem + var(--ts-bottom-bar, 0px) + env(safe-area-inset-bottom, 0px))'
      }}
      title={isChatOpen ? 'Close chat' : 'Open chat'}
      aria-label={isChatOpen ? 'Close chat' : 'Open chat'}
    >
      <div className="flex items-center justify-center h-full relative">
        {isChatOpen ? (
          <PixelIcon name="close" size={24} />
        ) : (
          <>
            <PixelIcon name="chat" size={24} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-thread-paper shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </div>
    </button>
  );
}
