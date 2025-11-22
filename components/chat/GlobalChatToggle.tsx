'use client';

import { useChat } from '@/contexts/ChatContext';
import { PixelIcon } from '@/components/ui/PixelIcon';

export default function GlobalChatToggle() {
  const { toggleChat, isChatOpen } = useChat();

  return (
    <button
      onClick={toggleChat}
      className={`fixed bottom-5 right-5 z-40 rounded-full bg-thread-pine text-thread-paper shadow-lg hover:bg-thread-sage transition-all hover:scale-105 active:scale-95 w-[56px] h-[56px] md:w-[60px] md:h-[60px] ${isChatOpen ? 'md:hidden' : ''}`}
      style={{}}
      title={isChatOpen ? 'Close chat' : 'Open chat'}
      aria-label={isChatOpen ? 'Close chat' : 'Open chat'}
    >
      <div className="flex items-center justify-center h-full">
        {isChatOpen ? (
          <PixelIcon name="close" size={24} />
        ) : (
          <PixelIcon name="chat" size={24} />
        )}
      </div>
    </button>
  );
}
