import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface ChatContextType {
  isChatOpen: boolean;
  chatMinimized: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  minimizeChat: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

const STORAGE_KEY = 'thread_chat_open';

export function ChatProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage, default to closed
  // Initialize with false to prevent hydration mismatch
  const [isChatOpen, setIsChatOpen] = useState(false);

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
  }, []);

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => !prev);
    setChatMinimized(false);
  }, []);

  const minimizeChat = useCallback(() => {
    setChatMinimized(true);
    setIsChatOpen(false);
  }, []);

  const value: ChatContextType = {
    isChatOpen,
    chatMinimized,
    openChat,
    closeChat,
    toggleChat,
    minimizeChat,
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
