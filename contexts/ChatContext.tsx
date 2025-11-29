import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface ChatContextType {
  isChatOpen: boolean;
  chatMinimized: boolean;
  activeConversationId: string | null;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  minimizeChat: () => void;
  openDM: (userId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

const STORAGE_KEY = 'thread_chat_open';

export function ChatProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage, default to closed
  // Initialize with false to prevent hydration mismatch
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') {
        setIsChatOpen(true);
      }
    } catch (error) {
      console.error('Failed to load chat state:', error);
    }
  }, []);

  const [chatMinimized, setChatMinimized] = useState(false);

  // Persist to localStorage whenever chat open state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, String(isChatOpen));
    } catch (error) {
      console.error('Failed to save chat state to localStorage:', error);
    }
  }, [isChatOpen]);

  const openChat = useCallback(() => {
    setIsChatOpen(true);
    setChatMinimized(false);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setChatMinimized(false);
    setActiveConversationId(null);
  }, []);

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev);
    setChatMinimized(false);
  }, []);

  const minimizeChat = useCallback(() => {
    setChatMinimized(true);
    setIsChatOpen(false);
  }, []);

  const openDM = useCallback(async (userId: string) => {
    // We'll let the GlobalChatPopup handle the actual creation/selection
    // by passing the target user ID via a custom event or shared state
    // For now, we'll just open the chat and set a "pending" state
    // But actually, since we have ConversationsContext, we can use that!
    // However, ChatContext shouldn't depend on ConversationsContext to avoid circular deps if possible
    // Instead, we'll expose the activeConversationId and let GlobalChatPopup react to it

    // First, we need to create the conversation
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId })
      });
      const data = await res.json();

      if (data.id) {
        setActiveConversationId(data.id);
        setIsChatOpen(true);
        setChatMinimized(false);
      }
    } catch (error) {
      console.error('Failed to open DM:', error);
    }
  }, []);

  const value: ChatContextType = {
    isChatOpen,
    chatMinimized,
    activeConversationId,
    openChat,
    closeChat,
    toggleChat,
    minimizeChat,
    openDM,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
